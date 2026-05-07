import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachMonthOfInterval } from "date-fns";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function MonthlyLoanMonitoring({ loan }) {
  if (!loan.loan_availed || !loan.due_date) return null;

  const months = eachMonthOfInterval({
    start: new Date(loan.loan_availed),
    end: new Date(loan.due_date),
  });

  const monthlyPayment = loan.monthly_payment || 0;
  const principalPerMonth = months.length > 0 ? (loan.total_amount || 0) / months.length : 0;
  const interestPerMonth = loan.interest_accrued_1yr ? (loan.interest_accrued_1yr || 0) / 12 : 0;

  let runningPrincipal = loan.principal_balance || loan.total_amount || 0;
  let runningInterest = 0;

  return (
    <div className="mt-4 space-y-3">
      <h4 className="text-sm font-semibold text-foreground">Monthly Breakdown</h4>
      <div className="max-h-64 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-secondary">
            <tr>
              <th className="text-left px-2 py-2 font-medium">Month</th>
              <th className="text-right px-2 py-2 font-medium">Principal</th>
              <th className="text-right px-2 py-2 font-medium">Interest</th>
              <th className="text-right px-2 py-2 font-medium">Payment</th>
              <th className="text-right px-2 py-2 font-medium">Balance</th>
            </tr>
          </thead>
          <tbody>
            {months.map((month, idx) => {
              const principal = Math.min(principalPerMonth, runningPrincipal);
              runningPrincipal = Math.max(0, runningPrincipal - principal);
              const interest = interestPerMonth;
              runningInterest += interest;
              const balance = runningPrincipal;

              return (
                <tr key={idx} className="border-b border-border hover:bg-secondary/50">
                  <td className="px-2 py-2">{format(month, "MMM yyyy")}</td>
                  <td className="text-right px-2 py-2 text-muted-foreground">
                    ₱{principal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td className="text-right px-2 py-2 text-muted-foreground">
                    ₱{interest.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td className="text-right px-2 py-2 font-medium">
                    ₱{(monthlyPayment || principal + interest).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td className="text-right px-2 py-2 font-semibold">
                    ₱{balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}