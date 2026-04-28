import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Plus, Trash2, CheckCircle, XCircle, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import AddFormDialog from "../components/shared/AddFormDialog";

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

const fields = [
  { name: "po_number", label: "PO Number", placeholder: "PO-2026-001" },
  { name: "supplier_name", label: "Supplier Name", required: true, placeholder: "e.g. SteelCo Supplies" },
  { name: "project_name", label: "Project Name", placeholder: "e.g. Main Street Tower" },
  { name: "description", label: "Description", required: true, placeholder: "What is being purchased?" },
  { name: "items", label: "Line Items", placeholder: "e.g. 500 steel rods, 20 bags cement..." },
  { name: "amount", label: "Total Amount ($)", type: "number", required: true, placeholder: "0.00" },
  { name: "category", label: "Category", type: "select", options: [
    { value: "materials", label: "Materials" },
    { value: "equipment", label: "Equipment" },
    { value: "subcontractor", label: "Subcontractor" },
    { value: "services", label: "Services" },
    { value: "utilities", label: "Utilities" },
    { value: "other", label: "Other" },
  ]},
  { name: "priority", label: "Priority", type: "select", options: [
    { value: "low", label: "Low" },
    { value: "normal", label: "Normal" },
    { value: "high", label: "High" },
    { value: "urgent", label: "Urgent" },
  ]},
  { name: "requested_by", label: "Requested By", placeholder: "Your name" },
  { name: "requested_date", label: "Request Date", type: "date" },
  { name: "required_date", label: "Required By Date", type: "date" },
];

function ApprovalDialog({ po, open, onOpenChange, onDecision }) {
  const [notes, setNotes] = useState("");
  const [approvedBy, setApprovedBy] = useState("");

  const handle = (status) => {
    onDecision(po.id, status, notes, approvedBy);
    setNotes("");
    setApprovedBy("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review Purchase Order</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-xl p-4 space-y-1">
            <p className="font-semibold">{po?.supplier_name}</p>
            <p className="text-sm text-muted-foreground">{po?.description}</p>
            <p className="text-lg font-bold text-foreground mt-2">${(po?.amount || 0).toLocaleString()}</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Approver Name</label>
            <input
              className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background"
              placeholder="Your name"
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes (optional)</label>
            <Textarea
              placeholder="Add approval or rejection notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-20"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => handle("rejected")}>
            <XCircle className="w-4 h-4 mr-1" /> Reject
          </Button>
          <Button onClick={() => handle("approved")}>
            <CheckCircle className="w-4 h-4 mr-1" /> Approve
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PurchaseOrders() {
  const [showAdd, setShowAdd] = useState(false);
  const [reviewPO, setReviewPO] = useState(null);
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

  const handleDecision = (id, status, notes, approvedBy) => {
    updateMutation.mutate({ id, data: { approval_status: status, approval_notes: notes, approved_by: approvedBy } });
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
                  {po.items && <p className="text-xs text-muted-foreground mt-1">Items: {po.items}</p>}
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
                </div>
                <div className="flex sm:flex-col items-center sm:items-end gap-3">
                  <p className="text-xl font-bold text-foreground">${(po.amount || 0).toLocaleString()}</p>
                  <div className="flex gap-1">
                    {po.approval_status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => setReviewPO(po)}>
                        Review
                      </Button>
                    )}
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

      <AddFormDialog open={showAdd} onOpenChange={setShowAdd} title="New Purchase Order" fields={fields} onSubmit={(data) => createMutation.mutateAsync(data)} />
      {reviewPO && <ApprovalDialog po={reviewPO} open={!!reviewPO} onOpenChange={(v) => !v && setReviewPO(null)} onDecision={handleDecision} />}
    </div>
  );
}