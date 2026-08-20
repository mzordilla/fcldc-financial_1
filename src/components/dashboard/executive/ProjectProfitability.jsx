import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";

const money = (v) => `₱${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function ProjectProfitability({ rows }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h3 className="font-project-display text-base font-bold text-slate-950 dark:text-white">Where We Make & Lose Money</h3>
          <p className="text-xs text-slate-500">Project margin against recorded cost</p>
        </div>
        <Link to="/project-pnl" className="text-xs font-semibold text-sky-600 hover:underline">Full P&amp;L</Link>
      </div>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">No project-coded transactions yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700">
                <th className="py-2 text-left font-medium">Project</th>
                <th className="py-2 text-right font-medium">Cost</th>
                <th className="py-2 text-right font-medium">Profit</th>
                <th className="py-2 text-right font-medium">Margin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                  <td className="max-w-[220px] py-2.5">
                    <Link to={`/projects/${row.id}`} className="flex items-center gap-1 font-semibold text-slate-900 hover:text-sky-600 dark:text-white">
                      <span className="truncate">{row.name}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </Link>
                    <p className="truncate text-xs text-slate-500">{row.client}</p>
                  </td>
                  <td className="py-2.5 text-right text-slate-600 dark:text-slate-300">{money(row.cost)}</td>
                  <td className={`py-2.5 text-right font-semibold ${row.profit < 0 ? "text-rose-600" : "text-teal-700"}`}>{row.profit < 0 ? "-" : ""}{money(row.profit)}</td>
                  <td className={`py-2.5 text-right font-semibold ${row.margin < 0 ? "text-rose-600" : row.margin < 10 ? "text-amber-600" : "text-teal-700"}`}>{Math.round(row.margin)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}