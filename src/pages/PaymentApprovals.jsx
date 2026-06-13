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
import GroupedPaymentRequests from "../components/payment/GroupedPaymentRequests";

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
  const [expandedGroups, setExpandedGroups] = useState({ pending: true, approved: true, rejected: false, paid: false });
  const [expandedPOs, setExpandedPOs] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDisbursementRole, setIsDisbursementRole] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => {
      setIsAdmin(u?.role === "admin");
      setIsDisbursementRole(u?.role === "disbursement");
    }).catch(() => {});
  }, []);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["payment_requests"],
    queryFn: () => base44.entities.PaymentRequest.list("-created_date", 10000),
  });

  const { data: approvedPOs = [] } = useQuery({
    queryKey: ["approved_pos"],
    queryFn: () => base44.entities.PurchaseOrder.filter({ approval_status: "approved" }, "-created_date", 10000),
  });

  const { data: payables = [] } = useQuery({
    queryKey: ["payables_for_po_check"],
    queryFn: () => base44.entities.Payable.list("-created_date", 10000),
  });

  // Filter out POs that already have a payment request OR payable linked to them
  const poRefsWithRequests = new Set(
    requests
      .map(r => r.supporting_docs)
      .filter(Boolean)
      .flatMap(doc => {
        const match = doc.match(/PO:\s*(.+)/);
        return match ? [match[1].trim()] : [];
      })
      .filter(Boolean)
  );

  // Also check payables for linked POs
  const poIdsWithPayables = new Set(
    payables
      .flatMap(p => [p.po_id, p.po_number].filter(Boolean))
  );

  const availablePOs = approvedPOs.filter(po => {
    const hasPaymentRequest = poRefsWithRequests.has(po.po_number) || poRefsWithRequests.has(po.id);
    const hasPayableById = poIdsWithPayables.has(po.id);
    const hasPayableByRef = po.po_number && poIdsWithPayables.has(po.po_number);
    return !hasPaymentRequest && !hasPayableById && !hasPayableByRef;
  });

  // Map PR category to a sensible expense CoA name
  const PR_CATEGORY_COA = {
    supplier_invoice: "Accounts Payable",
    subcontractor: "Subcontractor Expense",
    labor: "Direct Labor",
    equipment: "Equipment Expense",
    expense_reimbursement: "Operating Expense",
    utilities: "Utilities Expense",
    other: "General Expense",
  };

  const PR_CATEGORY_TX = {
    supplier_invoice: "other",
    subcontractor: "subcontractor",
    labor: "direct_labor",
    equipment: "equipment",
    expense_reimbursement: "operating_expense",
    utilities: "other",
    other: "other",
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Check for duplicate payment request (same payee + invoice number)
      const existingPR = requests.find(r => 
        r.payee === data.payee && 
        r.invoice_number === data.invoice_number &&
        r.approval_status !== "rejected" &&
        r.approval_status !== "cancelled"
      );
      if (existingPR) {
        throw new Error(`A payment request already exists for ${data.payee} (Invoice: ${data.invoice_number}). Duplicate payment requests are not allowed.`);
      }

      const pr = await base44.entities.PaymentRequest.create(data);

      // Record double-entry accounting: Dr. Expense, Cr. Accounts Payable
      const today = new Date().toISOString().split("T")[0];
      const projectName = data.project_allocations?.[0]?.project_name || "";
      const expenseCoA = PR_CATEGORY_COA[data.category] || "General Expense";
      const txCategory = PR_CATEGORY_TX[data.category] || "other";

      // Dr. Expense / Asset (recognize cost)
      await base44.entities.Transaction.create({
        description: `Expense Recognition – ${data.payee}${data.invoice_number ? ` (${data.invoice_number})` : ""}${data.description ? `: ${data.description}` : ""}`,
        amount: data.amount,
        type: "expense",
        category: txCategory,
        chart_of_account: expenseCoA,
        project_code: projectName,
        date: data.invoice_date || today,
        status: "completed",
      });

      // Cr. Accounts Payable (record liability)
      await base44.entities.Transaction.create({
        description: `Accounts Payable – ${data.payee}${data.invoice_number ? ` (${data.invoice_number})` : ""}`,
        amount: data.amount,
        type: "income",
        category: "other",
        chart_of_account: "Accounts Payable",
        project_code: projectName,
        date: data.invoice_date || today,
        status: "pending",
      });

      return pr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment_requests"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
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
    // Check for duplicates before creating
    for (const item of items) {
      const existingPR = requests.find(r => 
        r.payee === item.payee && 
        r.invoice_number === item.invoice_number &&
        r.approval_status !== "rejected" &&
        r.approval_status !== "cancelled"
      );
      if (existingPR) {
        alert(`A payment request already exists for ${item.payee} (Invoice: ${item.invoice_number}). Skipping duplicate.`);
        items = items.filter(i => i !== item);
      }
    }
    if (items.length > 0) {
      await Promise.all(items.map(data => createMutation.mutateAsync(data)));
    }
  };

  const convertPOtoPaymentRequest = (po) => {
    // Check if a payment request already exists for this supplier + invoice
    const existingPR = requests.find(r => 
      r.payee === po.supplier_name && 
      r.invoice_number === po.po_number &&
      r.approval_status !== "rejected" &&
      r.approval_status !== "cancelled"
    );

    if (existingPR) {
      alert(`A payment request already exists for ${po.supplier_name} (Invoice: ${po.po_number}). Duplicate payment requests are not allowed.`);
      return;
    }

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

  const handleDecision = async (pr, { action, actor, notes, bankAccountId, paymentReference, paymentDate }) => {
    const newEntry = {
      step: action,
      action,
      actor,
      notes,
      timestamp: new Date().toISOString(),
    };
    const history = [...(pr.approval_history || []), newEntry];
    const disbursedDate = paymentDate || new Date().toISOString().split("T")[0];
    await updateMutation.mutateAsync({
      id: pr.id,
      data: {
        approval_status: action,
        approval_notes: notes,
        approved_by: actor,
        approval_step: action,
        approval_history: history,
        ...(action === "paid" ? { check_date: disbursedDate } : {}),
      },
    });

    // When disbursed, create double-entry transactions + auto-mark linked Payable as paid
    if (action === "paid") {
      const bankAccounts = await base44.entities.BankAccount.list("-created_date", 10000);
      const bankAccount = bankAccounts.find(a => a.id === bankAccountId);
      const bankLabel = bankAccount ? `${bankAccount.account_name} – ${bankAccount.bank_name}` : "Cash in Bank";
      const projectName = pr.project_allocations?.[0]?.project_name || "";

      const withholdingTax = pr.withholding_tax_amount || 0;
      const vatAmt = pr.vat_amount || 0;
      const netCashOut = (pr.amount || 0) - withholdingTax + vatAmt;

      // Dr. Accounts Payable (reduce liability — full gross amount)
      await base44.entities.Transaction.create({
        description: `Accounts Payable Settlement – ${pr.payee}${pr.invoice_number ? ` (${pr.invoice_number})` : ""}`,
        amount: pr.amount,
        type: "expense",
        category: "other",
        chart_of_account: "Accounts Payable",
        project_code: projectName,
        date: disbursedDate,
        status: "completed",
      });

      // Cr. Cash in Bank (net cash outflow after withholding tax deduction)
      await base44.entities.Transaction.create({
        description: `Cash Payment – ${pr.payee}${pr.invoice_number ? ` (${pr.invoice_number})` : ""}${paymentReference ? ` [${paymentReference}]` : ""}`,
        amount: netCashOut,
        type: "expense",
        category: pr.category || "other",
        chart_of_account: bankLabel,
        project_code: projectName,
        bank_account_id: bankAccountId || "",
        date: disbursedDate,
        status: "completed",
      });

      // Cr. Withholding Tax Payable (liability for tax withheld from supplier)
      if (withholdingTax > 0) {
        await base44.entities.Transaction.create({
          description: `Withholding Tax Withheld – ${pr.payee}${pr.invoice_number ? ` (${pr.invoice_number})` : ""} @ ${pr.withholding_tax_percentage}%`,
          amount: withholdingTax,
          type: "income",
          category: "other",
          chart_of_account: "Withholding Tax Payable",
          project_code: projectName,
          date: disbursedDate,
          status: "completed",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["transactions"] });

      // Auto-mark linked Payable as paid
      if (pr.supporting_docs) {
        const match = pr.supporting_docs.match(/PO:\s*(.+)/);
        if (match) {
          const poRef = match[1].trim();
          const linkedPayable = payables.find(p => p.po_number === poRef || p.po_id === poRef);
          if (linkedPayable && linkedPayable.status !== "paid") {
            const linkedNet = (linkedPayable.amount || 0) - (linkedPayable.withholding_tax_amount || 0) + (linkedPayable.vat_amount || 0);
            await base44.entities.Payable.update(linkedPayable.id, {
              status: "paid",
              amount_paid: linkedNet,
              payment_date: disbursedDate,
              payment_method: pr.payment_method || "bank_transfer",
              payment_reference: paymentReference || "",
              payment_notes: `Auto-paid via Payment Approval disbursement by ${actor}`,
            });
            queryClient.invalidateQueries({ queryKey: ["payables_for_po_check"] });
          }
        }
      }
    }
  };

  const filtered = statusFilter === "all" ? requests : requests.filter(r => r.approval_status === statusFilter);
  const pending = requests.filter(r => r.approval_status === "pending");
  const approved = requests.filter(r => r.approval_status === "approved");
  const totalPending = pending.reduce((s, r) => s + (r.amount || 0), 0);
  const totalApproved = approved.reduce((s, r) => s + (r.amount || 0), 0);

  const pendingInView = filtered.filter(r => r.approval_status === "pending");
  const allPendingSelected = pendingInView.length > 0 && pendingInView.every(r => selectedIds.has(r.id));

  const toggleGroup = (status) => {
    setExpandedGroups(prev => ({ ...prev, [status]: !prev[status] }));
  };

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

  const renderPRRow = (pr) => {
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
            <td className="px-2 py-2" onClick={e => e.stopPropagation()}>
              {pr.approval_status === "pending" && (
                <Checkbox checked={selectedIds.has(pr.id)} onCheckedChange={() => toggleSelect(pr.id)} />
              )}
            </td>
          )}
          <td className="px-3 py-2 font-mono text-xs text-muted-foreground whitespace-nowrap">{pr.request_number || "—"}</td>
          <td className="px-3 py-2 font-medium text-foreground whitespace-nowrap">{pr.payee}</td>
          <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{pr.invoice_number || "—"}</td>
          <td className="px-3 py-2 text-xs whitespace-nowrap">
            {pr.due_date ? <span className={isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}>{format(new Date(pr.due_date), "MMM d, yyyy")}</span> : "—"}
          </td>
          <td className="px-3 py-2 text-right whitespace-nowrap">
            <div className="font-bold text-foreground">₱{(pr.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
            {(pr.withholding_tax_amount > 0 || pr.vat_amount > 0) && (
              <div className="text-xs text-primary font-medium">
                Net: ₱{((pr.amount || 0) - (pr.withholding_tax_amount || 0) + (pr.vat_amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            )}
          </td>
          <td className="px-2 py-2" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-end gap-1">
              {isAdmin && pr.approval_status === "pending" && (
                <Button size="sm" variant="outline" onClick={() => setReviewPR(pr)}>Review</Button>
              )}
              {(isAdmin || isDisbursementRole) && pr.approval_status === "approved" && (
                <Button size="sm" onClick={() => setReviewPR(pr)}>
                  <Banknote className="w-3.5 h-3.5 mr-1" /> Disburse
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setReviewPR(pr)} title="History" className="text-muted-foreground hover:text-foreground">
                <History className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setEditingPR({...pr})} title="Edit" className="text-muted-foreground hover:text-foreground">
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(pr.id)} title="Delete" className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </td>
        </tr>
        {isExpanded && (
          <tr key={`${pr.id}-expanded`} className="bg-muted/20">
            <td colSpan={10} className="px-6 py-4">
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Description:</span>
                  <p className="text-sm text-foreground mt-1">{pr.description}</p>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {pr.project_allocations?.length > 0 && (
                    <span>Projects: <span className="text-foreground">{pr.project_allocations.map(a => a.project_name).join(", ")}</span></span>
                  )}
                  {pr.category && <span>Category: <span className="text-foreground">{categoryLabels[pr.category] || pr.category}</span></span>}
                  {pr.payment_method && <span>Payment: <span className="text-foreground">{pr.payment_method.replace(/_/g, " ")}</span></span>}
                  {pr.requested_by && <span>Requested by: <span className="text-foreground">{pr.requested_by}</span></span>}
                  {pr.supporting_docs && <span>Docs: <a href={pr.supporting_docs} target="_blank" rel="noopener noreferrer" className="text-primary underline">View</a></span>}
                </div>
                {pr.approval_notes && (
                  <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2">{pr.approval_notes}</p>
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

      {/* Approved Purchase Orders — Ready to Pay */}
      {availablePOs.length > 0 && (
        <div className="space-y-3">
          <button
            onClick={() => setExpandedPOs(!expandedPOs)}
            className="w-full flex items-center justify-between gap-2 p-3 bg-muted/30 hover:bg-muted/50 border border-border rounded-xl transition-colors"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Approved Purchase Orders — Ready to Pay</h2>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{availablePOs.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">₱{availablePOs.reduce((s, po) => s + (po.amount || 0), 0).toLocaleString()}</p>
              {expandedPOs ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </button>
          {expandedPOs && (
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
          )}
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

      {/* Grouped Payment Requests Table */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No payment requests found</div>
      ) : (
        <GroupedPaymentRequests
          requests={filtered}
          expandedGroups={expandedGroups}
          toggleGroup={toggleGroup}
          renderPRRow={renderPRRow}
          isAdmin={isAdmin}
          selectedIds={selectedIds}
          toggleSelect={toggleSelect}
        />
      )}

      <BillsPaymentSheet open={showBillsPayment} onOpenChange={setShowBillsPayment} />
      <BulkPaymentRequestDialog open={showBulk} onOpenChange={setShowBulk} onSubmit={bulkCreateRequests} />
      <PaymentRequestFormDialog key={`new-${showAdd}`} open={showAdd} onOpenChange={(v) => { setShowAdd(v); if (!v) setPrefillData(null); }} title="New Payment Request" initialData={prefillData} onSubmit={(data) => createMutation.mutateAsync(data)} />
      <PaymentRequestFormDialog key={`edit-${editingPR?.id}`} open={!!editingPR} onOpenChange={(v) => { if (!v) setEditingPR(null); }} title="Edit Payment Request" initialData={editingPR || {}} onSubmit={(data) => updateMutation.mutateAsync({ id: editingPR.id, data })} />
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
              <div className="mt-1 space-y-0.5">
                <p className="text-2xl font-bold text-foreground">₱{(reviewPR.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                {reviewPR.withholding_tax_amount > 0 && (
                  <p className="text-sm text-destructive">Withholding Tax ({reviewPR.withholding_tax_percentage}%): -₱{(reviewPR.withholding_tax_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                )}
                {reviewPR.vat_amount > 0 && (
                  <p className="text-sm text-chart-2">VAT ({reviewPR.vat_percentage}%): +₱{(reviewPR.vat_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                )}
                {(reviewPR.withholding_tax_amount > 0 || reviewPR.vat_amount > 0) && (
                  <p className="text-lg font-bold text-primary">Net to Disburse: ₱{((reviewPR.amount || 0) - (reviewPR.withholding_tax_amount || 0) + (reviewPR.vat_amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                )}
              </div>
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