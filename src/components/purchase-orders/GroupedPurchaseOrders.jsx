import { useState } from "react";
import { ChevronDown, ChevronUp, Clock, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const statusConfig = {
  pending: { label: "Pending", icon: Clock, color: "bg-chart-3/10 text-chart-3 border-chart-3/20" },
  approved: { label: "Approved", icon: CheckCircle, color: "bg-primary/10 text-primary border-primary/20" },
  rejected: { label: "Rejected", icon: XCircle, color: "bg-destructive/10 text-destructive border-destructive/20" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "bg-muted text-muted-foreground border-border" }
};

export default function GroupedPurchaseOrders({ orders, expandedGroups, toggleGroup, renderPORow }) {
  const grouped = orders.reduce((acc, po) => {
    const status = po.approval_status || "pending";
    if (!acc[status]) acc[status] = [];
    acc[status].push(po);
    return acc;
  }, {});

  const statusOrder = ["pending", "approved", "rejected", "cancelled"];

  return (
    <div className="space-y-4">
      {statusOrder.map((status) => {
        const pos = grouped[status] || [];
        if (pos.length === 0) return null;
        const config = statusConfig[status];
        const isExpanded = expandedGroups[status];
        const StatusIcon = config.icon;

        return (
          <div key={status} className="border border-border rounded-2xl overflow-hidden bg-card">
            <button
              onClick={() => toggleGroup(status)}
              className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted/70 transition-colors">
              
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${config.color}`}>
                  <StatusIcon className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-foreground">{config.label}</p>
                  <p className="text-xs text-muted-foreground">{pos.length} order{pos.length !== 1 ? "s" : ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  ₱{pos.reduce((sum, po) => sum + (po.amount || 0), 0).toLocaleString()}
                </Badge>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>
            {isExpanded &&
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/20 border-b border-border">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">PO #</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Supplier</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground uppercase">Project</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Category</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Date</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">Amount</th>
                      <th className="px-2 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pos.map((po) => renderPORow(po))}
                  </tbody>
                </table>
              </div>
            }
          </div>);

      })}
    </div>);

}