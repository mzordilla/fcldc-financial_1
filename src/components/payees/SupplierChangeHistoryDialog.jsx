import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const typeStyles = {
  profile: "bg-muted text-muted-foreground border-border",
  accreditation: "bg-primary/10 text-primary border-primary/20",
  evaluation: "bg-chart-3/10 text-chart-3 border-chart-3/20",
};

const fieldLabel = (field) => field.replace(/_/g, " ");

export default function SupplierChangeHistoryDialog({ open, onOpenChange, payee }) {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["supplier-change-logs", payee?.id],
    queryFn: () => base44.entities.SupplierChangeLog.filter({ payee_id: payee.id }, "-created_date", 200),
    enabled: open && !!payee?.id,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Change History — {payee?.name}</DialogTitle>
        </DialogHeader>

        {isLoading && <p className="py-8 text-center text-muted-foreground">Loading...</p>}
        {!isLoading && logs.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">No recorded changes for this supplier yet.</p>
        )}

        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border border-border p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-xs capitalize ${typeStyles[log.record_type] || typeStyles.profile}`}>
                    {log.record_type}
                  </Badge>
                  <span className="text-sm font-medium capitalize">{log.action}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(log.created_date), "MMM d, yyyy h:mm a")}
                  {log.actor ? ` · ${log.actor}` : ""}
                </span>
              </div>
              {log.summary && <p className="text-sm text-muted-foreground">{log.summary}</p>}
              {log.changes?.length > 0 && (
                <div className="space-y-1">
                  {log.changes.map((c, i) => (
                    <div key={i} className="grid grid-cols-[10rem_1fr] gap-2 text-xs">
                      <span className="font-medium capitalize text-foreground">{fieldLabel(c.field)}</span>
                      <span className="text-muted-foreground">
                        <span className="line-through">{c.from}</span>
                        <span className="mx-1.5">→</span>
                        <span className="text-foreground">{c.to}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}