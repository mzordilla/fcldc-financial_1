const statuses = [
  { key: "available_for_sale", label: "For Sale", color: "text-emerald-600" },
  { key: "available_for_lease", label: "For Lease", color: "text-blue-600" },
  { key: "sold", label: "Sold", color: "text-slate-500" },
  { key: "leased", label: "Leased", color: "text-purple-600" },
];

function StatusRow({ title, records }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statuses.map((status) => (
          <div key={status.key} className="rounded-2xl border border-border bg-card p-4">
            <p className="mb-1 text-xs text-muted-foreground">{status.label}</p>
            <p className={`text-2xl font-bold ${status.color}`}>{records.filter(record => record.status === status.key).length}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function UnitStatusBreakdown({ units, parking }) {
  return (
    <div className="space-y-4">
      <StatusRow title="Condo & Commercial Units" records={units} />
      <StatusRow title="Parking" records={parking} />
    </div>
  );
}