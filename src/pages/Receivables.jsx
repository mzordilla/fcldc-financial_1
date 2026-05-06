import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, differenceInDays } from "date-fns";
import { Plus, Trash2, CheckCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import AddFormDialog from "../components/shared/AddFormDialog";

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
              ${b.amount.toLocaleString()}
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
  { name: "project_name", label: "Project Name", placeholder: "e.g. Main Street Tower" },
  { name: "invoice_number", label: "Invoice #", placeholder: "INV-001" },
  { name: "amount", label: "Total Amount ($)", type: "number", required: true, placeholder: "0.00" },
  { name: "amount_paid", label: "Amount Paid ($)", type: "number", placeholder: "0.00" },
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
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: receivables = [], isLoading } = useQuery({
    queryKey: ["receivables"],
    queryFn: () => base44.entities.Receivable.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Receivable.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["receivables"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Receivable.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["receivables"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Receivable.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["receivables"] }),
  });

  const markPaid = (r) => updateMutation.mutate({ id: r.id, data: { status: "paid", amount_paid: r.amount } });

  const filtered = statusFilter === "all" ? receivables : receivables.filter(r => r.status === statusFilter);

  const totalOutstanding = receivables.filter(r => r.status !== "paid").reduce((s, r) => s + ((r.amount || 0) - (r.amount_paid || 0)), 0);
  const overdueCount = receivables.filter(r => r.status === "overdue").length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Receivables</h1>
          <p className="text-muted-foreground mt-1">
            ${totalOutstanding.toLocaleString()} outstanding · {overdueCount} overdue
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
                      ${(r.amount_paid || 0).toLocaleString()} / ${(r.amount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                  <p className="text-lg font-bold text-foreground">${remaining.toLocaleString()}</p>
                  <div className="flex gap-1">
                    {r.status !== "paid" && (
                      <Button variant="ghost" size="icon" onClick={() => markPaid(r)} className="text-primary hover:text-primary">
                        <CheckCircle className="w-4 h-4" />
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

      <AddFormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title="Add Receivable"
        fields={fields}
        onSubmit={(data) => createMutation.mutateAsync(data)}
      />
      <AddFormDialog
        open={!!editingR}
        onOpenChange={(v) => { if (!v) setEditingR(null); }}
        title="Edit Receivable"
        fields={fields}
        initialData={editingR || {}}
        onSubmit={(data) => updateMutation.mutateAsync({ id: editingR.id, data })}
      />
    </div>
  );
}