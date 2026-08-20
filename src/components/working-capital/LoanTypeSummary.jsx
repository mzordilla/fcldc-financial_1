import { getLoanBalance } from "@/lib/loanBalance";

const labels = { loan: "Loan", credit_line: "Credit Line", equipment_financing: "Equipment", vendor_credit: "Vendor Credit", mortgage: "Mortgage", other: "Other" };

export default function LoanTypeSummary({ items }) {
  const rows = Object.keys(labels).map((type) => {
    const loans = items.filter((loan) => loan.type === type);
    return {
      type,
      count: loans.length,
      total: loans.reduce((sum, loan) => sum + (loan.total_amount || 0), 0),
      outstanding: loans.reduce((sum, loan) => sum + getLoanBalance(loan), 0),
      monthly: loans.reduce((sum, loan) => sum + (loan.monthly_payment || 0), 0),
    };
  }).filter((row) => row.count > 0);
  const money = (value) => `₱${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h3 className="font-project-display text-base font-bold text-foreground">Loan type summary</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead><tr className="border-b border-border text-muted-foreground"><th className="py-2 text-left">Loan Type</th><th className="text-right">Count</th><th className="text-right">Outstanding</th><th className="text-right">Monthly</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.type} className="border-b border-border/60 last:border-0"><td className="py-2 font-medium text-foreground">{labels[row.type]}</td><td className="text-right">{row.count}</td><td className="text-right font-medium">{money(row.outstanding)}</td><td className="text-right">{money(row.monthly)}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}