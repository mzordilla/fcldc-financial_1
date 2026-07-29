import { useState, useMemo } from "react";
import { CheckCircle2, Circle, ChevronDown, ChevronUp } from "lucide-react";

const fmt = (n) => `₱${Number(n || 0).toLocaleString()}`;

export default function LeaseCollectionMatrixTable({ tenants, monthOptions, collections, onCellClick, onGroupCellClick }) {
  const [expandedClients, setExpandedClients] = useState(new Set());

  const recordFor = (tenantId, month) => collections.find((c) => c.tenant_id === tenantId && c.month === month);

  const clientGroups = useMemo(() => {
    const groups = {};
    tenants.forEach((t) => {
      const key = t.full_name || "—";
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tenants]);

  const toggleClient = (name) => {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  if (tenants.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No active tenants to monitor</p>;
  }

  const renderUnitRow = (t, indented) => (
    <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/20">
      <td className="px-2 py-2 sticky left-0 bg-card">
        {indented ? (
          <p className="text-[11px] text-muted-foreground whitespace-nowrap pl-4">{t.unit_number}{t.building ? ` · ${t.building}` : ""}</p>
        ) : (
          <>
            <p className="font-medium text-foreground whitespace-nowrap">{t.full_name}</p>
            <p className="text-[11px] text-muted-foreground whitespace-nowrap">{t.unit_number}{t.building ? ` · ${t.building}` : ""}</p>
          </>
        )}
      </td>
      {monthOptions.map((m) => {
        const record = recordFor(t.id, m.value);
        const collected = record?.collected;
        return (
          <td key={m.value} className="px-1 py-2 text-center">
            <button
              onClick={() => onCellClick(t, m.value, record)}
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
  );

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
          {clientGroups.map(([clientName, unitTenants]) => {
            if (unitTenants.length === 1) return renderUnitRow(unitTenants[0], false);

            const isExpanded = expandedClients.has(clientName);
            return (
              <>
                <tr key={clientName} className="border-b border-border last:border-0 bg-muted/30 hover:bg-muted/40 cursor-pointer" onClick={() => toggleClient(clientName)}>
                  <td className="px-2 py-2 sticky left-0 bg-muted/30">
                    <div className="flex items-center gap-2">
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
                      <span className="font-semibold text-foreground whitespace-nowrap">{clientName}</span>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">{unitTenants.length} units</span>
                    </div>
                  </td>
                  {monthOptions.map((m) => {
                    const monthTotal = unitTenants.reduce((s, t) => {
                      const record = recordFor(t.id, m.value);
                      return s + (record?.amount ?? t.monthly_rent ?? 0);
                    }, 0);
                    const allCollected = unitTenants.every((t) => recordFor(t.id, m.value)?.collected);
                    const records = unitTenants.map((t) => recordFor(t.id, m.value));
                    return (
                      <td key={m.value} className="px-1 py-2 text-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); onGroupCellClick(unitTenants, m.value, records); }}
                          title={allCollected ? "Collected — click for summary" : "Not fully collected — click to record"}
                          className={`flex flex-col items-center gap-0.5 mx-auto px-2 py-1 rounded-lg transition-colors ${allCollected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                        >
                          {allCollected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                          <span className="font-semibold whitespace-nowrap">{fmt(monthTotal)}</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
                {isExpanded && unitTenants.map((t) => renderUnitRow(t, true))}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}