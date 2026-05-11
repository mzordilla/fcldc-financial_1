import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Plus, Trash2, CheckCircle, XCircle, Clock, AlertTriangle, Pencil, History, ChevronDown, ChevronUp, FileUp, CreditCard, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import POFormDialog from "../components/purchase-orders/POFormDialog";
import POExcelImportDialog from "../components/purchase-orders/POExcelImportDialog";
import POToPayableDialog from "../components/purchase-orders/POToPayableDialog";
import ReceiptUploadDialog from "../components/purchase-orders/ReceiptUploadDialog";
import ApprovalWorkflowDialog from "../components/approvals/ApprovalWorkflowDialog";
import ApprovalHistoryLog from "../components/approvals/ApprovalHistoryLog";

const statusStyles = {
  pending: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  approved: "bg-primary/10 text-primary border-primary/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const priorityStyles = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-chart-2/10 text-chart-2",
  high: "bg-chart-3/10 text-chart-3",
  urgent: "bg-destructive/10 text-destructive",
};

const statusIcons = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  cancelled: XCircle,
};



export default function PurchaseOrders() {
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [reviewPO, setReviewPO] = useState(null);
  const [convertingPO, setConvertingPO] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(null);
  const [expandedHistory, setExpandedHistory] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["purchase_orders"],
    queryFn: () => base44.entities.PurchaseOrder.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PurchaseOrder.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchase_orders"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PurchaseOrder.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchase_orders"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PurchaseOrder.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchase_orders"] }),
  });

  const handleDecision = (po, { action, actor, notes }) => {
    const newEntry = {
      step: action === "approved" ? "approved" : action === "rejected" ? "rejected" : "reviewed",
      action,
      actor,
      notes,
      timestamp: new Date().toISOString(),
    };
    const history = [...(po.approval_history || []), newEntry];
    updateMutation.mutate({
      id: po.id,
      data: {
        approval_status: action,
        approval_notes: notes,
        approved_by: actor,
        approval_step: action,
        approval_history: history,
      },
    });
  };

  const filtered = statusFilter === "all" ? orders : orders.filter(o => o.approval_status === statusFilter);
  const pending = orders.filter(o => o.approval_status === "pending");
  const totalPendingValue = pending.reduce((s, o) => s + (o.amount || 0), 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground mt-1">
            {pending.length} pending approval · ${totalPendingValue.toLocaleString()} pending value
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <FileUp className="w-4 h-4 mr-2" /> Import Excel
          </Button>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" /> New PO
          </Button>
        </div>
      </div>

      {/* Pending banner */}
      {pending.length > 0 && (
        <div className="bg-chart-3/10 border border-chart-3/20 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-chart-3 flex-shrink-0" />
          <p className="text-sm text-chart-3 font-medium">
            {pending.length} purchase order{pending.length > 1 ? "s" : ""} awaiting approval totalling ${totalPendingValue.toLocaleString()}
          </p>
        </div>
      )}

      <div className="grid gap-4">
        {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
        {!isLoading && filtered.length === 0 && <p className="text-center py-12 text-muted-foreground">No purchase orders found</p>}
        {filtered.map((po) => {
          const StatusIcon = statusIcons[po.approval_status] || Clock;
          return (
            <div key={po.id} className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <h3 className="font-semibold text-foreground">{po.supplier_name}</h3>
                    {po.po_number && <span className="text-xs text-muted-foreground font-mono">{po.po_number}</span>}
                    <Badge variant="outline" className={`text-xs ${statusStyles[po.approval_status] || ""}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {(po.approval_status || "pending").replace(/_/g, " ")}
                    </Badge>
                    {po.priority && po.priority !== "normal" && (
                      <Badge className={`text-xs ${priorityStyles[po.priority]}`}>
                        {po.priority}
                      </Badge>
                    )}
                    {po.category && <Badge variant="secondary" className="text-xs">{po.category}</Badge>}
                  </div>
                  <p className="text-sm text-foreground">{po.description}</p>

                  {po.line_items && po.line_items.length > 0 && (
                    <div className="mt-3 border border-border rounded-lg overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-muted/50 border-b border-border">
                            <th className="px-3 py-2 text-left font-semibold">Item</th>
                            <th className="px-3 py-2 text-right font-semibold">Qty</th>
                            <th className="px-3 py-2 text-right font-semibold">Cost/Item</th>
                            <th className="px-3 py-2 text-right font-semibold">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {po.line_items.map((item, idx) => (
                            <tr key={idx} className="border-b border-border/50 last:border-0">
                              <td className="px-3 py-2 text-left">{item.description}</td>
                              <td className="px-3 py-2 text-right">{item.quantity}</td>
                              <td className="px-3 py-2 text-right">${(item.cost_per_item || 0).toLocaleString()}</td>
                              <td className="px-3 py-2 text-right font-semibold">${(item.total || 0).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {po.items && !po.line_items?.length && <p className="text-xs text-muted-foreground mt-1">Items: {po.items}</p>}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                    {po.project_name && <span>Project: {po.project_name}</span>}
                    {po.requested_by && <span>Requested by: {po.requested_by}</span>}
                    {po.requested_date && <span>Date: {format(new Date(po.requested_date), "MMM d, yyyy")}</span>}
                    {po.required_date && <span>Required by: {format(new Date(po.required_date), "MMM d, yyyy")}</span>}
                    {po.approved_by && <span>Reviewed by: {po.approved_by}</span>}
                  </div>
                  {po.approval_notes && (
                    <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-border pl-2">{po.approval_notes}</p>
                  )}
                  {po.receipt_url && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-primary">
                      <Package className="w-3.5 h-3.5" />
                      <span>Delivered {po.delivery_date ? format(new Date(po.delivery_date), "MMM d, yyyy") : ""}</span>
                      {po.receipt_url && <a href={po.receipt_url} target="_blank" rel="noopener noreferrer" className="underline">View receipt</a>}
                    </div>
                  )}
                  {po.delivery_notes && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{po.delivery_notes}</p>
                  )}
                  {/* History toggle */}
                  {po.approval_history?.length > 0 && (
                    <button
                      onClick={() => setExpandedHistory(expandedHistory === po.id ? null : po.id)}
                      className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <History className="w-3.5 h-3.5" />
                      {po.approval_history.length} history record{po.approval_history.length !== 1 ? "s" : ""}
                      {expandedHistory === po.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                  {expandedHistory === po.id && (
                    <div className="mt-3 p-3 bg-muted/30 rounded-xl border border-border">
                      <ApprovalHistoryLog history={po.approval_history} />
                    </div>
                  )}
                </div>
                <div className="flex sm:flex-col items-center sm:items-end gap-3">
                  <p className="text-xl font-bold text-foreground">₱{(po.amount || 0).toLocaleString()}</p>
                  <div className="flex gap-1">
                    {po.approval_status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => setReviewPO(po)}>
                        Review
                      </Button>
                    )}
                    {po.approval_status === "approved" && !po.receipt_url && (
                      <Button size="sm" variant="outline" onClick={() => setUploadingReceipt(po)} className="text-primary hover:text-primary">
                        <Package className="w-3.5 h-3.5 mr-1.5" /> Receipt
                      </Button>
                    )}
                    {po.approval_status === "approved" && (
                      <Button size="sm" variant="outline" onClick={() => setConvertingPO(po)} className="text-primary hover:text-primary">
                        <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Payable
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setReviewPO(po)} title="View History" className="text-muted-foreground hover:text-foreground">
                      <History className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditingPO(po)} className="text-muted-foreground hover:text-foreground">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(po.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <POExcelImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        onImport={async (rows) => {
          await Promise.all(rows.map(r => createMutation.mutateAsync(r)));
        }}
      />
      <POFormDialog open={showAdd} onOpenChange={setShowAdd} title="New Purchase Order" onSubmit={(data) => createMutation.mutateAsync(data)} />
      <POFormDialog open={!!editingPO} onOpenChange={(v) => { if (!v) setEditingPO(null); }} title="Edit Purchase Order" initialData={editingPO || {}} onSubmit={(data) => updateMutation.mutateAsync({ id: editingPO.id, data })} />
      {reviewPO && (
        <ApprovalWorkflowDialog
          open={!!reviewPO}
          onOpenChange={(v) => !v && setReviewPO(null)}
          title={`Review PO — ${reviewPO.supplier_name}`}
          history={reviewPO.approval_history || []}
          summary={
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold">{reviewPO.supplier_name}</p>
                {reviewPO.po_number && <span className="text-xs font-mono text-muted-foreground">{reviewPO.po_number}</span>}
              </div>
              <p className="text-sm text-muted-foreground">{reviewPO.description}</p>
              {reviewPO.project_name && <p className="text-xs text-muted-foreground">Project: {reviewPO.project_name}</p>}
              <p className="text-2xl font-bold text-foreground mt-1">₱{(reviewPO.amount || 0).toLocaleString()}</p>
              <Badge variant="outline" className={`text-xs mt-1 ${statusStyles[reviewPO.approval_status] || ""}`}>
                {(reviewPO.approval_status || "pending").replace(/_/g, " ")}
              </Badge>
            </div>
          }
          onDecision={(decision) => handleDecision(reviewPO, decision)}
        />
      )}
      <POToPayableDialog
        open={!!convertingPO}
        onOpenChange={(v) => { if (!v) setConvertingPO(null); }}
        po={convertingPO}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
          setConvertingPO(null);
        }}
      />
      <ReceiptUploadDialog
        open={!!uploadingReceipt}
        onOpenChange={(v) => { if (!v) setUploadingReceipt(null); }}
        po={uploadingReceipt}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
          setUploadingReceipt(null);
        }}
      />
    </div>
  );
}