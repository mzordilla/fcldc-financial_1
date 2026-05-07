import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Plus, ArrowUpRight, ArrowDownRight, Trash2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddFormDialog from "../components/shared/AddFormDialog";

const CATEGORIES = [
  { value: "project_payment", label: "Project Payment" },
  { value: "material_cost", label: "Material Cost" },
  { value: "labor", label: "Labor" },
  { value: "equipment", label: "Equipment" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "overhead", label: "Overhead" },
  { value: "permits", label: "Permits" },
  { value: "insurance", label: "Insurance" },
  { value: "other", label: "Other" },
];

const fields = [
  { name: "description", label: "Description", required: true, placeholder: "e.g. Payment for Oak Street project" },
  { name: "amount", label: "Amount ($)", type: "number", required: true, placeholder: "0.00" },
  { name: "type", label: "Type", type: "select", options: [{ value: "income", label: "Income" }, { value: "expense", label: "Expense" }] },
  { name: "category", label: "Category", type: "select", options: CATEGORIES },
  { name: "project_name", label: "Project Name", placeholder: "e.g. Oak Street Renovation" },
  { name: "date", label: "Date", type: "date", required: true },
];

export default function Transactions() {
  const [showAdd, setShowAdd] = useState(false);
  const [editingT, setEditingT] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Transaction.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Transaction.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }),
  });

  const filtered = typeFilter === "all" ? transactions : transactions.filter(t => t.type === typeFilter);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Transactions</h1>
          <p className="text-muted-foreground mt-1">Track all income and expenses</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expenses</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add
          </Button>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Description</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Project</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Category</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Date</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">Amount</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">No transactions yet</td></tr>
              )}
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        t.type === "income" ? "bg-primary/10" : "bg-destructive/10"
                      }`}>
                        {t.type === "income"
                          ? <ArrowUpRight className="w-3.5 h-3.5 text-primary" />
                          : <ArrowDownRight className="w-3.5 h-3.5 text-destructive" />
                        }
                      </div>
                      <span className="text-sm font-medium">{t.description}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{t.project_name || "—"}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {t.category && <Badge variant="secondary" className="text-xs">{t.category.replace(/_/g, " ")}</Badge>}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {t.date ? format(new Date(t.date), "MMM d, yyyy") : "—"}
                  </td>
                  <td className={`px-4 py-3 text-right text-sm font-semibold ${
                    t.type === "income" ? "text-primary" : "text-destructive"
                  }`}>
                    {t.type === "income" ? "+" : "-"}${(t.amount || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingT(t)}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(t.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddFormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title="Add Transaction"
        fields={fields}
        onSubmit={(data) => createMutation.mutateAsync(data)}
      />
      <AddFormDialog
        open={!!editingT}
        onOpenChange={(v) => { if (!v) setEditingT(null); }}
        title="Edit Transaction"
        fields={fields}
        initialData={editingT || {}}
        onSubmit={(data) => updateMutation.mutateAsync({ id: editingT.id, data })}
      />
    </div>
  );
}