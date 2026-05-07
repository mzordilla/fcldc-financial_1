import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Plus, Trash2, CheckCircle, XCircle, Clock, AlertTriangle, Banknote, Pencil, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import PaymentRequestFormDialog from "../components/payment/PaymentRequestFormDialog";
import MarkPaidDialog from "../components/payment/MarkPaidDialog";

const statusStyles = {
  pending: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  approved: "bg-primary/10 text-primary border-primary/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  paid: "bg-chart-2/10 text-chart-2 border-chart-2/20",
};

const statusIcons = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  paid: Banknote,
};

const categoryLabels = {
  supplier_invoice: "Supplier Invoice",
  subcontractor: "Subcontractor",
  labor: "Labor",
  equipment: "Equipment",
  expense_reimbursement: "Expense Reimbursement",
  utilities: "Utilities",
  other: "Other",
};



function ApprovalDialog({ pr, open, onOpenChange, onDecision }) {
  const [notes, setNotes] = useState("");
  const [approvedBy, setApprovedBy] = useState("");

  const handle = (status) => {
    onDecision(pr.id, status, notes, approvedBy);
    setNotes("");
    setApprovedBy("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Review Payment Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-xl p-4 space-y-1">
            <p className="text-xs text-muted-foreground">{pr?.request_number}</p>
            <p className="font-semibold">{pr?.payee}</p>
            <p className="text-sm text-muted-foreground">{pr?.description}</p>
            {pr?.project_allocations && pr.project_allocations.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                {pr.project_allocations.map((a, i) => (
                  <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-full">{a.project_name}: ₱{(a.amount || 0).toLocaleString()}</span>
                ))}
              </div>
            )}
            <p className="text-2xl font-bold text-foreground mt-2">₱{(pr?.amount || 0).toLocaleString()}</p>
            {pr?.due_date && (
              <p className="text-xs text-destructive">Due: {format(new Date(pr.due_date), "MMM d, yyyy")}</p>
            )}
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
              placeholder="Add notes for approval or rejection..."
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

export default function PaymentApprovals() {
  const [showAdd, setShowAdd] = useState(false);
  const [editingPR, setEditingPR] = useState(null);
  const [reviewPR, setReviewPR] = useState(null);
  const [markingPaidPR, setMarkingPaidPR] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["payment_requests"],
    queryFn: () => base44.entities.PaymentRequest.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PaymentRequest.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payment_requests"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PaymentRequest.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payment_requests"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PaymentRequest.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payment_requests"] }),
  });

  const markPaid = async (id, data) => {
    await updateMutation.mutateAsync({ id, data });
  };

  const handleDecision = (id, status, notes, approvedBy) => {
    updateMutation.mutate({ id, data: { approval_status: status, approval_notes: notes, approved_by: approvedBy } });
  };

  const filtered = statusFilter === "all" ? requests : requests.filter(r => r.approval_status === statusFilter);
  const pending = requests.filter(r => r.approval_status === "pending");
  const approved = requests.filter(r => r.approval_status === "approved");
  const totalPending = pending.reduce((s, r) => s + (r.amount || 0), 0);
  const totalApproved = approved.reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Payment Approvals</h1>
          <p className="text-muted-foreground mt-1">
            {pending.length} pending · {approved.length} approved awaiting payment
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Request
          </Button>
        </div>
      </div>

      {/* Summary banners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {pending.length > 0 && (
          <div className="bg-chart-3/10 border border-chart-3/20 rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-chart-3 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-chart-3">{pending.length} Pending Approval</p>
              <p className="text-xs text-chart-3/80">${totalPending.toLocaleString()} awaiting review</p>
            </div>
          </div>
        )}
        {approved.length > 0 && (
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-primary">{approved.length} Approved — Ready to Pay</p>
              <p className="text-xs text-primary/80">${totalApproved.toLocaleString()} to be disbursed</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-4">
        {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
        {!isLoading && filtered.length === 0 && <p className="text-center py-12 text-muted-foreground">No payment requests found</p>}
        {filtered.map((pr) => {
          const StatusIcon = statusIcons[pr.approval_status] || Clock;
          const isOverdue = pr.due_date && new Date(pr.due_date) < new Date() && pr.approval_status !== "paid";
          return (
            <div key={pr.id} className={`bg-card rounded-2xl border p-5 hover:shadow-md transition-shadow ${isOverdue ? "border-destructive/40" : "border-border"}`}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <h3 className="font-semibold text-foreground">{pr.payee}</h3>
                    {pr.request_number && <span className="text-xs text-muted-foreground font-mono">{pr.request_number}</span>}
                    <Badge variant="outline" className={`text-xs ${statusStyles[pr.approval_status] || ""}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {(pr.approval_status || "pending").replace(/_/g, " ")}
                    </Badge>
                    {pr.category && (
                      <Badge variant="secondary" className="text-xs">{categoryLabels[pr.category] || pr.category}</Badge>
                    )}
                    {isOverdue && <Badge className="text-xs bg-destructive/10 text-destructive">Overdue</Badge>}
                  </div>
                  <p className="text-sm text-foreground">{pr.description}</p>
                  {pr.project_allocations && pr.project_allocations.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {pr.project_allocations.map((alloc, i) => (
                        <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-full text-foreground">
                          {alloc.project_name}: ₱{(alloc.amount || 0).toLocaleString()}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                    {pr.invoice_number && <span>Invoice: {pr.invoice_number}</span>}
                    {pr.payment_method && <span>Via: {pr.payment_method.replace(/_/g, " ")}</span>}
                    {pr.requested_by && <span>By: {pr.requested_by}</span>}
                    {pr.due_date && <span className={isOverdue ? "text-destructive font-medium" : ""}>Due: {format(new Date(pr.due_date), "MMM d, yyyy")}</span>}
                    {pr.approved_by && <span>Approved by: {pr.approved_by}</span>}
                  </div>
                  {pr.supporting_docs && (
                    <p className="text-xs text-muted-foreground mt-1">Docs: {pr.supporting_docs}</p>
                  )}
                  {pr.approval_notes && (
                    <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-border pl-2">{pr.approval_notes}</p>
                  )}
                  {pr.approval_status === "paid" && (pr.check_number || pr.check_date || pr.check_attachment) && (
                    <div className="mt-2 flex flex-wrap items-center gap-3 bg-chart-2/5 border border-chart-2/20 rounded-lg px-3 py-2">
                      <Banknote className="w-3.5 h-3.5 text-chart-2 flex-shrink-0" />
                      {pr.check_number && <span className="text-xs font-medium text-chart-2">Check #{pr.check_number}</span>}
                      {pr.check_date && <span className="text-xs text-muted-foreground">{format(new Date(pr.check_date), "MMM d, yyyy")}</span>}
                      {pr.check_attachment && (
                        <a href={pr.check_attachment} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 text-primary hover:underline">
                          <Paperclip className="w-3 h-3" /> View Attachment
                        </a>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex sm:flex-col items-center sm:items-end gap-3">
                  <p className="text-xl font-bold text-foreground">₱{(pr.amount || 0).toLocaleString()}</p>
                  <div className="flex gap-1">
                    {pr.approval_status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => setReviewPR(pr)}>Review</Button>
                    )}
                    {pr.approval_status === "approved" && (
                      <Button size="sm" onClick={() => setMarkingPaidPR(pr)}>
                        <Banknote className="w-3.5 h-3.5 mr-1" /> Mark Paid
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setEditingPR(pr)} className="text-muted-foreground hover:text-foreground">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(pr.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <PaymentRequestFormDialog open={showAdd} onOpenChange={setShowAdd} title="New Payment Request" onSubmit={(data) => createMutation.mutateAsync(data)} />
      <PaymentRequestFormDialog open={!!editingPR} onOpenChange={(v) => { if (!v) setEditingPR(null); }} title="Edit Payment Request" initialData={editingPR || {}} onSubmit={(data) => updateMutation.mutateAsync({ id: editingPR.id, data })} />
      {reviewPR && <ApprovalDialog pr={reviewPR} open={!!reviewPR} onOpenChange={(v) => !v && setReviewPR(null)} onDecision={handleDecision} />}
      {markingPaidPR && (
        <MarkPaidDialog
          pr={markingPaidPR}
          open={!!markingPaidPR}
          onOpenChange={(v) => !v && setMarkingPaidPR(null)}
          onConfirm={(data) => markPaid(markingPaidPR.id, data)}
        />
      )}
    </div>
  );
}