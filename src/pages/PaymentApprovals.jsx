import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Plus, Trash2, CheckCircle, XCircle, Clock, AlertTriangle, Banknote, Pencil, Paperclip, ShoppingCart, History, ChevronDown, ChevronUp, Square, CheckSquare, Upload, Layers, CreditCard } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import BillsPaymentSheet from "../components/payables/BillsPaymentSheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PaymentRequestFormDialog from "../components/payment/PaymentRequestFormDialog";
import BulkPaymentRequestDialog from "../components/payment/BulkPaymentRequestDialog";
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
  const [showBulk, setShowBulk] = useState(false);
  const [showBillsPayment, setShowBillsPayment] = useState(false);
  const [prefillData, setPrefillData] = useState(null);
  const [editingPR, setEditingPR] = useState(null);
  const [reviewPR, setReviewPR] = useState(null);
  const [markingPaidPR, setMarkingPaidPR] = useState(null);
  const [expandedHistory, setExpandedHistory] = useState(null);
  const [expandedSuppliers, setExpandedSuppliers] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => setIsAdmin(u?.role === "admin")).catch(() => {});
  }, []);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["payment_requests"],
    queryFn: () => base44.entities.PaymentRequest.list("-created_date", 100),
  });

  const { data: approvedPOs = [] } = useQuery({
    queryKey: ["approved_pos"],
    queryFn: () => base44.entities.PurchaseOrder.filter({ approval_status: "approved" }, "-created_date", 100),
  });

  // Filter out POs that already have a payment request linked to them
  const poIdsWithRequests = new Set(
    requests
      .map(r => r.supporting_docs)
      .filter(Boolean)
      .map(doc => {
        const match = doc.match(/PO:\s*(.+)/);
        return match ? match[1].trim() : null;
      })
      .filter(Boolean)
  );
  const availablePOs = approvedPOs.filter(po => {
    const poRef = po.po_number || "";
    return !poIdsWithRequests.has(poRef);
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

  const bulkCreateRequests = async (items) => {
    await Promise.all(items.map(data => createMutation.mutateAsync(data)));
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
    <div className="p-4 md:p-8 w-full mx-auto space-y-6">
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
          <Button variant="outline" onClick={() => setShowBulk(true)}>
            <Upload className="w-4 h-4 mr-2" /> Bulk Create
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> New Request <ChevronDown className="w-3.5 h-3.5 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setPrefillData(null); setShowAdd(true); }}>
                <Plus className="w-4 h-4 mr-2" /> New Payment Request
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowBillsPayment(true)}>
                <CreditCard className="w-4 h-4 mr-2" /> Bills Payment
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
      {availablePOs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Approved Purchase Orders — Ready to Pay</h2>
          </div>
          <div className="grid gap-3">
            {availablePOs.map(po => (
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

      {/* Bulk action toolbar — admin only */}
      {isAdmin && pendingInView.length > 0 && (
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

      {/* Payment Requests Table */}
      <div className="rounded-2xl border border-border overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 border-b border-border">
            <tr>
              {isAdmin && <th className="px-3 py-3 w-8"></th>}
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">PR #</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payee</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Project(s)</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoice #</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payment</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Requested By</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due Date</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">W/Tax</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">VAT</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={15} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={15} className="text-center py-12 text-muted-foreground">No payment requests found</td></tr>
            )}
            {filtered.map((pr) => {
              const StatusIcon = statusIcons[pr.approval_status] || Clock;
              const isOverdue = pr.due_date && new Date(pr.due_date) < new Date() && pr.approval_status !== "paid";
              const isExpanded = expandedHistory === pr.id;
              return (
                <>
                  <tr
                    key={pr.id}
                    className={`hover:bg-muted/30 transition-colors cursor-pointer ${selectedIds.has(pr.id) ? "bg-primary/5" : ""} ${isOverdue ? "border-l-2 border-l-destructive" : ""}`}
                    onClick={() => setExpandedHistory(isExpanded ? null : pr.id)}
                  >
                    {isAdmin && (
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        {pr.approval_status === "pending" && (
                          <Checkbox checked={selectedIds.has(pr.id)} onCheckedChange={() => toggleSelect(pr.id)} />
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{pr.request_number || "—"}</td>
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{pr.payee}</td>
                    <td className="px-4 py-3 text-xs text-foreground max-w-[180px] truncate">{pr.description}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {pr.project_allocations?.length > 0
                        ? pr.project_allocations.map((a, i) => (
                            <span key={i} className="inline-block bg-muted rounded-full px-2 py-0.5 mr-1 mb-0.5">{a.project_name}</span>
                          ))
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {pr.project_allocations?.length > 0
                        ? [...new Set(pr.project_allocations.map(a => a.category).filter(Boolean))].map((cat, i) => (
                            <span key={i} className="inline-block">{categoryLabels[cat] || cat}</span>
                          ))
                        : (pr.category ? categoryLabels[pr.category] || pr.category : "—")}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{pr.invoice_number || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap capitalize">{pr.payment_method ? pr.payment_method.replace(/_/g, " ") : "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{pr.requested_by || "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="outline" className={`text-xs ${statusStyles[pr.approval_status] || ""}`}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {(pr.approval_status || "pending").replace(/_/g, " ")}
                        </Badge>
                        {isOverdue && <Badge className="text-xs bg-destructive/10 text-destructive border-destructive/20">Overdue</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {pr.due_date ? <span className={isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}>{format(new Date(pr.due_date), "MMM d, yyyy")}</span> : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                      {pr.withholding_tax_percentage > 0 ? `-₱${(pr.withholding_tax_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground whitespace-nowrap">
                      {pr.vat_percentage > 0 ? `+₱${(pr.vat_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-foreground whitespace-nowrap">
                      ₱{(pr.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && pr.approval_status === "pending" && (
                          <Button size="sm" variant="outline" onClick={() => setReviewPR(pr)}>Review</Button>
                        )}
                        {isAdmin && pr.approval_status === "approved" && (
                          <Button size="sm" onClick={() => setReviewPR(pr)}>
                            <Banknote className="w-3.5 h-3.5 mr-1" /> Disburse
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => setReviewPR(pr)} title="History" className="text-muted-foreground hover:text-foreground">
                          <History className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditingPR(pr)} className="text-muted-foreground hover:text-foreground">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(pr.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${pr.id}-expanded`} className="bg-muted/20">
                      <td colSpan={isAdmin ? 15 : 14} className="px-6 py-4">
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            {pr.invoice_number && <span>Invoice: <span className="text-foreground font-medium">{pr.invoice_number}</span></span>}
                            {pr.payment_method && <span>Payment: <span className="text-foreground font-medium">{pr.payment_method.replace(/_/g, " ")}</span></span>}
                            {pr.requested_by && <span>Requested by: <span className="text-foreground font-medium">{pr.requested_by}</span></span>}
                            {pr.approved_by && <span>Approved by: <span className="text-foreground font-medium">{pr.approved_by}</span></span>}
                            {pr.supporting_docs && <span>Docs: <span className="text-foreground">{pr.supporting_docs}</span></span>}
                          </div>
                          {pr.project_allocations?.length > 0 && (
                            <div className="border border-border rounded-lg overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-muted/50 border-b border-border">
                                    <th className="px-3 py-2 text-left font-semibold">Project</th>
                                    <th className="px-3 py-2 text-left font-semibold">Category</th>
                                    <th className="px-3 py-2 text-right font-semibold">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {pr.project_allocations.map((a, i) => (
                                    <tr key={i} className="border-b border-border/50 last:border-0">
                                      <td className="px-3 py-2">{a.project_name}</td>
                                      <td className="px-3 py-2 text-muted-foreground">{a.category ? (categoryLabels[a.category] || a.category) : "—"}</td>
                                      <td className="px-3 py-2 text-right font-semibold">₱{(a.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {(pr.withholding_tax_percentage > 0 || pr.vat_percentage > 0) && (
                            <div className="text-xs space-y-1 bg-muted/40 rounded-lg px-3 py-2">
                              {pr.withholding_tax_percentage > 0 && (
                                <div className="flex justify-between"><span>Withholding Tax ({pr.withholding_tax_percentage}%):</span><span className="font-medium text-destructive">-₱{(pr.withholding_tax_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                              )}
                              {pr.vat_percentage > 0 && (
                                <div className="flex justify-between"><span>VAT ({pr.vat_percentage}%):</span><span className="font-medium text-chart-2">+₱{(pr.vat_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
                              )}
                            </div>
                          )}
                          {pr.approval_notes && (
                            <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2">{pr.approval_notes}</p>
                          )}
                          {pr.approval_status === "paid" && (pr.check_number || pr.check_date || pr.check_attachment) && (
                            <div className="flex flex-wrap items-center gap-3 bg-chart-2/5 border border-chart-2/20 rounded-lg px-3 py-2">
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
                          {pr.approval_history?.length > 0 && (
                            <div className="p-3 bg-muted/30 rounded-xl border border-border">
                              <ApprovalHistoryLog history={pr.approval_history} />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      <BillsPaymentSheet open={showBillsPayment} onOpenChange={setShowBillsPayment} />
      <BulkPaymentRequestDialog open={showBulk} onOpenChange={setShowBulk} onSubmit={bulkCreateRequests} />
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