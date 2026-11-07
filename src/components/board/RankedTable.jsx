import { peso } from "@/lib/boardReport";

export default function RankedTable({ title, rows, valueLabel = "Amount", empty = "No records" }) {
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <div className="flex flex-col min-h-0">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
      {rows.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : (
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-muted-foreground border-b border-border"><th className="text-left py-1 font-medium">Name</th><th className="text-right py-1 font-medium">{valueLabel}</th><th className="text-right py-1 font-medium w-14">Share</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name} className="border-b border-border/60">
                <td className="py-1.5 pr-2 truncate max-w-[220px]">{r.name}</td>
                <td className="py-1.5 text-right font-semibold tabular-nums">{peso(r.value)}</td>
                <td className="py-1.5 text-right text-muted-foreground tabular-nums">{total ? ((r.value / total) * 100).toFixed(0) : 0}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}