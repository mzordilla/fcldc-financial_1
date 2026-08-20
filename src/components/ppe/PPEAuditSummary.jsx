function fmt(value) {
  return `₱${(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function PPEAuditSummary({ totalCost, totalAccumDep, totalBookValue, byType }) {
  const populatedTypes = byType.filter((type) => type.count > 0);
  const displayTypes = populatedTypes.length > 0 ? populatedTypes : byType;
  const metrics = [
    { label: "Total Acquisition Cost", value: totalCost, color: "border-primary", valueClass: "text-foreground" },
    { label: "Accumulated Depreciation", value: totalAccumDep, color: "border-foreground/70", valueClass: "text-destructive" },
    { label: "Net Book Value", value: totalBookValue, color: "border-primary", valueClass: "text-primary" },
  ];

  return (
    <section className="grid gap-4 border-b border-border pb-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <div className="space-y-3">
        {metrics.map((metric) => (
          <div key={metric.label} className={`border-l-2 ${metric.color} pl-3`}>
            <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
            <p className={`font-project-display text-2xl font-semibold leading-tight ${metric.valueClass}`}>{fmt(metric.value)}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border bg-muted/60 p-4 lg:self-start">
        <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs leading-5 text-foreground">
          {displayTypes.map((type, index) => (
            <span key={`${type.label}-${index}`}>
              <strong>{type.label}</strong> ({type.count} {type.count === 1 ? "asset" : "assets"}, {fmt(type.value)})
              {index < displayTypes.length - 1 && <span className="ml-2 text-muted-foreground">•</span>}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}