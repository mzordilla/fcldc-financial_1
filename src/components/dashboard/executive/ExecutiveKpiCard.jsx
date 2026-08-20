import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export default function ExecutiveKpiCard({ label, value, sub, change, invertChange = false, accent = "text-slate-950 dark:text-white", onClick }) {
  const hasChange = typeof change === "number" && isFinite(change);
  const good = invertChange ? change < 0 : change > 0;
  const tone = !hasChange || Math.round(change) === 0 ? "text-slate-500" : good ? "text-teal-600" : "text-rose-600";
  const Icon = !hasChange || Math.round(change) === 0 ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-[0_8px_20px_-12px_rgba(15,23,42,0.45)] transition-shadow hover:shadow-[0_12px_26px_-12px_rgba(15,23,42,0.5)] dark:border-slate-700 dark:bg-slate-900"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1.5 truncate font-project-display text-xl font-bold tracking-tight ${accent}`} title={String(value)}>{value}</p>
      <div className="mt-1.5 flex items-center gap-2 text-xs">
        {hasChange && (
          <span className={`inline-flex items-center gap-0.5 font-semibold ${tone}`}>
            <Icon className="h-3.5 w-3.5" />
            {Math.abs(Math.round(change))}%
          </span>
        )}
        {sub && <span className="truncate text-slate-500">{sub}</span>}
      </div>
    </button>
  );
}