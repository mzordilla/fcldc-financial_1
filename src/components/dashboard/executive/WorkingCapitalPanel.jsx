import { Link } from "react-router-dom";

const money = (v) => `₱${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function Row({ label, value, tone = "text-slate-900 dark:text-white", to }) {
  const content = (
    <div className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0 dark:border-slate-800">
      <span className="text-slate-500">{label}</span>
      <span className={`font-semibold ${tone}`}>{value}</span>
    </div>
  );
  return to ? <Link to={to} className="block hover:opacity-80">{content}</Link> : content;
}

export default function WorkingCapitalPanel({ cashOnHand, receivables, payables, debtOutstanding, monthlyDebtService }) {
  const workingCapital = cashOnHand + receivables.total - payables.total;
  const ratio = payables.total > 0 ? (cashOnHand + receivables.total) / payables.total : null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3">
        <h3 className="font-project-display text-base font-bold text-slate-950 dark:text-white">Liquidity & Working Capital</h3>
        <p className="text-xs text-slate-500">Can we cover what we owe?</p>
      </div>
      <div className="mb-4 rounded-lg bg-slate-50 p-4 dark:bg-slate-950">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Net working capital</p>
        <p className={`font-project-display text-2xl font-bold ${workingCapital < 0 ? "text-rose-600" : "text-slate-950 dark:text-white"}`}>{workingCapital < 0 ? "-" : ""}{money(workingCapital)}</p>
        {ratio !== null && <p className="mt-1 text-xs text-slate-500">Coverage ratio {ratio.toFixed(2)}x of payables</p>}
      </div>
      <Row label="Cash in bank" value={money(cashOnHand)} to="/bank-accounts" />
      <Row label="Receivables outstanding" value={money(receivables.total)} to="/receivables" />
      <Row label="Overdue receivables" value={money(receivables.overdueAmount)} tone="text-rose-600" to="/receivables" />
      <Row label="Payables outstanding" value={money(payables.total)} to="/payables" />
      <Row label="Payables due in 30 days" value={money(payables.dueSoonAmount)} tone="text-amber-600" to="/payables" />
      <Row label="Loan principal outstanding" value={money(debtOutstanding)} to="/working-capital-loans" />
      <Row label="Monthly debt service" value={money(monthlyDebtService)} to="/working-capital-loans" />
    </div>
  );
}