import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Plus, Trash2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import AddFormDialog from "../components/shared/AddFormDialog";

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
  { name: "amount", label: "Total Amount ($)", type: "number", required: true, placeholder: "0.00" },
  { name: "amount_paid", label: "Amount Paid ($)", type: "number", placeholder: "0.00" },
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
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

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

  const markPaid = (p) => updateMutation.mutate({ id: p.id, data: { status: "paid", amount_paid: p.amount } });

  const filtered = statusFilter === "all" ? payables : payables.filter(p => p.status === statusFilter);

  const totalUnpaid = payables.filter(p => p.status !== "paid").reduce((s, p) => s + ((p.amount || 0) - (p.amount_paid || 0)), 0);
  const overdueCount = payables.filter(p => p.status === "overdue").length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Payables</h1>
          <p className="text-muted-foreground mt-1">
            ${totalUnpaid.toLocaleString()} outstanding · {overdueCount} overdue
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
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Payable
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
        {!isLoading && filtered.length === 0 && <p className="text-center py-12 text-muted-foreground">No payables yet</p>}
        {filtered.map((p) => {
          const remaining = (p.amount || 0) - (p.amount_paid || 0);
          const paidPct = p.amount ? Math.min(((p.amount_paid || 0) / p.amount) * 100, 100) : 0;
          return (
            <div key={p.id} className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h3 className="font-semibold text-foreground">{p.supplier_name}</h3>
                    <Badge variant="outline" className={`text-xs ${statusStyles[p.status] || ""}`}>
                      {(p.status || "unpaid").replace(/_/g, " ")}
                    </Badge>
                    {p.category && <Badge variant="secondary" className="text-xs">{p.category}</Badge>}
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
                      ${(p.amount_paid || 0).toLocaleString()} / ${(p.amount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                  <p className="text-lg font-bold text-destructive">${remaining.toLocaleString()}</p>
                  <div className="flex gap-1">
                    {p.status !== "paid" && (
                      <Button variant="ghost" size="icon" onClick={() => markPaid(p)} className="text-primary hover:text-primary">
                        <CheckCircle className="w-4 h-4" />
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
    </div>
  );
}