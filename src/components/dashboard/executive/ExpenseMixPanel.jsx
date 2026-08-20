const money = (v) => `₱${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const label = (key) => key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function ExpenseMixPanel({ rows }) {
  const total = rows.reduce((s, r) => s + r.amount, 0) || 1;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4">
        <h3 className="font-project-display text-base font-bold text-slate-950 dark:text-white">Cost Structure</h3>
        <p className="text-xs text-slate-500">Spend concentration for the selected period</p>
      </div>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">No expenses recorded in this period.</p>
      ) : (
        <div className="space-y-3">
          {rows.slice(0, 6).map((row) => (
            <div key={row.category}>
              <div className="flex justify-between text-xs">
                <span className="font-medium text-slate-700 dark:text-slate-200">{label(row.category)}</span>
                <span className="text-slate-500">{money(row.amount)} · {Math.round((row.amount / total) * 100)}%</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-1.5 rounded-full bg-sky-600" style={{ width: `${(row.amount / total) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}