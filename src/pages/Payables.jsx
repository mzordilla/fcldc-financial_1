import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, differenceInDays, addDays } from "date-fns";
import { Plus, Trash2, CheckCircle, CreditCard, FileUp, Download, Package, Banknote, ChevronDown, ChevronUp } from "lucide-react";

import { exportToExcel, parseExcelFile, downloadTemplate } from "@/utils/excelUtils";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import AddFormDialog from "../components/shared/AddFormDialog";
import MarkPayableAsPaidDialog from "../components/payables/MarkPayableAsPaidDialog";

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

const fields = [
  { name: "supplier_name", label: "Supplier Name", required: true, placeholder: "e.g. SteelCo Supplies" },
  { name: "description", label: "Description", placeholder: "e.g. Rebar delivery for Tower project" },
  { name: "invoice_number", label: "Invoice #", placeholder: "SUP-INV-001" },
  { name: "amount", label: "Total Amount (₱)", type: "number", required: true, placeholder: "0.00" },
  { name: "amount_paid", label: "Amount Paid (₱)", type: "number", placeholder: "0.00" },
  { name: "due_date", label: "Due Date", type: "date", required: true },
  { name: "project_name", label: "Project Name", placeholder: "e.g. Main Street Tower" },
  { name: "category", label: "Category", type: "select", options: [
    { value: "materials", label: "Materials" },
    { value: "equipment", label: "Equipment" },
    { value: "subcontractor", label: "Subcontractor" },
    { value: "services", label: "Services" },
    { value: "utilities", label: "Utilities" },
    { value: "other", label: "Other" },
  ]},
  { name: "status", label: "Status", type: "select", options: [
    { value: "unpaid", label: "Unpaid" },
    { value: "partially_paid", label: "Partially Paid" },
    { value: "paid", label: "Paid" },
    { value: "overdue", label: "Overdue" },
  ]},
];

export default function Payables() {
  const [showAdd, setShowAdd] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showReceivingItems, setShowReceivingItems] = useState(true);
  const [showPaymentRequests, setShowPaymentRequests] = useState(true);
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

  const { data: receivingItems = [] } = useQuery({
    queryKey: ["receiving_items_for_payables"],
    queryFn: () => base44.entities.ReceivingItem.list("-received_date", 200),
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
  const linkedRIIds = new Set(payables.flatMap(p => {
    if (!p.notes) return [];
    const m = p.notes.match(/RI:(\S+)/);
    return m ? [m[1]] : [];
  }));
  const linkedPRIds = new Set(payables.flatMap(p => {
    if (!p.notes) return [];
    const m = p.notes.match(/PR:(\S+)/);
    return m ? [m[1]] : [];
  }));

  // Also deduplicate by matching supplier + amount + invoice_number against existing payables (any status including paid)
  const existingPayableKeys = new Set(payables.map(p =>
    `${(p.supplier_name || "").toLowerCase().trim()}|${p.amount}|${(p.invoice_number || "").toLowerCase().trim()}`
  ));

  const riKey = (ri) =>
    `${(ri.supplier_name || "").toLowerCase().trim()}|${ri.total_amount}|${(ri.po_number || "").toLowerCase().trim()}`;

  const prKey = (pr) =>
    `${(pr.payee || "").toLowerCase().trim()}|${pr.amount}|${(pr.invoice_number || pr.request_number || "").toLowerCase().trim()}`;

  const pendingRIs = receivingItems.filter(ri =>
    !linkedRIIds.has(ri.id) && !existingPayableKeys.has(riKey(ri))
  );
  const pendingPRs = paymentRequests.filter(pr =>
    !linkedPRIds.has(pr.id) && !existingPayableKeys.has(prKey(pr))
  );

  const createFromRI = async (ri) => {
    const due = format(addDays(new Date(ri.received_date), 30), "yyyy-MM-dd");
    await createMutation.mutateAsync({
      supplier_name: ri.supplier_name,
      description: `Delivery from ${ri.supplier_name}${ri.po_number ? ` · PO: ${ri.po_number}` : ""}`,
      invoice_number: ri.po_number || "",
      po_id: ri.po_id || "",
      po_number: ri.po_number || "",
      amount: ri.total_amount || 0,
      amount_paid: 0,
      due_date: due,
      project_name: ri.project_name || "",
      category: "materials",
      status: "unpaid",
      notes: `RI:${ri.id}`,
    });
  };

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

  const filtered = statusFilter === "all" ? payables : payables.filter(p => p.status === statusFilter);

  const totalUnpaid = payables.filter(p => p.status !== "paid").reduce((s, p) => s + ((p.amount || 0) - (p.amount_paid || 0)), 0);
  const overdueCount = payables.filter(p => p.status === "overdue").length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Payables</h1>
          <p className="text-muted-foreground mt-1">
            ₱{totalUnpaid.toLocaleString()} outstanding · {overdueCount} overdue
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="partially_paid">Partially Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => handleExport(payables)}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => importRef.current.click()}>
            <FileUp className="w-4 h-4 mr-2" /> Import
          </Button>
          <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Payable
          </Button>
        </div>
      </div>

      <AgingSummary items={payables} />

      {/* From Receiving Items */}
      {pendingRIs.length > 0 && (
        <div className="rounded-2xl border border-border overflow-hidden bg-card">
          <button
            className="w-full flex items-center justify-between px-5 py-3 bg-muted/50 hover:bg-muted/70 transition-colors"
            onClick={() => setShowReceivingItems(v => !v)}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">From Receiving Items</span>
              <span className="text-xs bg-chart-3/10 text-chart-3 border border-chart-3/20 px-2 py-0.5 rounded-full">{pendingRIs.length} pending</span>
            </div>
            {showReceivingItems ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showReceivingItems && (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-y border-border">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Supplier</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Project</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">PO #</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Received</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pendingRIs.map(ri => (
                  <tr key={ri.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-foreground text-xs">{ri.supplier_name}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{ri.project_name || "—"}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{ri.po_number || "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{ri.received_date ? format(new Date(ri.received_date), "MMM d, yyyy") : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold text-foreground">₱{(ri.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Button size="sm" variant="outline" onClick={() => createFromRI(ri)} className="text-primary hover:text-primary text-xs">
                        <Plus className="w-3 h-3 mr-1" /> Add Payable
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* From Approved Payment Requests */}
      {pendingPRs.length > 0 && (
        <div className="rounded-2xl border border-border overflow-hidden bg-card">
          <button
            className="w-full flex items-center justify-between px-5 py-3 bg-muted/50 hover:bg-muted/70 transition-colors"
            onClick={() => setShowPaymentRequests(v => !v)}
          >
            <div className="flex items-center gap-2">
              <Banknote className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-foreground">From Approved Payment Requests</span>
              <span className="text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">{pendingPRs.length} pending</span>
            </div>
            {showPaymentRequests ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showPaymentRequests && (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-y border-border">
                <tr>
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
                  <tr key={pr.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{pr.request_number || "—"}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground text-xs">{pr.payee}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-[200px] truncate">{pr.description}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{pr.project_allocations?.[0]?.project_name || "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{pr.due_date ? format(new Date(pr.due_date), "MMM d, yyyy") : "—"}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold text-foreground">₱{(pr.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Button size="sm" variant="outline" onClick={() => createFromPR(pr)} className="text-primary hover:text-primary text-xs">
                        <Plus className="w-3 h-3 mr-1" /> Add Payable
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <div className="grid gap-4">
        {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
        {!isLoading && filtered.length === 0 && <p className="text-center py-12 text-muted-foreground">No payables yet</p>}
        {filtered.map((p) => {
          const remaining = (p.amount || 0) - (p.amount_paid || 0);
          const paidPct = p.amount ? Math.min(((p.amount_paid || 0) / p.amount) * 100, 100) : 0;
          const aging = getAgingBucket(p.due_date, p.status);
          return (
            <div key={p.id} className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h3 className="font-semibold text-foreground">{p.supplier_name}</h3>
                    {p.po_number && <Badge variant="secondary" className="text-xs">PO: {p.po_number}</Badge>}
                    <Badge variant="outline" className={`text-xs ${statusStyles[p.status] || ""}`}>
                      {(p.status || "unpaid").replace(/_/g, " ")}
                    </Badge>
                    {p.category && <Badge variant="secondary" className="text-xs">{p.category}</Badge>}
                    {aging && <Badge variant="outline" className={`text-xs ${aging.style}`}>{aging.label}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {p.description || ""}
                    {p.invoice_number ? ` · ${p.invoice_number}` : ""}
                    {p.project_name ? ` · ${p.project_name}` : ""}
                    {p.due_date && ` · Due ${format(new Date(p.due_date), "MMM d, yyyy")}`}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <Progress value={paidPct} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      ₱{(p.amount_paid || 0).toLocaleString()} / ₱{(p.amount || 0).toLocaleString()}
                    </span>
                  </div>
                  {/* Payment History Breakdown */}
                  {(p.payment_history || []).length > 0 && (
                    <div className="mt-3 rounded-lg border border-border divide-y divide-border text-xs">
                      {(p.payment_history || []).map((h, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-1.5">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <CreditCard className="w-3 h-3" />
                            <span className="capitalize">{(h.payment_method || "").replace(/_/g, " ")}</span>
                            {h.reference && <span>· {h.reference}</span>}
                            {h.payment_date && <span>· {format(new Date(h.payment_date), "MMM d, yyyy")}</span>}
                            {h.notes && <span className="italic">· {h.notes}</span>}
                          </div>
                          <span className="font-semibold text-primary">₱{(h.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                  <p className={`text-lg font-bold ${p.status === "paid" ? "text-primary" : "text-destructive"}`}>
                    {p.status === "paid" ? "PAID" : `₱${remaining.toLocaleString()}`}
                  </p>
                  <div className="flex gap-1">
                    {p.status !== "paid" && (
                      <Button variant="ghost" size="icon" onClick={() => setMarkingPaid(p)} className="text-primary hover:text-primary" title="Record Payment">
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                    {p.status === "paid" && (p.payment_history || []).length > 0 && (
                      <Button variant="ghost" size="icon" onClick={() => setMarkingPaid(p)} className="text-muted-foreground hover:text-primary" title="View Payments">
                        <CreditCard className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AddFormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title="Add Payable"
        fields={fields}
        onSubmit={(data) => createMutation.mutateAsync(data)}
      />
      <MarkPayableAsPaidDialog
        open={!!markingPaid}
        onOpenChange={(v) => { if (!v) setMarkingPaid(null); }}
        payable={markingPaid}
        onConfirm={(paymentData) => markPaid(markingPaid, paymentData)}
      />
    </div>
  );
}