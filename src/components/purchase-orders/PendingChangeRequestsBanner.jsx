import { GitPullRequest } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PendingChangeRequestsBanner({ orders, onReview }) {
  const posWithRequests = orders.filter((po) => (po.change_requests || []).some((cr) => cr.status === "pending"));
  if (posWithRequests.length === 0) return null;

  const totalRequests = posWithRequests.reduce(
    (sum, po) => sum + (po.change_requests || []).filter((cr) => cr.status === "pending").length,
    0
  );

  return (
    <div className="bg-chart-2/10 border border-chart-2/20 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <GitPullRequest className="w-5 h-5 text-chart-2 flex-shrink-0" />
        <p className="text-sm text-chart-2 font-medium">
          {totalRequests} change request{totalRequests > 1 ? "s" : ""} awaiting review on {posWithRequests.length} purchase order{posWithRequests.length > 1 ? "s" : ""}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {posWithRequests.map((po) => {
          const count = (po.change_requests || []).filter((cr) => cr.status === "pending").length;
          return (
            <Button key={po.id} size="sm" variant="outline" className="text-xs" onClick={() => onReview(po)}>
              {po.po_number || po.supplier_name} · {count} request{count > 1 ? "s" : ""}
            </Button>
          );
        })}
      </div>
    </div>
  );
}