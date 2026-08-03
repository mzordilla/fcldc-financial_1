const fmt = (n) => `₱${Number(n || 0).toLocaleString()}`;

export default function LeaseCollectionAgingSummary({ groups }) {
  const buckets = groups.reduce((sum, group) => ({
    current: sum.current + group.buckets.current,
    days30: sum.days30 + group.buckets.days30,
    days60: sum.days60 + group.buckets.days60,
    days90: sum.days90 + group.buckets.days90,
    days90plus: sum.days90plus + group.buckets.days90plus,
  }), { current: 0, days30: 0, days60: 0, days90: 0, days90plus: 0 });
  const items = [
    ["Current", buckets.current, "bg-primary"], ["1–30 days", buckets.days30, "bg-chart-3"],
    ["31–60 days", buckets.days60, "bg-orange-400"], ["61–90 days", buckets.days90, "bg-destructive/70"],
    ["90+ days", buckets.days90plus, "bg-destructive"],
  ];
  return <div className="bg-card rounded-2xl border border-border p-5">
    <h3 className="text-sm font-semibold mb-4">Aging Analysis</h3>
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">{items.map(([label, amount, color]) =>
      <div key={label} className="text-center"><div className={`h-1.5 rounded-full ${color} mb-2 opacity-80`} />
        <p className="text-xs text-muted-foreground">{label}</p><p className="text-sm font-bold mt-0.5">{fmt(amount)}</p>
      </div>)}</div>
  </div>;
}