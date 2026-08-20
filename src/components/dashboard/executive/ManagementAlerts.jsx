import { Link } from "react-router-dom";
import { AlertTriangle, ChevronRight, ShieldCheck } from "lucide-react";

const severityStyles = {
  critical: "border-l-rose-500 bg-rose-50/60 dark:bg-rose-950/20",
  warning: "border-l-amber-500 bg-amber-50/60 dark:bg-amber-950/20",
  info: "border-l-sky-500 bg-sky-50/60 dark:bg-sky-950/20",
};

export default function ManagementAlerts({ alerts }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-500" />
        <h3 className="font-project-display text-base font-bold text-slate-950 dark:text-white">Needs Your Attention</h3>
        <span className="ml-auto rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">{alerts.length}</span>
      </div>
      {alerts.length === 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-teal-50 p-4 text-sm text-teal-700 dark:bg-teal-950/30">
          <ShieldCheck className="h-4 w-4" /> No exceptions — all monitored indicators are within range.
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <Link key={alert.title} to={alert.to} className={`flex items-center gap-3 rounded-lg border-l-4 p-3 transition-colors hover:brightness-95 ${severityStyles[alert.severity]}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{alert.title}</p>
                <p className="truncate text-xs text-slate-600 dark:text-slate-400">{alert.detail}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}