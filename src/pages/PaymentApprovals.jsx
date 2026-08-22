import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Plus, Trash2, CheckCircle, XCircle, Clock, AlertTriangle, Banknote, Pencil, Paperclip, ShoppingCart, History, ChevronDown, ChevronUp, Square, CheckSquare, Upload, Layers, CreditCard, Search, Download, Printer } from "lucide-react";
import { ExecutiveTabsList, ExecutiveTab } from "@/components/shared/ExecutiveTabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import BillsPaymentSheet from "../components/payables/BillsPaymentSheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { exportToExcel } from "@/utils/excelUtils";
import PaymentRequestFormDialog from "../components/payment/PaymentRequestFormDialog";
import BulkPaymentRequestDialog from "../components/payment/BulkPaymentRequestDialog";
import MarkPaidDialog from "../components/payment/MarkPaidDialog";
import BulkDisburseDialog from "../components/payment/BulkDisburseDialog";
import ApprovalWorkflowDialog from "../components/approvals/ApprovalWorkflowDialog";
import ApprovalHistoryLog from "../components/approvals/ApprovalHistoryLog";
import SupplierGroupedRequests from "../components/payment/SupplierGroupedRequests";
import SupplierGroupedPOs from "../components/payment/SupplierGroupedPOs";
import CheckWriterWorkspace from "@/components/check-writer/CheckWriterWorkspace";

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
  const [activeTab, setActiveTab] = useState("pending");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDisbursementRole, setIsDisbursementRole] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showBulkDisburse, setShowBulkDisburse] = useState(false);
  const [poPrFilter, setPoPrFilter] = useState("all");
  const [selectedPOIds, setSelectedPOIds] = useState(new Set());
  const queryClient = useQueryClient();
  const posGroupRef = useRef();
  const cancelledPosGroupRef = useRef();
  const pendingGroupRef = useRef();
  const approvedGroupRef = useRef();
  const paidGroupRef = useRef();

  useEffect(() => {
    base44.auth.me().then(u => {
      setIsAdmin(u?.role === "admin");
      setIsDisbursementRole(u?.role === "disbursement");
      setCurrentUser(u);
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

  const { data: cancelledPOs = [] } = useQuery({
    queryKey: ["cancelled_pos"],
    queryFn: () => base44.entities.PurchaseOrder.filter({ approval_status: "cancelled" }, "-created_date", 10000),
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
        return match ? match[1].split(",").map(s => s.trim()) : [];
      })
      .filter(Boolean)
  );

  // Also check payables for linked POs
  const poIdsWithPayables = new Set(
    payables
      .flatMap(p => [p.po_id, p.po_number].filter(Boolean))
  );

  const availablePOs = approvedPOs.filter(po => {
    const hasPayableById = poIdsWithPayables.has(po.id);
    const hasPayableByRef = po.po_number && poIdsWithPayables.has(po.po_number);
    return !hasPayableById && !hasPayableByRef;
  });

  const poHasRequest = (po) => poRefsWithRequests.has(po.po_number) || poRefsWithRequests.has(po.id);
  const availablePOsInView = availablePOs.filter(po => {
    if (poPrFilter === "created") return poHasRequest(po);
    if (poPrFilter === "not_created") return !poHasRequest(po);
    return true;
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

  const togglePOSelect = (id) => {
    setSelectedPOIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const cancelPurchaseOrder = async (po) => {
    if (!window.confirm(`Cancel purchase order ${po.po_number || "this PO"}? It will no longer be available for payment.`)) return;
    const actor = currentUser?.full_name || currentUser?.email || "Administrator";
    const timestamp = new Date().toISOString();
    await base44.entities.PurchaseOrder.update(po.id, {
      approval_status: "cancelled",
      approval_notes: `Cancelled by ${actor}`,
      approval_history: [...(po.approval_history || []), { step: "cancelled", action: "cancelled", actor, notes: "Cancelled from Payment Approvals", timestamp }],
    });
    const linkedRequests = requests.filter((request) => {
      if (["paid", "rejected"].includes(request.approval_status) || !request.supporting_docs) return false;
      const match = request.supporting_docs.match(/PO:\s*(.+)/);
      if (!match) return false;
      const refs = match[1].split(",").map((ref) => ref.trim());
      return refs.includes(po.po_number) || refs.includes(po.id);
    });
    await Promise.all(linkedRequests.map((request) => base44.entities.PaymentRequest.update(request.id, {
      approval_status: "rejected",
      approval_step: "rejected",
      approval_notes: `Purchase Order ${po.po_number || po.id} was cancelled`,
      approval_history: [...(request.approval_history || []), { step: "rejected", action: "rejected", actor, notes: `Linked Purchase Order ${po.po_number || po.id} was cancelled`, timestamp }],
    })));
    setSelectedPOIds((previous) => {
      const next = new Set(previous);
      next.delete(po.id);
      return next;
    });
    queryClient.invalidateQueries({ queryKey: ["approved_pos"] });
    queryClient.invalidateQueries({ queryKey: ["cancelled_pos"] });
    queryClient.invalidateQueries({ queryKey: ["payment_requests"] });
  };

  const selectedPOs = availablePOsInView.filter(po => selectedPOIds.has(po.id));
  const selectedPOsSameSupplier = selectedPOs.length > 1 && selectedPOs.every(po => po.supplier_name === selectedPOs[0].supplier_name);

  const consolidatePOs = () => {
    const supplier = selectedPOs[0].supplier_name;
    const poRefs = selectedPOs.map(po => po.po_number || po.id.slice(-6).toUpperCase());
    const totalAmount = selectedPOs.reduce((s, po) => s + (po.amount || 0), 0);
    // Aggregate project allocations across all selected POs by project
    const allocMap = {};
    selectedPOs.forEach(po => {
      const key = po.project_name || "Unassigned";
      allocMap[key] = (allocMap[key] || 0) + (po.amount || 0);
    });
    const dueDates = selectedPOs.map(po => po.required_date).filter(Boolean).sort();
    const prData = {
      request_number: `PR-PO-${poRefs.join("_")}`.slice(0, 60),
      payee: supplier,
      description: `Consolidated payment for ${selectedPOs.length} POs: ${poRefs.join(", ")}`,
      category: "supplier_invoice",
      payment_method: "bank_transfer",
      invoice_number: poRefs.join(", "),
      invoice_date: selectedPOs[0].requested_date || "",
      due_date: dueDates[0] || "",
      requested_by: selectedPOs[0].requested_by || "",
      supporting_docs: `PO: ${poRefs.join(", ")}`,
      project_allocations: Object.entries(allocMap).map(([project_name, amount]) => ({ project_name, amount })),
      amount: totalAmount,
    };
    setShowAdd(true);
    setPrefillData(prData);
    setSelectedPOIds(new Set());
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
        ...(action === "paid" ? { check_date: disbursedDate, check_number: paymentReference || pr.check_number, bank_account_id: bankAccountId || pr.bank_account_id } : {}),
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
      // Find payable linked by PR notes tag (PR:{id}) or by PO reference in supporting_docs
      let linkedPayable = payables.find(p => p.notes && p.notes.includes(`PR:${pr.id}`));
      if (!linkedPayable && pr.supporting_docs) {
        const match = pr.supporting_docs.match(/PO:\s*(.+)/);
        if (match) {
          const poRef = match[1].trim();
          linkedPayable = payables.find(p => p.po_number === poRef || p.po_id === poRef);
        }
      }
      if (linkedPayable && linkedPayable.status !== "paid") {
        const currentPayable = await base44.entities.Payable.get(linkedPayable.id);
        const linkedNet = (currentPayable.amount || 0) - (currentPayable.withholding_tax_amount || 0) + (currentPayable.vat_amount || 0);
        const currentPaid = currentPayable.amount_paid || 0;
        const newAmountPaid = Math.min(currentPaid + netCashOut, linkedNet);
        const newStatus = newAmountPaid >= linkedNet - 0.01 ? "paid" : "partially_paid";
        const newHistory = [...(currentPayable.payment_history || []), {
          payment_date: disbursedDate,
          amount: netCashOut,
          payment_method: pr.payment_method || "bank_transfer",
          reference: paymentReference || "",
          notes: `Auto-settled via Payment Request ${pr.id} by ${actor}`,
        }];
        await base44.entities.Payable.update(currentPayable.id, {
          status: newStatus,
          amount_paid: newAmountPaid,
          payment_date: disbursedDate,
          payment_method: pr.payment_method || "bank_transfer",
          payment_reference: paymentReference || "",
          payment_notes: `Auto-settled via Payment Approval disbursement by ${actor}`,
          payment_history: newHistory,
        });
        queryClient.invalidateQueries({ queryKey: ["payables"] });
      }
    }
  };

  const searchTerm = search.trim().toLowerCase();
  const matchesSearch = (r) => !searchTerm ||
    (r.request_number || "").toLowerCase().includes(searchTerm) ||
    (r.payee || "").toLowerCase().includes(searchTerm) ||
    (r.invoice_number || "").toLowerCase().includes(searchTerm) ||
    (r.description || "").toLowerCase().includes(searchTerm) ||
    (r.project_allocations || []).some(a => (a.project_name || "").toLowerCase().includes(searchTerm));

  const handleExport = () => {
    exportToExcel(requests.map(r => ({
      request_number: r.request_number, payee: r.payee, invoice_number: r.invoice_number,
      description: r.description, amount: r.amount, due_date: r.due_date,
      category: r.category, approval_status: r.approval_status,
      projects: (r.project_allocations || []).map(a => a.project_name).join(", "),
      requested_by: r.requested_by, approved_by: r.approved_by,
    })), "payment_requests.xlsx", "Payment Requests");
  };
  const pending = requests.filter(r => r.approval_status === "pending");
  const approved = requests.filter(r => r.approval_status === "approved");
  const paid = requests.filter(r => r.approval_status === "paid");
  const totalPending = pending.reduce((s, r) => s + (r.amount || 0), 0);
  const totalApproved = approved.reduce((s, r) => s + (r.amount || 0), 0);

  const pendingInView = pending.filter(matchesSearch);
  const approvedInView = approved.filter(matchesSearch);
  const paidInView = paid.filter(matchesSearch);
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

  const selectedApproved = requests.filter(r => selectedIds.has(r.id) && r.approval_status === "approved");
  const selectedApprovedSamePayee = selectedApproved.length > 1 && selectedApproved.every(r => r.payee === selectedApproved[0].payee);

  const bulkDisburseSelected = async ({ bankAccountId, paymentReference, paymentDate }) => {
    const actor = currentUser?.full_name || currentUser?.email || "Bulk Disbursement";
    for (const pr of selectedApproved) {
      await handleDecision(pr, {
        action: "paid",
        actor,
        notes: `Combined check payment${paymentReference ? ` – ${paymentReference}` : ""}`,
        bankAccountId,
        paymentReference,
        paymentDate,
      });
    }
    setSelectedIds(new Set());
    setShowBulkDisburse(false);
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
          {(isAdmin || (isDisbursementRole && pr.approval_status === "approved")) && (
            <td className="px-1 py-0" onClick={e => e.stopPropagation()}>
              {(pr.approval_status === "pending" || pr.approval_status === "approved") && (
                <Checkbox checked={selectedIds.has(pr.id)} onCheckedChange={() => toggleSelect(pr.id)} />
              )}
            </td>
          )}
          <td className="px-1 py-0 font-mono text-xs text-muted-foreground whitespace-nowrap">{pr.request_number || "—"}</td>
          <td className="px-1 py-0 text-xs font-medium text-foreground whitespace-nowrap">{pr.payee}</td>
          <td className="px-1 py-0 text-xs text-muted-foreground whitespace-nowrap">{pr.invoice_number || "—"}</td>
          <td className="px-1 py-0 text-xs whitespace-nowrap">
            {pr.due_date ? <span className={isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}>{format(new Date(pr.due_date), "MMM d, yyyy")}</span> : "—"}
          </td>
          <td className="px-1 py-0 text-right whitespace-nowrap">
            <span className="text-xs font-bold text-foreground">₱{(pr.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            {(pr.withholding_tax_amount > 0 || pr.vat_amount > 0) && (
              <span className="text-xs text-primary font-medium ml-1">/ ₱{((pr.amount || 0) - (pr.withholding_tax_amount || 0) + (pr.vat_amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            )}
          </td>
          <td className="px-1 py-0" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-end gap-1">
              {isAdmin && pr.approval_status === "pending" && (
                <Button size="sm" variant="outline" onClick={() => setReviewPR(pr)} className="h-6 px-2 text-xs">Review</Button>
              )}
              {(isAdmin || isDisbursementRole) && pr.approval_status === "approved" && (
                <Button size="sm" onClick={() => setReviewPR(pr)} className="h-6 px-2 text-xs">
                  <Banknote className="w-3.5 h-3.5 mr-1" /> Disburse
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={() => setReviewPR(pr)} title="History" className="text-muted-foreground hover:text-foreground h-6 w-6">
                <History className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setEditingPR({...pr})} title="Edit" className="text-muted-foreground hover:text-foreground h-6 w-6">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(pr.id)} title="Delete" className="text-muted-foreground hover:text-destructive h-6 w-6">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
            </div>
          </td>
        </tr>
        {isExpanded && (
          <tr key={`${pr.id}-expanded`} className="bg-muted/20">
            <td colSpan={10} className="px-6 py-2">
              <div className="space-y-2">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Description:</span>
                  <p className="text-sm text-foreground mt-0.5">{pr.description}</p>
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
                  <div className="p-2 bg-muted/30 rounded-xl border border-border">
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

    <div className="p-4 md:p-6 w-full mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Payment Approvals</h1>
          <p className="text-muted-foreground mt-1">
            {pending.length} pending · {approved.length} approved awaiting payment
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search request #, payee, invoice, project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {pending.length > 0 && (
          <div className="bg-chart-3/10 border border-chart-3/20 rounded-xl p-3 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-chart-3 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-chart-3">{pending.length} Pending Approval</p>
              <p className="text-[11px] text-chart-3/80">₱{totalPending.toLocaleString()} awaiting review</p>
            </div>
          </div>
        )}
        {approved.length > 0 && (
          <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 flex items-center gap-3">
            <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-primary">{approved.length} Approved — Ready to Pay</p>
              <p className="text-[11px] text-primary/80">₱{totalApproved.toLocaleString()} to be disbursed</p>
            </div>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <ExecutiveTabsList>
          <ExecutiveTab value="pos" icon={ShoppingCart}>Approved POs ({availablePOs.length})</ExecutiveTab>
          <ExecutiveTab value="cancelled-pos" icon={XCircle}>Cancelled POs ({cancelledPOs.length})</ExecutiveTab>
          <ExecutiveTab value="pending" icon={Clock}>Pending ({pending.length})</ExecutiveTab>
          <ExecutiveTab value="approved" icon={CheckCircle}>Approved ({approved.length})</ExecutiveTab>
          <ExecutiveTab value="paid" icon={Banknote}>Paid ({paid.length})</ExecutiveTab>
          {(isAdmin || isDisbursementRole) && <ExecutiveTab value="checks" icon={Printer}>Check Writer</ExecutiveTab>}
        </ExecutiveTabsList>

        {/* Approved Purchase Orders — Ready to Pay */}
        <TabsContent value="pos" className="space-y-3 mt-4">
          {selectedPOIds.size > 0 && (
            <div className="flex items-center justify-between bg-chart-2/10 border border-chart-2/20 rounded-xl px-4 py-2.5">
              <span className="text-sm text-chart-2">
                {selectedPOIds.size} PO{selectedPOIds.size !== 1 ? "s" : ""} selected
                {!selectedPOsSameSupplier && selectedPOIds.size > 1 && " — select POs from the same supplier to combine into one Payment Request"}
              </span>
              {selectedPOsSameSupplier && (
                <Button size="sm" onClick={consolidatePOs} className="bg-chart-2 hover:bg-chart-2/90 text-white gap-2">
                  <Plus className="w-4 h-4" />
                  Create 1 Payment Request from {selectedPOs.length} POs
                </Button>
              )}
            </div>
          )}
          {availablePOs.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-muted-foreground">{new Set(availablePOsInView.map(po => po.supplier_name || "Unknown Supplier")).size} supplier{new Set(availablePOsInView.map(po => po.supplier_name || "Unknown Supplier")).size !== 1 ? "s" : ""}</p>
                <Select value={poPrFilter} onValueChange={setPoPrFilter}>
                  <SelectTrigger className="h-8 w-44 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All POs</SelectItem>
                    <SelectItem value="created">PR Created</SelectItem>
                    <SelectItem value="not_created">PR Not Created</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => posGroupRef.current?.expandAll()} className="text-xs">
                  <ChevronDown className="w-3 h-3 mr-1" /> Expand All
                </Button>
                <Button size="sm" variant="outline" onClick={() => posGroupRef.current?.collapseAll()} className="text-xs">
                  <ChevronUp className="w-3 h-3 mr-1" /> Collapse All
                </Button>
              </div>
            </div>
          )}
          <SupplierGroupedPOs ref={posGroupRef} pos={availablePOsInView} onConvert={convertPOtoPaymentRequest} onCancel={cancelPurchaseOrder} poIdsWithRequest={poRefsWithRequests} selectedIds={selectedPOIds} onToggleSelect={togglePOSelect} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="cancelled-pos" className="space-y-3 mt-4">
          {cancelledPOs.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted-foreground">{cancelledPOs.length} cancelled purchase order{cancelledPOs.length !== 1 ? "s" : ""}</p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => cancelledPosGroupRef.current?.expandAll()} className="text-xs"><ChevronDown className="w-3 h-3 mr-1" /> Expand All</Button>
                <Button size="sm" variant="outline" onClick={() => cancelledPosGroupRef.current?.collapseAll()} className="text-xs"><ChevronUp className="w-3 h-3 mr-1" /> Collapse All</Button>
              </div>
            </div>
          )}
          <SupplierGroupedPOs ref={cancelledPosGroupRef} pos={cancelledPOs} readOnly />
        </TabsContent>

        {/* Pending */}
        <TabsContent value="pending" className="space-y-3 mt-4">
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
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : (
            <>
              {pendingInView.length > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-muted-foreground">{new Set(pendingInView.map(r => r.payee || "Unknown Supplier")).size} supplier{new Set(pendingInView.map(r => r.payee || "Unknown Supplier")).size !== 1 ? "s" : ""}</p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => pendingGroupRef.current?.expandAll()} className="text-xs">
                      <ChevronDown className="w-3 h-3 mr-1" /> Expand All
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => pendingGroupRef.current?.collapseAll()} className="text-xs">
                      <ChevronUp className="w-3 h-3 mr-1" /> Collapse All
                    </Button>
                  </div>
                </div>
              )}
              <SupplierGroupedRequests ref={pendingGroupRef} requests={pendingInView} renderPRRow={renderPRRow} isAdmin={isAdmin} emptyLabel="No pending requests" />
            </>
          )}
        </TabsContent>

        {/* Approved */}
        <TabsContent value="approved" className="space-y-3 mt-4">
          {(isAdmin || isDisbursementRole) && selectedApproved.length > 0 && (
            <div className="flex items-center justify-between bg-chart-2/10 border border-chart-2/20 rounded-xl px-4 py-2.5">
              <span className="text-sm text-chart-2">
                {selectedApproved.length} approved request{selectedApproved.length !== 1 ? "s" : ""} selected
                {!selectedApprovedSamePayee && " — select requests from the same supplier to combine into one check"}
              </span>
              {selectedApprovedSamePayee && (
                <Button size="sm" onClick={() => setShowBulkDisburse(true)} className="bg-chart-2 hover:bg-chart-2/90 text-white gap-2">
                  <Banknote className="w-4 h-4" />
                  Disburse {selectedApproved.length} as One Check
                </Button>
              )}
            </div>
          )}
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : (
            <>
              {approvedInView.length > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-muted-foreground">{new Set(approvedInView.map(r => r.payee || "Unknown Supplier")).size} supplier{new Set(approvedInView.map(r => r.payee || "Unknown Supplier")).size !== 1 ? "s" : ""}</p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => approvedGroupRef.current?.expandAll()} className="text-xs">
                      <ChevronDown className="w-3 h-3 mr-1" /> Expand All
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => approvedGroupRef.current?.collapseAll()} className="text-xs">
                      <ChevronUp className="w-3 h-3 mr-1" /> Collapse All
                    </Button>
                  </div>
                </div>
              )}
              <SupplierGroupedRequests ref={approvedGroupRef} requests={approvedInView} renderPRRow={renderPRRow} isAdmin={isAdmin || isDisbursementRole} emptyLabel="No approved requests" />
            </>
          )}
        </TabsContent>

        {/* Paid */}
        <TabsContent value="paid" className="space-y-3 mt-4">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : (
            <>
              {paidInView.length > 0 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-muted-foreground">{new Set(paidInView.map(r => r.payee || "Unknown Supplier")).size} supplier{new Set(paidInView.map(r => r.payee || "Unknown Supplier")).size !== 1 ? "s" : ""}</p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => paidGroupRef.current?.expandAll()} className="text-xs">
                      <ChevronDown className="w-3 h-3 mr-1" /> Expand All
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => paidGroupRef.current?.collapseAll()} className="text-xs">
                      <ChevronUp className="w-3 h-3 mr-1" /> Collapse All
                    </Button>
                  </div>
                </div>
              )}
              <SupplierGroupedRequests ref={paidGroupRef} requests={paidInView} renderPRRow={renderPRRow} isAdmin={isAdmin} emptyLabel="No paid requests" />
            </>
          )}
        </TabsContent>

        {(isAdmin || isDisbursementRole) && (
          <TabsContent value="checks" className="mt-4">
            <CheckWriterWorkspace />
          </TabsContent>
        )}
      </Tabs>

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
          paymentRequest={reviewPR}
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
      <BulkDisburseDialog
        open={showBulkDisburse}
        onOpenChange={setShowBulkDisburse}
        requests={selectedApproved}
        onConfirm={bulkDisburseSelected}
      />
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