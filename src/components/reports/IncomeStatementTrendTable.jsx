const fmt = (v) => (v < 0 ? `-₱${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);

function Change({ cur, prev }) {
  if (prev === undefined || !prev) return <span className="text-muted-foreground">—</span>;
  const pct = ((cur - prev) / Math.abs(prev)) * 100;
  return <span className={pct >= 0 ? "text-primary" : "text-destructive"}>{pct >= 0 ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%</span>;
}

export default function IncomeStatementTrendTable({ rows }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted text-muted-foreground text-xs">
          <tr>
            {["Month", "Revenue", "Rev. Change", "Cost of Sales", "Gross Profit", "Operating Exp.", "Net Income", "Net Change", "Net Margin"].map((h) => (
              <th key={h} className="px-4 py-2 text-right first:text-left font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.label} className="border-t border-border">
              <td className="px-4 py-2 font-medium">{r.label}</td>
              <td className="px-4 py-2 text-right">{fmt(r.revenue)}</td>
              <td className="px-4 py-2 text-right"><Change cur={r.revenue} prev={rows[i - 1]?.revenue} /></td>
              <td className="px-4 py-2 text-right">{fmt(r.cogs)}</td>
              <td className="px-4 py-2 text-right">{fmt(r.grossProfit)}</td>
              <td className="px-4 py-2 text-right">{fmt(r.opex)}</td>
              <td className={`px-4 py-2 text-right font-semibold ${r.net >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(r.net)}</td>
              <td className="px-4 py-2 text-right"><Change cur={r.net} prev={rows[i - 1]?.net} /></td>
              <td className="px-4 py-2 text-right">{r.margin.toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}