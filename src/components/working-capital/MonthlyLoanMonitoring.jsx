import { format, eachMonthOfInterval } from "date-fns";

export default function MonthlyLoanMonitoring({ loan }) {
  if (!loan.loan_availed || !loan.due_date) return null;

  const months = eachMonthOfInterval({
    start: new Date(loan.loan_availed),
    end: new Date(loan.due_date),
  });

  const monthlyPayment = loan.monthly_payment || 0;
  const principalPerMonth = months.length > 0 ? (loan.total_amount || 0) / months.length : 0;
  const interestPerMonth = loan.interest_accrued_1yr ? (loan.interest_accrued_1yr || 0) / 12 : 0;

  const rows = [
    { label: "Principal", values: [] },
    { label: "Interest", values: [] },
    { label: "Payment", values: [] },
  ];

  let runningPrincipal = loan.principal_balance || loan.total_amount || 0;

  months.forEach(() => {
    const principal = Math.min(principalPerMonth, runningPrincipal);
    runningPrincipal = Math.max(0, runningPrincipal - principal);
    const interest = interestPerMonth;

    rows[0].values.push(principal);
    rows[1].values.push(interest);
    rows[2].values.push(monthlyPayment || principal + interest);
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left px-3 py-2 bg-secondary font-semibold border border-border"></th>
            {months.map((month, idx) => (
              <th key={idx} className="text-right px-3 py-2 bg-secondary font-semibold border border-border whitespace-nowrap">
                {format(month, "MMM")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIdx) => (
            <tr key={rowIdx}>
              <td className="text-left px-3 py-2 bg-muted/50 font-medium border border-border">{row.label}</td>
              {row.values.map((value, colIdx) => (
                <td key={colIdx} className="text-right px-3 py-2 border border-border">
                  ₱{value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}