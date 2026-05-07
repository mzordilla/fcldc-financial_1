import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

export default function ProjectedCashOutflows({ items }) {
  const [rateAdjustment, setRateAdjustment] = useState(0);
  const activeLoans = items.filter(d => d.status === "active" && d.monthly_payment);

  // Create 12-month projection
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() + i);
    return {
      month: date.toLocaleString("default", { month: "short" }),
      monthNum: date.getMonth(),
      year: date.getFullYear(),
    };
  });

  const chartData = months.map((m) => {
    let remainingPrincipal = {};
    
    // Initialize remaining principal for each loan
    activeLoans.forEach(loan => {
      if (!remainingPrincipal[loan.id]) {
        remainingPrincipal[loan.id] = (loan.principal_balance || 0) || ((loan.total_amount || 0) - (loan.amount_paid || 0));
      }
    });

    const totalOutflow = activeLoans.reduce((sum, loan) => {
      if (loan.due_date && new Date(loan.due_date) < new Date(m.year, m.monthNum + 1, 1)) {
        return sum;
      }

      const principal = remainingPrincipal[loan.id] || 0;
      const adjustedRate = Math.max(0, (loan.interest_rate || 0) + rateAdjustment);
      const monthlyInterest = principal > 0 ? (principal * adjustedRate / 12 / 100) : 0;
      const monthlyPayment = loan.monthly_payment || 0;
      
      // Update remaining principal for next month
      const principalPortion = Math.max(0, monthlyPayment - monthlyInterest);
      remainingPrincipal[loan.id] = Math.max(0, principal - principalPortion);

      return sum + monthlyPayment + monthlyInterest;
    }, 0);

    return {
      name: `${m.month}`,
      outflow: totalOutflow,
    };
  });

  const totalMonthlyAverage =
    activeLoans.reduce((sum, d) => sum + (d.monthly_payment || 0), 0);

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">Projected Monthly Debt Servicing</h3>
        <p className="text-sm text-muted-foreground">12-month cash outflow projection</p>
        <div className="mt-4">
          <p className="text-xs text-muted-foreground">Monthly Average</p>
          <p className="text-lg font-bold text-destructive">₱{totalMonthlyAverage.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
      </div>

      <div className="mb-6 p-4 bg-secondary/30 rounded-lg border border-border">
        <Label className="text-sm font-semibold mb-3 block">Interest Rate Adjustment (What-If Scenario)</Label>
        <Slider
          value={[rateAdjustment]}
          onValueChange={(val) => setRateAdjustment(val[0])}
          min={-5}
          max={5}
          step={0.1}
          className="w-full"
        />
        <p className="text-xs text-muted-foreground mt-2">
          Current: {rateAdjustment > 0 ? "+" : ""}{rateAdjustment.toFixed(1)}%
        </p>
      </div>
      {activeLoans.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground text-sm">No active loans with monthly payments</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              formatter={(v) => `₱${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            />
            <Legend />
            <Bar dataKey="outflow" name="Monthly Outflow" fill="hsl(var(--destructive))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}