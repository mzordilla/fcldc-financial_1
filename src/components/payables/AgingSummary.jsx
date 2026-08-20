const colors = ["bg-primary", "bg-chart-3", "bg-orange-400", "bg-destructive/70", "bg-destructive"];

export default function AgingSummary({ overall, overallTotal, title = "Aging Analysis" }) {
  const buckets = [
    { key: "current", label: "Current", amount: overall.current || 0 },
    { key: "days30", label: "1–30 days", amount: overall.days30 || 0 },
    { key: "days60", label: "31–60 days", amount: overall.days60 || 0 },
    { key: "days90", label: "61–90 days", amount: overall.days90 || 0 },
    { key: "days90plus", label: "90+ days", amount: overall.days90plus || 0 },
  ];
  return (
    <div className="bg-card rounded-xl border border-border p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">Total Outstanding: <span className="font-bold text-foreground">₱{(overallTotal || 0).toLocaleString()}</span></p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {buckets.map((b, i) => (
          <div key={b.key} className="text-center">
            <div className={`h-1 rounded-full ${colors[i]} mb-1 opacity-80`} />
            <p className="text-[11px] text-muted-foreground">{b.label}</p>
            <p className={`text-xs font-bold mt-0.5 ${i >= 2 && b.amount > 0 ? "text-destructive" : "text-foreground"}`}>
              ₱{b.amount.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}