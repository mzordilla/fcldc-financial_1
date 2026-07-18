import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function RetentionReceivables() {
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date", 200),
  });

  const rows = projects
    .filter((p) => (p.retention_rate || 0) > 0)
    .map((p) => {
      const billedToDate = (p.contract_amount || 0) * ((p.completed_percentage || 0) / 100);
      const retentionHeld = billedToDate * ((p.retention_rate || 0) / 100);
      return { ...p, billedToDate, retentionHeld };
    })
    .sort((a, b) => b.retentionHeld - a.retentionHeld);

  const totalRetention = rows.reduce((s, r) => s + r.retentionHeld, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Retention Receivable</h1>
        <p className="text-muted-foreground mt-1">
          ₱{totalRetention.toLocaleString(undefined, { minimumFractionDigits: 2 })} total retention held across {rows.length} project{rows.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[800px] rounded-2xl border border-border overflow-hidden">
          <div className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1.2fr] gap-0 px-5 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-muted/50">
            <span>Project</span>
            <span>Client</span>
            <span className="text-right">Retention %</span>
            <span className="text-right">Billed to Date</span>
            <span className="text-right">Retention Held</span>
          </div>
          <div className="divide-y divide-border bg-card">
            {isLoading && <p className="text-center py-12 text-muted-foreground col-span-5">Loading...</p>}
            {!isLoading && rows.length === 0 && (
              <p className="text-center py-12 text-muted-foreground">No projects with retention configured</p>
            )}
            {rows.map((r) => (
              <div key={r.id} className="grid grid-cols-[2fr_1.2fr_1fr_1fr_1.2fr] gap-0 px-5 py-3 items-center">
                <span className="font-medium text-foreground truncate">{r.project_name}</span>
                <span className="text-sm text-muted-foreground truncate">{r.client_name}</span>
                <span className="text-right text-sm">{r.retention_rate}%</span>
                <span className="text-right text-sm">₱{r.billedToDate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                <span className="text-right text-sm font-bold text-foreground">₱{r.retentionHeld.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}