import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { getLoanBalance } from "@/lib/loanBalance";

export default function ProjectedCashOutflows({ items }) {
  const [rateAdjustment, setRateAdjustment] = useState(0);
  const activeLoans = items.filter((d) => d.status === "active" && d.monthly_payment);

  // Create 12-month projection
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() + i);
    return {
      month: date.toLocaleString("default", { month: "short" }),
      monthNum: date.getMonth(),
      year: date.getFullYear()
    };
  });

  const chartData = months.map((m) => {
    let remainingPrincipal = {};

    // Initialize remaining principal for each loan
    activeLoans.forEach((loan) => {
      if (!remainingPrincipal[loan.id]) {
        remainingPrincipal[loan.id] = getLoanBalance(loan);
      }
    });

    const totalOutflow = activeLoans.reduce((sum, loan) => {
      if (loan.due_date && new Date(loan.due_date) < new Date(m.year, m.monthNum + 1, 1)) {
        return sum;
      }

      const principal = remainingPrincipal[loan.id] || 0;
      const adjustedRate = Math.max(0, (loan.interest_rate || 0) + rateAdjustment);
      const monthlyInterest = principal > 0 ? principal * adjustedRate / 12 / 100 : 0;
      const monthlyPayment = loan.monthly_payment || 0;

      // Update remaining principal for next month
      const principalPortion = Math.max(0, monthlyPayment - monthlyInterest);
      remainingPrincipal[loan.id] = Math.max(0, principal - principalPortion);

      return sum + monthlyPayment + monthlyInterest;
    }, 0);

    return {
      name: `${m.month}`,
      outflow: totalOutflow
    };
  });

  const totalMonthlyAverage =
  activeLoans.reduce((sum, d) => sum + (d.monthly_payment || 0), 0);

  return null;











































}