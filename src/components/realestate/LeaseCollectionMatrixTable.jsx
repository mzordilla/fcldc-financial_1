import { CheckCircle2, Circle } from "lucide-react";

const fmt = (n) => `₱${Number(n || 0).toLocaleString()}`;

export default function LeaseCollectionMatrixTable({ tenants, monthOptions, collections, onToggle }) {
  const recordFor = (tenantId, month) => collections.find((c) => c.tenant_id === tenantId && c.month === month);

  if (tenants.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No active tenants to monitor</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left font-semibold text-muted-foreground px-2 py-2 sticky left-0 bg-card whitespace-nowrap">Client / Unit</th>
            {monthOptions.map((m) => (
              <th key={m.value} className="text-center font-semibold text-muted-foreground px-2 py-2 whitespace-nowrap">{m.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tenants.map((t) => (
            <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/20">
              <td className="px-2 py-2 sticky left-0 bg-card">
                <p className="font-medium text-foreground whitespace-nowrap">{t.full_name}</p>
                <p className="text-[11px] text-muted-foreground whitespace-nowrap">{t.unit_number}{t.building ? ` · ${t.building}` : ""}</p>
              </td>
              {monthOptions.map((m) => {
                const record = recordFor(t.id, m.value);
                const collected = record?.collected;
                return (
                  <td key={m.value} className="px-1 py-2 text-center">
                    <button
                      onClick={() => onToggle(t, m.value, record)}
                      title={collected ? `Collected ${record?.collected_date || ""}` : "Not collected"}
                      className={`flex flex-col items-center gap-0.5 mx-auto px-2 py-1 rounded-lg transition-colors ${
                        collected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {collected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                      <span className="font-semibold whitespace-nowrap">{fmt(record?.amount ?? t.monthly_rent)}</span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}