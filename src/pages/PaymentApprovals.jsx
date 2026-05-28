import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Plus, Trash2, CheckCircle, XCircle, Clock, AlertTriangle, Banknote, Pencil, Paperclip, ShoppingCart, History, ChevronDown, ChevronUp, Square, CheckSquare } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PaymentRequestFormDialog from "../components/payment/PaymentRequestFormDialog";
import MarkPaidDialog from "../components/payment/MarkPaidDialog";
import ApprovalWorkflowDialog from "../components/approvals/ApprovalWorkflowDialog";
import ApprovalHistoryLog from "../components/approvals/ApprovalHistoryLog";

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





export default function PaymentApprovals() {
  const [showAdd, setShowAdd] = useState(false);
  const [prefillData, setPrefillData] = useState(null);
  const [editingPR, setEditingPR] = useState(null);
  const [reviewPR, setReviewPR] = useState(null);
  const [markingPaidPR, setMarkingPaidPR] = useState(null);
  const [expandedHistory, setExpandedHistory] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["payment_requests"],
    queryFn: () => base44.entities.PaymentRequest.list("-created_date", 100),
  });

  const { data: approvedPOs = [] } = useQuery({
    queryKey: ["approved_pos"],
    queryFn: () => base44.entities.PurchaseOrder.filter({ approval_status: "approved" }, "-created_date", 100),
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

  const convertPOtoPaymentRequest = (po) => {
    const prData = {
      request_number: `PR-PO-${po.po_number || po.id.slice(-6).toUpperCase()}`,
      payee: po.supplier_name,
      description: po.description,
      category: "supplier_invoice",
      payment_method: "bank_transfer",
      invoice_number: po.po_number || "",
      invoice_date: po.requested_date || "",
      due_date: po.required_date || "",
      requested_by: po.requested_by || "",
      supporting_docs: `PO: ${po.po_number || ""}`,
      project_allocations: po.project_name ? [{ project_name: po.project_name, amount: po.amount }] : [],
      amount: po.amount,
    };
    setShowAdd(true);
    setPrefillData(prData);
  };

  const handleDecision = (pr, { action, actor, notes }) => {
    const newEntry = {
      step: action,
      action,
      actor,
      notes,
      timestamp: new Date().toISOString(),
    };
    const history = [...(pr.approval_history || []), newEntry];
    updateMutation.mutate({
      id: pr.id,
      data: {
        approval_status: action,
        approval_notes: notes,
        approved_by: actor,
        approval_step: action,
        approval_history: history,
        ...(action === "paid" ? { check_date: new Date().toISOString().split("T")[0] } : {}),
      },
    });
  };

  const filtered = statusFilter === "all" ? requests : requests.filter(r => r.approval_status === statusFilter);
  const pending = requests.filter(r => r.approval_status === "pending");
  const approved = requests.filter(r => r.approval_status === "approved");
  const totalPending = pending.reduce((s, r) => s + (r.amount || 0), 0);
  const totalApproved = approved.reduce((s, r) => s + (r.amount || 0), 0);

  const pendingInView = filtered.filter(r => r.approval_status === "pending");
  const allPendingSelected = pendingInView.length > 0 && pendingInView.every(r => selectedIds.has(r.id));

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allPendingSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pendingInView.forEach(r => next.delete(r.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        pendingInView.forEach(r => next.add(r.id));
        return next;
      });
    }
  };

  const bulkApprove = async () => {
    setBulkApproving(true);
    const toApprove = requests.filter(r => selectedIds.has(r.id) && r.approval_status === "pending");
    await Promise.all(toApprove.map(pr => {
      const entry = { step: "approved", action: "approved", actor: "Bulk Approval", notes: "", timestamp: new Date().toISOString() };
      return updateMutation.mutateAsync({
        id: pr.id,
        data: {
          approval_status: "approved",
          approved_by: "Bulk Approval",
          approval_step: "approved",
          approval_history: [...(pr.approval_history || []), entry],
        },
      });
    }));
    setSelectedIds(new Set());
    setBulkApproving(false);
  };

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
          <Button onClick={() => { setPrefillData(null); setShowAdd(true); }}>
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
              <p className="text-xs text-chart-3/80">₱{totalPending.toLocaleString()} awaiting review</p>
            </div>
          </div>
        )}
        {approved.length > 0 && (
          <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-primary">{approved.length} Approved — Ready to Pay</p>
              <p className="text-xs text-primary/80">₱{totalApproved.toLocaleString()} to be disbursed</p>
            </div>
          </div>
        )}
      </div>

      {/* Approved Purchase Orders */}
      {approvedPOs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Approved Purchase Orders — Ready to Pay</h2>
          </div>
          <div className="grid gap-3">
            {approvedPOs.map(po => (
              <div key={po.id} className="bg-card border border-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-foreground">{po.supplier_name}</span>
                    {po.po_number && <span className="text-xs font-mono text-muted-foreground">{po.po_number}</span>}
                    {po.priority && po.priority !== "normal" && (
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${po.priority === "urgent" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-chart-3/10 text-chart-3 border-chart-3/20"}`}>
                        {po.priority}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{po.description}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                    {po.project_name && <span>Project: {po.project_name}</span>}
                    {po.required_date && <span>Needed by: {format(new Date(po.required_date), "MMM d, yyyy")}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                  <p className="text-lg font-bold text-foreground">₱{(po.amount || 0).toLocaleString()}</p>
                  <Button size="sm" variant="outline" onClick={() => convertPOtoPaymentRequest(po)}>
                    <Plus className="w-3.5 h-3.5 mr-1" /> Create Payment Request
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bulk action toolbar */}
      {pendingInView.length > 0 && (
        <div className="flex items-center justify-between bg-muted/50 border border-border rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={allPendingSelected}
              onCheckedChange={toggleSelectAll}
              id="select-all"
            />
            <label htmlFor="select-all" className="text-sm font-medium cursor-pointer select-none">
              {allPendingSelected ? "Deselect all" : `Select all pending (${pendingInView.length})`}
            </label>
            {selectedIds.size > 0 && (
              <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
            )}
          </div>
          {selectedIds.size > 0 && (
            <Button
              size="sm"
              onClick={bulkApprove}
              disabled={bulkApproving}
              className="gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {bulkApproving ? "Approving..." : `Approve ${selectedIds.size} Request${selectedIds.size !== 1 ? "s" : ""}`}
            </Button>
          )}
        </div>
      )}

      {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
      {!isLoading && filtered.length === 0 && <p className="text-center py-12 text-muted-foreground">No payment requests found</p>}

      {/* Grouped by supplier/payee */}
      {!isLoading && (() => {
        // Build groups preserving insertion order
        const groupMap = new Map();
        filtered.forEach(pr => {
          const key = pr.payee || "Unknown";
          if (!groupMap.has(key)) groupMap.set(key, []);
          groupMap.get(key).push(pr);
        });

        return Array.from(groupMap.entries()).map(([payee, items]) => {
          const pendingItems = items.filter(r => r.approval_status === "pending");
          const allGroupPendingSelected = pendingItems.length > 0 && pendingItems.every(r => selectedIds.has(r.id));
          const someGroupSelected = pendingItems.some(r => selectedIds.has(r.id));
          const groupTotal = items.reduce((s, r) => s + (r.amount || 0), 0);

          const toggleGroupSelect = () => {
            setSelectedIds(prev => {
              const next = new Set(prev);
              if (allGroupPendingSelected) {
                pendingItems.forEach(r => next.delete(r.id));
              } else {
                pendingItems.forEach(r => next.add(r.id));
              }
              return next;
            });
          };

          return (
            <div key={payee} className="space-y-2">
              {/* Group header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                  {pendingItems.length > 0 && (
                    <Checkbox
                      checked={allGroupPendingSelected}
                      onCheckedChange={toggleGroupSelect}
                      className="flex-shrink-0"
                    />
                  )}
                  <h2 className="text-sm font-bold text-foreground">{payee}</h2>
                  <span className="text-xs text-muted-foreground">{items.length} request{items.length !== 1 ? "s" : ""}</span>
                  {pendingItems.length > 0 && (
                    <span className="text-xs bg-chart-3/10 text-chart-3 border border-chart-3/20 px-2 py-0.5 rounded-full font-medium">
                      {pendingItems.length} pending
                    </span>
                  )}
                </div>
                <span className="text-sm font-semibold text-foreground">₱{groupTotal.toLocaleString()}</span>
              </div>

              {/* Group items */}
              <div className="grid gap-2 pl-0">
                {items.map((pr) => {
                  const StatusIcon = statusIcons[pr.approval_status] || Clock;
                  const isOverdue = pr.due_date && new Date(pr.due_date) < new Date() && pr.approval_status !== "paid";
                  return (
                    <div key={pr.id} className={`bg-card rounded-2xl border p-5 hover:shadow-md transition-shadow ${isOverdue ? "border-destructive/40" : "border-border"} ${selectedIds.has(pr.id) ? "ring-2 ring-primary/40" : ""}`}>
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex-1 flex gap-3">
                          {pr.approval_status === "pending" && (
                            <Checkbox
                              checked={selectedIds.has(pr.id)}
                              onCheckedChange={() => toggleSelect(pr.id)}
                              className="mt-1 flex-shrink-0"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap mb-2">
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
                            {(pr.withholding_tax_percentage || pr.vat_percentage) && (
                              <div className="mt-2 text-xs text-foreground bg-muted/50 rounded-lg px-2 py-1.5 space-y-0.5">
                                {pr.withholding_tax_percentage > 0 && (
                                  <div className="flex justify-between"><span>Withholding Tax ({pr.withholding_tax_percentage}%):</span><span className="font-medium">-₱{(pr.withholding_tax_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                )}
                                {pr.vat_percentage > 0 && (
                                  <div className="flex justify-between"><span>VAT ({pr.vat_percentage}%):</span><span className="font-medium">+₱{(pr.vat_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
                                )}
                              </div>
                            )}
                            {pr.supporting_docs && (
                              <p className="text-xs text-muted-foreground mt-1">Docs: {pr.supporting_docs}</p>
                            )}
                            {pr.approval_notes && (
                              <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-border pl-2">{pr.approval_notes}</p>
                            )}
                            {pr.approval_history?.length > 0 && (
                              <button
                                onClick={() => setExpandedHistory(expandedHistory === pr.id ? null : pr.id)}
                                className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <History className="w-3.5 h-3.5" />
                                {pr.approval_history.length} history record{pr.approval_history.length !== 1 ? "s" : ""}
                                {expandedHistory === pr.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            )}
                            {expandedHistory === pr.id && (
                              <div className="mt-3 p-3 bg-muted/30 rounded-xl border border-border">
                                <ApprovalHistoryLog history={pr.approval_history} />
                              </div>
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
                        </div>
                        <div className="flex sm:flex-col items-center sm:items-end gap-3">
                          <p className="text-xl font-bold text-foreground">₱{(pr.amount || 0).toLocaleString()}</p>
                          <div className="flex gap-1">
                            {(pr.approval_status === "pending" || pr.approval_status === "approved") && (
                              <Button size="sm" variant={pr.approval_status === "approved" ? "default" : "outline"} onClick={() => setReviewPR(pr)}>
                                {pr.approval_status === "approved" ? <><Banknote className="w-3.5 h-3.5 mr-1" /> Disburse</> : "Review"}
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" onClick={() => setReviewPR(pr)} title="View History" className="text-muted-foreground hover:text-foreground">
                              <History className="w-4 h-4" />
                            </Button>
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
            </div>
          );
        });
      })()}

      <PaymentRequestFormDialog open={showAdd} onOpenChange={(v) => { setShowAdd(v); if (!v) setPrefillData(null); }} title="New Payment Request" initialData={prefillData} onSubmit={(data) => createMutation.mutateAsync(data)} />
      <PaymentRequestFormDialog open={!!editingPR} onOpenChange={(v) => { if (!v) setEditingPR(null); }} title="Edit Payment Request" initialData={editingPR || {}} onSubmit={(data) => updateMutation.mutateAsync({ id: editingPR.id, data })} />
      {reviewPR && (
        <ApprovalWorkflowDialog
          open={!!reviewPR}
          onOpenChange={(v) => !v && setReviewPR(null)}
          title={`Review Payment — ${reviewPR.payee}`}
          history={reviewPR.approval_history || []}
          summary={
            <div className="space-y-1">
              {reviewPR.request_number && <p className="text-xs text-muted-foreground font-mono">{reviewPR.request_number}</p>}
              <p className="font-semibold">{reviewPR.payee}</p>
              <p className="text-sm text-muted-foreground">{reviewPR.description}</p>
              {reviewPR.project_allocations?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {reviewPR.project_allocations.map((a, i) => (
                    <span key={i} className="text-xs bg-muted px-2 py-0.5 rounded-full">{a.project_name}: ₱{(a.amount || 0).toLocaleString()}</span>
                  ))}
                </div>
              )}
              <p className="text-2xl font-bold text-foreground mt-1">₱{(reviewPR.amount || 0).toLocaleString()}</p>
              {reviewPR.due_date && <p className="text-xs text-destructive">Due: {format(new Date(reviewPR.due_date), "MMM d, yyyy")}</p>}
              <Badge variant="outline" className={`text-xs mt-1 ${statusStyles[reviewPR.approval_status] || ""}`}>
                {(reviewPR.approval_status || "pending").replace(/_/g, " ")}
              </Badge>
            </div>
          }
          currentStatus={reviewPR.approval_status}
          onDecision={(decision) => handleDecision(reviewPR, decision)}
        />
      )}
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