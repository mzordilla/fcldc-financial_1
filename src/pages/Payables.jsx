import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, differenceInDays } from "date-fns";
import { Plus, Trash2, CheckCircle, CreditCard, FileUp, Download, Layers, ChevronDown } from "lucide-react";

import { exportToExcel, parseExcelFile, downloadTemplate } from "@/utils/excelUtils";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import AddFormDialog from "../components/shared/AddFormDialog";
import MarkPayableAsPaidDialog from "../components/payables/MarkPayableAsPaidDialog";
import BillsPaymentSheet from "../components/payables/BillsPaymentSheet";
import PaymentRequestFormDialog from "../components/payment/PaymentRequestFormDialog";

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
  const [showBillsPayment, setShowBillsPayment] = useState(false);
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
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
    queryFn: () => base44.entities.Payable.list("-due_date", 100),
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" /> New <ChevronDown className="w-3.5 h-3.5 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowAdd(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Payable
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowNewRequest(true)}>
                <CreditCard className="w-4 h-4 mr-2" /> New Payment Request
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShowBillsPayment(true)}>
                <Layers className="w-4 h-4 mr-2" /> Bills Payment
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AgingSummary items={payables} />

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
      <BillsPaymentSheet open={showBillsPayment} onOpenChange={setShowBillsPayment} />
      <PaymentRequestFormDialog open={showNewRequest} onOpenChange={setShowNewRequest} title="New Payment Request" onSubmit={(data) => base44.entities.PaymentRequest.create(data)} />
    </div>
  );
}