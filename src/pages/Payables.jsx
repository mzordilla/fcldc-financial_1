import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, addDays } from "date-fns";
import { Plus, Trash2, CheckCircle, FileUp, Download, Banknote, ChevronDown, ChevronUp, CheckSquare, Square, Loader2, History, FileText, Search } from "lucide-react";

import { exportToExcel, parseExcelFile } from "@/utils/excelUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PayableCard from "../components/payables/PayableCard";
import SupplierStatementDialog from "../components/payables/SupplierStatementDialog";
import SupplierInvoiceDetails from "../components/payables/SupplierInvoiceDetails";

function AgingSummary({ overall, overallTotal }) {
  const buckets = [
    { key: "current", label: "Current", amount: overall.current },
    { key: "days30", label: "1–30 days", amount: overall.days30 },
    { key: "days60", label: "31–60 days", amount: overall.days60 },
    { key: "days90", label: "61–90 days", amount: overall.days90 },
    { key: "days90plus", label: "90+ days", amount: overall.days90plus },
  ];
  const colors = ["bg-primary", "bg-chart-3", "bg-orange-400", "bg-destructive/70", "bg-destructive"];
  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">Aging Analysis</h3>
        <p className="text-xs text-muted-foreground">Total Outstanding: <span className="font-bold text-foreground">₱{overallTotal.toLocaleString()}</span></p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {buckets.map((b, i) => (
          <div key={b.key} className="text-center">
            <div className={`h-1.5 rounded-full ${colors[i]} mb-2 opacity-80`} />
            <p className="text-xs text-muted-foreground">{b.label}</p>
            <p className={`text-sm font-bold mt-0.5 ${i >= 2 && b.amount > 0 ? "text-destructive" : "text-foreground"}`}>
              ₱{b.amount.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Payables() {
  const [statementSupplier, setStatementSupplier] = useState(null);
  const [showPaymentRequests, setShowPaymentRequests] = useState(true);
  const [showPaid, setShowPaid] = useState(false);
  const [selectedPRs, setSelectedPRs] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [checkingDupes, setCheckingDupes] = useState(false);
  const [dupesResultMsg, setDupesResultMsg] = useState("");
  const [expandedSuppliers, setExpandedSuppliers] = useState(new Set());
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const queryClient = useQueryClient();
  const importRef = useRef();
  const expandedSuppliersRef = useRef(expandedSuppliers);

  useEffect(() => { expandedSuppliersRef.current = expandedSuppliers; }, [expandedSuppliers]);

  // Lightweight, server-computed summary: only aggregates load up-front
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["payablesAgingSummary"],
    queryFn: async () => (await base44.functions.invoke("payablesAgingSummary", {})).data,
  });

  const { data: paymentRequests = [] } = useQuery({
    queryKey: ["payment_requests_for_payables"],
    queryFn: () => base44.entities.PaymentRequest.list("-created_date", 1000),
  });

  const { data: paidPayables = [] } = useQuery({
    queryKey: ["payablesPaid"],
    queryFn: () => base44.entities.Payable.filter({ status: "paid" }, "-due_date", 1000),
    enabled: showPaid,
  });

  // Only fetched when there are approved payment requests to reconcile against existing payables
  const { data: payablesForLinkCheck = [] } = useQuery({
    queryKey: ["payablesLinkCheck"],
    queryFn: () => base44.entities.Payable.list("-created_date", 5000),
    enabled: paymentRequests.some((pr) => pr.approval_status === "approved"),
  });

  const { data: statementInvoices = [] } = useQuery({
    queryKey: ["payablesSupplier", statementSupplier],
    queryFn: () => base44.entities.Payable.filter({ supplier_name: statementSupplier }, "-due_date", 1000),
    enabled: !!statementSupplier,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["payablesAgingSummary"] });
    queryClient.invalidateQueries({ queryKey: ["payablesPaid"] });
    expandedSuppliersRef.current.forEach((s) => queryClient.invalidateQueries({ queryKey: ["payablesSupplier", s] }));
    if (statementSupplier) queryClient.invalidateQueries({ queryKey: ["payablesSupplier", statementSupplier] });
  };

  // Real-time: auto-refresh aging summary + open supplier details whenever any Payable changes
  useEffect(() => {
    const unsubscribe = base44.entities.Payable.subscribe(() => {
      invalidateAll();
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statementSupplier]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Payable.create(data),
    onSuccess: invalidateAll,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Payable.delete(id),
    onSuccess: invalidateAll,
  });

  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const rows = await parseExcelFile(file);
    const parsed = rows.map(r => ({
      supplier_name: String(r.supplier_name || r["Supplier Name"] || "").trim(),
      description: String(r.description || r.Description || "").trim(),
      invoice_number: String(r.invoice_number || r["Invoice #"] || "").trim(),
      amount: r.amount ? parseFloat(r.amount) : 0,
      amount_paid: r.amount_paid ? parseFloat(r.amount_paid) : 0,
      due_date: String(r.due_date || r["Due Date"] || "").trim(),
      project_name: String(r.project_name || r["Project Name"] || "").trim(),
      category: String(r.category || r.Category || "").toLowerCase().trim(),
      status: String(r.status || r.Status || "unpaid").toLowerCase().trim(),
    })).filter(r => r.supplier_name && r.amount);
    await Promise.all(parsed.map(r => createMutation.mutateAsync(r)));
    e.target.value = "";
  };

  const handleExport = async () => {
    setExporting(true);
    const all = await base44.entities.Payable.list("-due_date", 5000);
    exportToExcel(all.map(p => ({
      supplier_name: p.supplier_name, description: p.description, invoice_number: p.invoice_number,
      amount: p.amount, amount_paid: p.amount_paid, due_date: p.due_date,
      project_name: p.project_name, category: p.category, status: p.status,
      payment_method: p.payment_method, payment_date: p.payment_date,
      payment_reference: p.payment_reference, notes: p.notes,
    })), "payables.xlsx", "Payables");
    setExporting(false);
  };

  const checkAndRemoveDuplicates = async () => {
    setCheckingDupes(true);
    setDupesResultMsg("");
    const all = await base44.entities.Payable.list("-created_date", 5000);
    const seen = {};
    const toDelete = [];
    [...all].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).forEach((p) => {
      const key = `${(p.supplier_name || "").toLowerCase().trim()}|${p.amount}|${(p.invoice_number || "").toLowerCase().trim()}`;
      if (seen[key]) toDelete.push(p.id);
      else seen[key] = true;
    });
    if (toDelete.length) await Promise.all(toDelete.map((id) => deleteMutation.mutateAsync(id)));
    setDupesResultMsg(toDelete.length ? `Removed ${toDelete.length} duplicate${toDelete.length > 1 ? "s" : ""}` : "No duplicates found");
    setCheckingDupes(false);
  };

  const createFromPR = async (pr) => {
    await createMutation.mutateAsync({
      supplier_name: pr.payee,
      description: pr.description,
      invoice_number: pr.invoice_number || pr.request_number || "",
      amount: pr.amount || 0,
      withholding_tax_percentage: pr.withholding_tax_percentage || 0,
      withholding_tax_amount: pr.withholding_tax_amount || 0,
      vat_percentage: pr.vat_percentage || 0,
      vat_amount: pr.vat_amount || 0,
      amount_paid: 0,
      due_date: pr.due_date || format(addDays(new Date(), 30), "yyyy-MM-dd"),
      project_name: pr.project_allocations?.[0]?.project_name || "",
      category: pr.project_allocations?.[0]?.category || pr.category || "other",
      status: "unpaid",
      notes: `PR:${pr.id}`,
    });
  };

  const bulkApprovePRs = async () => {
    setBulkLoading(true);
    await Promise.all([...selectedPRs].map((id) => {
      const pr = pendingPRs.find((r) => r.id === id);
      return pr ? createFromPR(pr) : Promise.resolve();
    }));
    setSelectedPRs(new Set());
    setBulkLoading(false);
  };

  const approvedPRs = paymentRequests.filter((pr) => pr.approval_status === "approved");

  const linkedPRIds = new Set(payablesForLinkCheck.flatMap(p => {
    if (!p.notes) return [];
    const m = p.notes.match(/PR:(\S+)/);
    return m ? [m[1]] : [];
  }));
  const existingPayableKeys = new Set(payablesForLinkCheck.map(p =>
    `${(p.supplier_name || "").toLowerCase().trim()}|${p.amount}|${(p.invoice_number || "").toLowerCase().trim()}`
  ));
  const prKey = (pr) =>
    `${(pr.payee || "").toLowerCase().trim()}|${pr.amount}|${(pr.invoice_number || pr.request_number || "").toLowerCase().trim()}`;

  const pendingPRs = approvedPRs.filter(pr =>
    !linkedPRIds.has(pr.id) && !existingPayableKeys.has(prKey(pr))
  );

  const overall = summary?.overall || { current: 0, days30: 0, days60: 0, days90: 0, days90plus: 0 };
  const overallTotal = summary?.overallTotal || 0;
  const overdueCount = summary?.overdueCount || 0;
  const allSuppliers = summary?.suppliers || [];

  const searchTerm = search.trim().toLowerCase();
  const supplierList = (searchTerm
    ? allSuppliers.filter((s) => s.supplier.toLowerCase().includes(searchTerm))
    : allSuppliers
  ).slice().sort((a, b) => a.supplier.localeCompare(b.supplier));

  const toggleSupplier = (supplier) => {
    setExpandedSuppliers((prev) => {
      const next = new Set(prev);
      next.has(supplier) ? next.delete(supplier) : next.add(supplier);
      return next;
    });
  };

  const expandAllSuppliers = () => setExpandedSuppliers(new Set(allSuppliers.map((s) => s.supplier)));
  const collapseAllSuppliers = () => setExpandedSuppliers(new Set());

  const handleDeleteInvoice = (id, supplier) => {
    deleteMutation.mutate(id);
    queryClient.invalidateQueries({ queryKey: ["payablesSupplier", supplier] });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Payables</h1>
          <p className="text-muted-foreground mt-1">
            ₱{overallTotal.toLocaleString()} outstanding · {overdueCount} overdue
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={checkAndRemoveDuplicates} disabled={checkingDupes}>
            {checkingDupes ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Check Duplicates
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => importRef.current.click()}>
            <FileUp className="w-4 h-4 mr-2" /> Import
          </Button>
          <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
        </div>
      </div>

      {dupesResultMsg && <p className="text-xs text-muted-foreground">{dupesResultMsg}</p>}

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          placeholder="Search by supplier..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {summaryLoading ? (
        <p className="text-center py-12 text-muted-foreground">Loading aging summary...</p>
      ) : (
        <AgingSummary overall={overall} overallTotal={overallTotal} />
      )}

      {/* From Approved Payment Requests */}
      {pendingPRs.length > 0 && (
        <div className="rounded-2xl border border-border overflow-hidden bg-card">
          <div className="w-full flex items-center justify-between px-5 py-3 bg-muted/50">
            <button className="flex items-center gap-2 flex-1" onClick={() => setShowPaymentRequests(v => !v)}>
              <Banknote className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">From Approved Payment Requests</span>
              <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">{pendingPRs.length} pending</span>
              {showPaymentRequests ? <ChevronUp className="w-4 h-4 text-muted-foreground ml-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground ml-1" />}
            </button>
            {showPaymentRequests && (
              <div className="flex items-center gap-2">
                <button
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setSelectedPRs(selectedPRs.size === pendingPRs.length ? new Set() : new Set(pendingPRs.map(r => r.id)))}
                >
                  {selectedPRs.size === pendingPRs.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  {selectedPRs.size === pendingPRs.length ? "Deselect All" : "Select All"}
                </button>
                {selectedPRs.size > 0 && (
                  <Button size="sm" onClick={bulkApprovePRs} disabled={bulkLoading} className="text-xs">
                    {bulkLoading ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                    Add {selectedPRs.size} as Payable{selectedPRs.size > 1 ? "s" : ""}
                  </Button>
                )}
              </div>
            )}
          </div>
          {showPaymentRequests && (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-y border-border">
                <tr>
                  <th className="px-4 py-2 w-8"></th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">PR #</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payee</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Project</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Due</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pendingPRs.map(pr => (
                  <tr key={pr.id} className={`hover:bg-muted/20 transition-colors ${selectedPRs.has(pr.id) ? "bg-primary/5" : ""}`}>
                    <td className="px-4 py-2.5">
                      <button onClick={() => setSelectedPRs(prev => { const s = new Set(prev); s.has(pr.id) ? s.delete(pr.id) : s.add(pr.id); return s; })}>
                        {selectedPRs.has(pr.id) ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4 text-muted-foreground" />}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{pr.request_number || "—"}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground text-xs">{pr.payee}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">{pr.description}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{pr.project_allocations?.[0]?.project_name || "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{pr.due_date ? format(new Date(pr.due_date), "MMM d, yyyy") : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold text-foreground">₱{(pr.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Button size="sm" variant="outline" onClick={() => createFromPR(pr)} disabled={bulkLoading} className="text-primary hover:text-primary text-xs">
                        <Plus className="w-3 h-3 mr-1" /> Add
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Supplier Aging Summary — invoice details load only when a supplier row is expanded */}
      <div className="space-y-6">
        {summaryLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
        {!summaryLoading && supplierList.length === 0 && <p className="text-center py-12 text-muted-foreground">No outstanding payables</p>}
        {supplierList.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">{supplierList.length} supplier{supplierList.length !== 1 ? "s" : ""}</p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={expandAllSuppliers} className="text-xs">
                <ChevronDown className="w-3 h-3 mr-1" /> Expand All
              </Button>
              <Button size="sm" variant="outline" onClick={collapseAllSuppliers} className="text-xs">
                <ChevronUp className="w-3 h-3 mr-1" /> Collapse All
              </Button>
            </div>
          </div>
        )}
        {supplierList.length > 0 && (
          <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1fr_auto] gap-0 px-5 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <span>Supplier</span>
            <span className="text-right">Current</span>
            <span className="text-right">1-30</span>
            <span className="text-right">31-60</span>
            <span className="text-right">61-90</span>
            <span className="text-right">90+</span>
            <span></span>
          </div>
        )}
        <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
        {supplierList.map(({ supplier, count, buckets, total }) => {
          const isExpanded = expandedSuppliers.has(supplier);
          return (
            <div key={supplier} className="bg-card">
              <button
                className="w-full px-5 py-3 bg-muted/50 hover:bg-muted/70 transition-colors"
                onClick={() => toggleSupplier(supplier)}
              >
                <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1fr_auto] gap-0 items-center">
                  <div className="flex items-center gap-2 text-left min-w-0">
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${isExpanded ? "" : "-rotate-90"}`} />
                    <div className="min-w-0">
                      <h3 className="text-base font-semibold text-foreground truncate">{supplier}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{count} invoice{count > 1 ? "s" : ""} · ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })} outstanding</p>
                    </div>
                  </div>
                  <span className="text-right text-xs font-semibold text-primary">₱{buckets.current.toLocaleString()}</span>
                  <span className="text-right text-xs font-semibold text-chart-3">₱{buckets.days30.toLocaleString()}</span>
                  <span className="text-right text-xs font-semibold text-orange-500">₱{buckets.days60.toLocaleString()}</span>
                  <span className="text-right text-xs font-semibold text-destructive">₱{buckets.days90.toLocaleString()}</span>
                  <span className="text-right text-xs font-semibold text-destructive">₱{buckets.days90plus.toLocaleString()}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs ml-3"
                    onClick={e => { e.stopPropagation(); setStatementSupplier(supplier); }}
                  >
                    <FileText className="w-3 h-3 mr-1" /> Statement
                  </Button>
                </div>
              </button>
              <SupplierInvoiceDetails supplier={supplier} isExpanded={isExpanded} onDelete={handleDeleteInvoice} />
            </div>
          );
        })}
        </div>
      </div>

      {/* Paid — collapsible, fetched only when opened */}
      <div className="rounded-2xl border border-border overflow-hidden bg-card">
        <button
          className="w-full flex items-center justify-between px-5 py-3 bg-muted/50 hover:bg-muted/70 transition-colors"
          onClick={() => setShowPaid(v => !v)}
        >
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">Paid</span>
            {showPaid && <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">{paidPayables.length}</span>}
          </div>
          {showPaid ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {showPaid && (
          <div className="grid gap-4 p-4">
            {paidPayables.length === 0 && <p className="text-center py-4 text-muted-foreground text-sm">No paid invoices</p>}
            {paidPayables.map((p) => <PayableCard key={p.id} p={p} isDuplicate={false} onPay={() => {}} onDelete={(id) => handleDeleteInvoice(id, p.supplier_name)} />)}
          </div>
        )}
      </div>

      <SupplierStatementDialog
        open={!!statementSupplier}
        onOpenChange={(v) => { if (!v) setStatementSupplier(null); }}
        supplier={statementSupplier}
        payables={statementInvoices}
      />
    </div>
  );
}