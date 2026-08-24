const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function AccountRows({ title, sectionKey, totalKey, periods, colorClass, onDrilldown }) {
  const accounts = Array.from(new Set(periods.flatMap(p => Object.keys(p.buckets[sectionKey])))).sort();
  return (
    <>
      <tr className="bg-muted/40">
        <td colSpan={periods.length + 1} className="px-4 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</td>
      </tr>
      {accounts.length === 0 && (
        <tr><td className="px-4 py-2 pl-8 text-sm text-muted-foreground" colSpan={periods.length + 1}>No {title.toLowerCase()} recorded</td></tr>
      )}
      {accounts.map(acct => (
        <tr key={acct} className="border-b border-border/30 hover:bg-muted/20">
          <td className="px-4 py-2 pl-8 text-sm text-muted-foreground whitespace-nowrap">{acct}</td>
          {periods.map(p => {
            const amt = p.buckets[sectionKey][acct] || 0;
            const txs = p.bucketTx[sectionKey][acct] || [];
            return (
              <td
                key={p.label}
                className={`text-right px-3 py-2 text-sm whitespace-nowrap ${amt !== 0 ? `cursor-pointer hover:underline ${colorClass}` : "text-muted-foreground"}`}
                onClick={() => amt !== 0 && onDrilldown(`${acct} — ${p.label}`, txs)}
              >
                {fmt(amt)}
              </td>
            );
          })}
        </tr>
      ))}
      <tr className="border-b border-border font-semibold">
        <td className="px-4 py-2">Total {title}</td>
        {periods.map(p => <td key={p.label} className={`text-right px-3 py-2 text-sm whitespace-nowrap ${colorClass}`}>{fmt(p[totalKey])}</td>)}
      </tr>
    </>
  );
}

function SummaryRow({ label, values, bold, colorForValue }) {
  return (
    <tr className={`border-b border-border ${bold ? "font-bold border-t-2" : "font-semibold"}`}>
      <td className="px-4 py-2.5">{label}</td>
      {values.map((v, i) => (
        <td key={i} className={`text-right px-3 py-2.5 text-sm whitespace-nowrap ${colorForValue ? colorForValue(v) : ""}`}>{fmt(v)}</td>
      ))}
    </tr>
  );
}

export default function ComparativeIncomeStatementTable({ periods, taxRate, onDrilldown }) {
  const taxValues = periods.map(p => Math.max(0, p.incomeBeforeTax) * (taxRate || 0) / 100);
  const netValues = periods.map((p, i) => p.incomeBeforeTax - taxValues[i]);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Line Item</th>
              {periods.map(p => (
                <th key={p.label} className="text-right px-3 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{p.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AccountRows title="Revenue" sectionKey="revenue" totalKey="totalRevenue" periods={periods} colorClass="text-primary" onDrilldown={onDrilldown} />
            <AccountRows title="Cost of Sales" sectionKey="cogs" totalKey="totalCOGS" periods={periods} colorClass="text-destructive" onDrilldown={onDrilldown} />
            <SummaryRow label="Gross Profit" values={periods.map(p => p.grossProfit)} colorForValue={v => v >= 0 ? "text-primary" : "text-destructive"} />
            <AccountRows title="Operating Expenses" sectionKey="opex" totalKey="totalOpex" periods={periods} colorClass="text-destructive" onDrilldown={onDrilldown} />
            <SummaryRow label="Operating Income" values={periods.map(p => p.operatingIncome)} colorForValue={v => v >= 0 ? "text-primary" : "text-destructive"} />
            <SummaryRow label="Income Before Tax" values={periods.map(p => p.incomeBeforeTax)} colorForValue={v => v >= 0 ? "text-primary" : "text-destructive"} />
            <SummaryRow label="Income Tax" values={taxValues} />
            <SummaryRow label="Net Income" values={netValues} bold colorForValue={v => v >= 0 ? "text-primary" : "text-destructive"} />
          </tbody>
        </table>
      </div>
    </div>
  );
}