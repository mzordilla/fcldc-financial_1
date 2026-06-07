import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, differenceInDays } from "date-fns";
import { Plus, Trash2, CheckCircle, Pencil, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AddFormDialog from "../components/shared/AddFormDialog";
import ReceivableFormDialog from "../components/receivables/ReceivableFormDialog";
import MarkReceivableAsCollectedDialog from "../components/receivables/MarkReceivableAsCollectedDialog";
import BillingCycles from "./BillingCycles";

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

function MonthlyTotals({ items }) {
  const monthMap = {};
  items.forEach(r => {
    const key = r.due_date ? format(new Date(r.due_date), "MMM yyyy") : "No Date";
    const sortKey = r.due_date ? r.due_date.substring(0, 7) : "0000-00";
    if (!monthMap[key]) monthMap[key] = { label: key, sortKey, billed: 0, collected: 0 };
    monthMap[key].billed += r.amount || 0;
    monthMap[key].collected += r.amount_paid || 0;
  });

  const months = Object.values(monthMap).sort((a, b) => b.sortKey.localeCompare(a.sortKey)).slice(0, 6);

  if (months.length === 0) return null;

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Monthly Collection Efficiency</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="text-left pb-2 font-medium">Month</th>
              <th className="text-right pb-2 font-medium">Billed</th>
              <th className="text-right pb-2 font-medium">Collected</th>
              <th className="text-right pb-2 font-medium">Outstanding</th>
              <th className="text-right pb-2 font-medium">Efficiency</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {months.map(m => {
              const outstanding = m.billed - m.collected;
              const efficiency = m.billed > 0 ? ((m.collected / m.billed) * 100) : 0;
              return (
                <tr key={m.label} className="hover:bg-muted/40 transition-colors">
                  <td className="py-2 font-medium text-foreground">{m.label}</td>
                  <td className="py-2 text-right text-foreground">₱{m.billed.toLocaleString()}</td>
                  <td className="py-2 text-right text-primary">₱{m.collected.toLocaleString()}</td>
                  <td className={`py-2 text-right font-semibold ${outstanding > 0 ? "text-destructive" : "text-primary"}`}>
                    ₱{outstanding.toLocaleString()}
                  </td>
                  <td className="py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${efficiency >= 80 ? "bg-primary" : efficiency >= 50 ? "bg-chart-3" : "bg-destructive"}`}
                          style={{ width: `${efficiency}%` }}
                        />
                      </div>
                      <span className={`text-xs font-bold ${efficiency >= 80 ? "text-primary" : efficiency >= 50 ? "text-chart-3" : "text-destructive"}`}>
                        {efficiency.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AgingSummary({ items }) {
  const today = new Date();
  const buckets = [
    { label: "Current", amount: 0 },
    { label: "1–30 days", amount: 0 },
    { label: "31–60 days", amount: 0 },
    { label: "61–90 days", amount: 0 },
    { label: "90+ days", amount: 0 },
  ];
  items.filter(r => r.status !== "paid").forEach(r => {
    if (!r.due_date) return;
    const days = differenceInDays(today, new Date(r.due_date));
    const rem = (r.amount || 0) - (r.amount_paid || 0);
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
  outstanding: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  partially_paid: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  paid: "bg-primary/10 text-primary border-primary/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
};

const fields = [
  { name: "client_name", label: "Client Name", required: true, placeholder: "e.g. ABC Developers" },
  { name: "invoice_number", label: "Invoice #", placeholder: "INV-001" },
  { name: "amount", label: "Total Amount (₱)", type: "number", required: true, placeholder: "0.00" },
  { name: "amount_paid", label: "Amount Paid (₱)", type: "number", placeholder: "0.00" },
  { name: "due_date", label: "Due Date", type: "date", required: true },
  { name: "status", label: "Status", type: "select", options: [
    { value: "outstanding", label: "Outstanding" },
    { value: "partially_paid", label: "Partially Paid" },
    { value: "paid", label: "Paid" },
    { value: "overdue", label: "Overdue" },
  ]},
  { name: "notes", label: "Notes", placeholder: "Optional notes" },
];

export default function Receivables() {
  const [showAdd, setShowAdd] = useState(false);
  const [editingR, setEditingR] = useState(null);
  const [collectingR, setCollectingR] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: receivables = [], isLoading } = useQuery({
    queryKey: ["receivables"],
    queryFn: () => base44.entities.Receivable.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const receivable = await base44.entities.Receivable.create(data);
      // Record income at creation time for P&L
      await base44.entities.Transaction.create({
        description: `Receivable: ${data.client_name}${data.invoice_number ? ` (${data.invoice_number})` : ""}${data.project_name ? ` — ${data.project_name}` : ""}`,
        amount: data.amount,
        type: "income",
        category: "project_payment",
        project_name: data.project_name || "",
        date: data.due_date || new Date().toISOString().split("T")[0],
        status: "pending",
      });
      return receivable;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Receivable.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["receivables"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Receivable.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["receivables"] }),
  });

  const markCollected = (r, data) => updateMutation.mutate({ id: r.id, data });

  const filtered = statusFilter === "all" ? receivables : receivables.filter(r => r.status === statusFilter);

  const totalOutstanding = receivables.filter(r => r.status !== "paid").reduce((s, r) => s + ((r.amount || 0) - (r.amount_paid || 0)), 0);
  const overdueCount = receivables.filter(r => r.status === "overdue").length;
  const totalBilled = receivables.reduce((s, r) => s + (r.amount || 0), 0);
  const totalCollected = receivables.reduce((s, r) => s + (r.amount_paid || 0), 0);
  const collectionEfficiency = totalBilled > 0 ? ((totalCollected / totalBilled) * 100) : 0;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <Tabs defaultValue="receivables" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="receivables">Receivables</TabsTrigger>
          <TabsTrigger value="billing-cycles">Billing Cycles</TabsTrigger>
        </TabsList>

        <TabsContent value="receivables" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Receivables</h1>
          <p className="text-muted-foreground mt-1">
            ₱{totalOutstanding.toLocaleString()} outstanding · {overdueCount} overdue · {collectionEfficiency.toFixed(1)}% collection efficiency
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="outstanding">Outstanding</SelectItem>
              <SelectItem value="partially_paid">Partially Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add
          </Button>
        </div>
      </div>

      <AgingSummary items={receivables} />

      <MonthlyTotals items={receivables} />

      <div className="grid gap-4">
        {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
        {!isLoading && filtered.length === 0 && <p className="text-center py-12 text-muted-foreground">No receivables yet</p>}
        {filtered.map((r) => {
          const remaining = (r.amount || 0) - (r.amount_paid || 0);
          const paidPct = r.amount ? Math.min(((r.amount_paid || 0) / r.amount) * 100, 100) : 0;
          const aging = getAgingBucket(r.due_date, r.status);
          return (
            <div key={r.id} className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h3 className="font-semibold text-foreground">{r.client_name}</h3>
                    <Badge variant="outline" className={`text-xs ${statusStyles[r.status] || ""}`}>
                      {(r.status || "outstanding").replace(/_/g, " ")}
                    </Badge>
                    {aging && <Badge variant="outline" className={`text-xs ${aging.style}`}>{aging.label}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {r.project_name || ""}{r.invoice_number ? ` · ${r.invoice_number}` : ""}
                    {r.due_date && ` · Due ${format(new Date(r.due_date), "MMM d, yyyy")}`}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <Progress value={paidPct} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      ₱{(r.amount_paid || 0).toLocaleString()} / ₱{(r.amount || 0).toLocaleString()}
                    </span>
                  </div>
                  {/* Payment history breakdown */}
                  {(r.payment_history || []).length > 0 && (
                    <div className="mt-3 rounded-lg border border-border divide-y divide-border text-xs">
                      {(r.payment_history || []).map((h, i) => (
                        <div key={i} className="px-3 py-1.5 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Banknote className="w-3 h-3" />
                              {h.reference && <span className="font-medium">{h.reference}</span>}
                              {h.collection_date && <span>· {format(new Date(h.collection_date), "MMM d, yyyy")}</span>}
                              {h.notes && <span className="italic">· {h.notes}</span>}
                            </div>
                            <span className="font-semibold text-primary">₱{(h.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                          {(h.receipt_url || h.check_image_url) && (
                            <div className="grid grid-cols-2 gap-2">
                              {h.receipt_url && (
                                <a href={h.receipt_url} target="_blank" rel="noopener noreferrer" className="block">
                                  <p className="text-muted-foreground mb-0.5">Receipt</p>
                                  <img src={h.receipt_url} alt="Receipt" className="rounded border border-border max-h-20 object-contain bg-muted w-full hover:opacity-80 transition-opacity" />
                                </a>
                              )}
                              {h.check_image_url && (
                                <a href={h.check_image_url} target="_blank" rel="noopener noreferrer" className="block">
                                  <p className="text-muted-foreground mb-0.5">Check</p>
                                  <img src={h.check_image_url} alt="Check" className="rounded border border-border max-h-20 object-contain bg-muted w-full hover:opacity-80 transition-opacity" />
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
                  <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                  <p className="text-lg font-bold text-foreground">₱{remaining.toLocaleString()}</p>
                  <div className="flex gap-1">
                    {r.status !== "paid" && (
                      <Button variant="ghost" size="icon" onClick={() => setCollectingR(r)} className="text-primary hover:text-primary" title="Record Collection">
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                    {r.status === "paid" && (r.payment_history || []).length > 0 && (
                      <Button variant="ghost" size="icon" onClick={() => setCollectingR(r)} className="text-muted-foreground hover:text-primary" title="View Collections">
                        <Banknote className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setEditingR(r)} className="text-muted-foreground hover:text-foreground">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(r.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  </div>
              </div>
            </div>
          );
        })}
      </div>

      <ReceivableFormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title="Add Receivable"
        fields={fields}
        onSubmit={(data) => createMutation.mutateAsync(data)}
      />
      <ReceivableFormDialog
        open={!!editingR}
        onOpenChange={(v) => { if (!v) setEditingR(null); }}
        title="Edit Receivable"
        fields={fields}
        initialData={editingR || {}}
        onSubmit={(data) => updateMutation.mutateAsync({ id: editingR.id, data })}
      />
      <MarkReceivableAsCollectedDialog
        open={!!collectingR}
        onOpenChange={(v) => { if (!v) setCollectingR(null); }}
        receivable={collectingR}
        onConfirm={(data) => markCollected(collectingR, data)}
      />
        </TabsContent>

        <TabsContent value="billing-cycles">
          <BillingCycles embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}