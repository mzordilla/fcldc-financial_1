import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, differenceInDays, addDays } from "date-fns";
import { Plus, Trash2, CheckCircle, CreditCard, FileUp, Download, Banknote, ChevronDown, ChevronUp, CheckSquare, Square, Loader2, History } from "lucide-react";

import { exportToExcel, parseExcelFile, downloadTemplate } from "@/utils/excelUtils";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import MarkPayableAsPaidDialog from "../components/payables/MarkPayableAsPaidDialog";
import PayableCard from "../components/payables/PayableCard";

function getAgingBucket(dueDateStr, status) {
  if (status === "paid") return null;
  if (!dueDateStr) return null;
  const days = differenceInDays(new Date(), new Date(dueDateStr));
  if (days <= 0) return { label: "Current", style: "bg-primary/10 text-primary" };
  if (days <= 30) return { label: "1–30 days", style: "bg-chart-3/10 text-chart-3" };
  if (days <= 60) return { label: "31–60 days", style: "bg-chart-3/20 text-chart-3" };
  if (days <= 90) return { label: "61–90 days", style: "bg-destructive/10 text-destructive" };
  return { label: "90+ days", style: "bg-destructive/20 text-destructive font-semibold" };
}

function AgingSummary({ items }) {
  const today = new Date();
  const buckets = [
    { label: "Current", range: "Not yet due", amount: 0 },
    { label: "1–30 days", range: "Overdue", amount: 0 },
    { label: "31–60 days", range: "Overdue", amount: 0 },
    { label: "61–90 days", range: "Overdue", amount: 0 },
    { label: "90+ days", range: "Critical", amount: 0 },
  ];
  items.filter(p => p.status !== "paid").forEach(p => {
    if (!p.due_date) return;
    const days = differenceInDays(today, new Date(p.due_date));
    const rem = (p.amount || 0) - (p.amount_paid || 0);
    if (days <= 0) buckets[0].amount += rem;
    else if (days <= 30) buckets[1].amount += rem;
    else if (days <= 60) buckets[2].amount += rem;
    else if (days <= 90) buckets[3].amount += rem;
    else buckets[4].amount += rem;
  });
  const colors = ["bg-primary", "bg-chart-3", "bg-orange-400", "bg-destructive/70", "bg-destructive"];
  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Aging Analysis</h3>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {buckets.map((b, i) => (
          <div key={b.label} className="text-center">
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

const statusStyles = {
  unpaid: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  partially_paid: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  paid: "bg-primary/10 text-primary border-primary/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function Payables() {
  const [markingPaid, setMarkingPaid] = useState(null);
  const [showPaymentRequests, setShowPaymentRequests] = useState(true);
  const [showPaid, setShowPaid] = useState(false);
  const [selectedPRs, setSelectedPRs] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [removingDupes, setRemovingDupes] = useState(false);
  const [groupBySupplier, setGroupBySupplier] = useState(true);
  const queryClient = useQueryClient();
  const importRef = useRef();

  const handleExport = (data) => {
    exportToExcel(data.map(p => ({
      supplier_name: p.supplier_name, description: p.description, invoice_number: p.invoice_number,
      amount: p.amount, amount_paid: p.amount_paid, due_date: p.due_date,
      project_name: p.project_name, category: p.category, status: p.status,
      payment_method: p.payment_method, payment_date: p.payment_date,
      payment_reference: p.payment_reference, notes: p.notes,
    })), "payables.xlsx", "Payables");
  };

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

  const { data: payables = [], isLoading } = useQuery({
    queryKey: ["payables"],
    queryFn: () => base44.entities.Payable.list("-due_date", 200),
  });

  const { data: paymentRequests = [] } = useQuery({
    queryKey: ["payment_requests_for_payables"],
    queryFn: () => base44.entities.PaymentRequest.filter({ approval_status: "approved" }, "-created_date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Payable.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payables"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Payable.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payables"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Payable.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payables"] }),
  });

  const markPaid = (p, paymentData) => updateMutation.mutate({ id: p.id, data: paymentData });

  // IDs already linked via notes tag
  const linkedPRIds = new Set(payables.flatMap(p => {
    if (!p.notes) return [];
    const m = p.notes.match(/PR:(\S+)/);
    return m ? [m[1]] : [];
  }));

  // Also deduplicate by matching supplier + amount + invoice_number against existing payables (any status including paid)
  const existingPayableKeys = new Set(payables.map(p =>
    `${(p.supplier_name || "").toLowerCase().trim()}|${p.amount}|${(p.invoice_number || "").toLowerCase().trim()}`
  ));

  const prKey = (pr) =>
    `${(pr.payee || "").toLowerCase().trim()}|${pr.amount}|${(pr.invoice_number || pr.request_number || "").toLowerCase().trim()}`;

  const pendingPRs = paymentRequests.filter(pr =>
    !linkedPRIds.has(pr.id) && !existingPayableKeys.has(prKey(pr))
  );

  const createFromPR = async (pr) => {
    await createMutation.mutateAsync({
      supplier_name: pr.payee,
      description: pr.description,
      invoice_number: pr.invoice_number || pr.request_number || "",
      amount: pr.amount || 0,
      amount_paid: 0,
      due_date: pr.due_date || format(addDays(new Date(), 30), "yyyy-MM-dd"),
      project_name: pr.project_allocations?.[0]?.project_name || "",
      category: pr.project_allocations?.[0]?.category || pr.category || "other",
      status: "unpaid",
      notes: `PR:${pr.id}`,
    });
  };

  // Bulk approve selected PRs
  const bulkApprovePRs = async () => {
    setBulkLoading(true);
    await Promise.all([...selectedPRs].map(id => {
      const pr = pendingPRs.find(r => r.id === id);
      return pr ? createFromPR(pr) : Promise.resolve();
    }));
    setSelectedPRs(new Set());
    setBulkLoading(false);
  };

  // Remove duplicate payables — keep the one with the latest created_date per key
  const removeDuplicatePayables = async () => {
    setRemovingDupes(true);
    const seen = {};
    const toDelete = [];
    // Sort newest first so we keep the latest
    const sorted = [...payables].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    sorted.forEach(p => {
      const key = `${(p.supplier_name || "").toLowerCase().trim()}|${p.amount}|${(p.invoice_number || "").toLowerCase().trim()}`;
      if (seen[key]) {
        toDelete.push(p.id);
      } else {
        seen[key] = true;
      }
    });
    await Promise.all(toDelete.map(id => deleteMutation.mutateAsync(id)));
    setRemovingDupes(false);
  };

  // Detect duplicate payable entries: same supplier + amount + invoice_number
  const payableKeyCount = {};
  payables.forEach(p => {
    const key = `${(p.supplier_name || "").toLowerCase().trim()}|${p.amount}|${(p.invoice_number || "").toLowerCase().trim()}`;
    payableKeyCount[key] = (payableKeyCount[key] || 0) + 1;
  });
  const isDuplicatePayable = (p) => {
    const key = `${(p.supplier_name || "").toLowerCase().trim()}|${p.amount}|${(p.invoice_number || "").toLowerCase().trim()}`;
    return payableKeyCount[key] > 1;
  };
  // Count how many payables are duplicates (extras beyond the first)
  const duplicatePayablesCount = Object.values(payableKeyCount).reduce((sum, cnt) => sum + (cnt > 1 ? cnt - 1 : 0), 0);

  const unpaidPayables = payables.filter(p => p.status !== "paid");
  const paidPayables = payables.filter(p => p.status === "paid");

  const totalUnpaid = unpaidPayables.reduce((s, p) => s + ((p.amount || 0) - (p.amount_paid || 0)), 0);
  const overdueCount = payables.filter(p => p.status === "overdue").length;

  // Group unpaid payables by supplier
  const groupedBySupplier = unpaidPayables.reduce((acc, p) => {
    const supplier = p.supplier_name || "Unknown Supplier";
    if (!acc[supplier]) acc[supplier] = [];
    acc[supplier].push(p);
    return acc;
  }, {});

  // Calculate aging per supplier
  const supplierAging = Object.entries(groupedBySupplier).map(([supplier, items]) => {
    const buckets = { current: 0, days30: 0, days60: 0, days90: 0, days90plus: 0 };
    items.forEach(p => {
      if (!p.due_date) return;
      const days = differenceInDays(new Date(), new Date(p.due_date));
      const rem = (p.amount || 0) - (p.amount_paid || 0);
      if (days <= 0) buckets.current += rem;
      else if (days <= 30) buckets.days30 += rem;
      else if (days <= 60) buckets.days60 += rem;
      else if (days <= 90) buckets.days90 += rem;
      else buckets.days90plus += rem;
    });
    return { supplier, items, buckets, total: Object.values(buckets).reduce((a, b) => a + b, 0) };
  }).sort((a, b) => b.total - a.total);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Payables</h1>
          <p className="text-muted-foreground mt-1">
            ₱{totalUnpaid.toLocaleString()} outstanding · {overdueCount} overdue
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {duplicatePayablesCount > 0 && (
            <Button variant="outline" size="sm" onClick={removeDuplicatePayables} disabled={removingDupes} className="text-destructive border-destructive/30 hover:bg-destructive/10">
              {removingDupes ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Remove {duplicatePayablesCount} Duplicate{duplicatePayablesCount > 1 ? "s" : ""}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setGroupBySupplier(!groupBySupplier)}>
            {groupBySupplier ? "Ungroup" : "Group by Supplier"}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport(payables)}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => importRef.current.click()}>
            <FileUp className="w-4 h-4 mr-2" /> Import
          </Button>
          <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
        </div>
      </div>

      <AgingSummary items={payables} />

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

      {/* Unpaid / Outstanding - Grouped by Supplier */}
      {groupBySupplier ? (
        <div className="space-y-6">
          {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
          {!isLoading && supplierAging.length === 0 && <p className="text-center py-12 text-muted-foreground">No outstanding payables</p>}
          {supplierAging.map(({ supplier, items, buckets, total }) => (
            <div key={supplier} className="rounded-2xl border border-border overflow-hidden bg-card">
              <div className="px-5 py-3 bg-muted/50 border-b border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{supplier}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{items.length} invoice{items.length > 1 ? "s" : ""} · ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })} outstanding</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-muted-foreground">Current:</span>
                      <span className="font-semibold text-primary">₱{buckets.current.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-muted-foreground">30:</span>
                      <span className="font-semibold text-chart-3">₱{buckets.days30.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-muted-foreground">60:</span>
                      <span className="font-semibold text-orange-500">₱{buckets.days60.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-muted-foreground">90:</span>
                      <span className="font-semibold text-destructive">₱{buckets.days90.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-muted-foreground">90+:</span>
                      <span className="font-semibold text-destructive">₱{buckets.days90plus.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 grid gap-3">
                {items.map((p) => <PayableCard key={p.id} p={p} isDuplicate={isDuplicatePayable(p)} onPay={setMarkingPaid} onDelete={(id) => deleteMutation.mutate(id)} />)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
          {!isLoading && unpaidPayables.length === 0 && <p className="text-center py-12 text-muted-foreground">No outstanding payables</p>}
          {unpaidPayables.map((p) => <PayableCard key={p.id} p={p} isDuplicate={isDuplicatePayable(p)} onPay={setMarkingPaid} onDelete={(id) => deleteMutation.mutate(id)} />)}
        </div>
      )}

      {/* Paid — collapsible */}
      {paidPayables.length > 0 && (
        <div className="rounded-2xl border border-border overflow-hidden bg-card">
          <button
            className="w-full flex items-center justify-between px-5 py-3 bg-muted/50 hover:bg-muted/70 transition-colors"
            onClick={() => setShowPaid(v => !v)}
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">Paid</span>
              <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">{paidPayables.length}</span>
            </div>
            {showPaid ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showPaid && (
            <div className="grid gap-4 p-4">
              {paidPayables.map((p) => <PayableCard key={p.id} p={p} isDuplicate={isDuplicatePayable(p)} onPay={setMarkingPaid} onDelete={(id) => deleteMutation.mutate(id)} />)}
            </div>
          )}
        </div>
      )}

      <MarkPayableAsPaidDialog
        open={!!markingPaid}
        onOpenChange={(v) => { if (!v) setMarkingPaid(null); }}
        payable={markingPaid}
        onConfirm={(paymentData) => markPaid(markingPaid, paymentData)}
      />
    </div>
  );
}