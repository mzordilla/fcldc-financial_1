import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Pencil, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddFormDialog from "../components/shared/AddFormDialog";

const TYPE_COLORS = {
  income:    "bg-primary/10 text-primary border-primary/20",
  expense:   "bg-destructive/10 text-destructive border-destructive/20",
  asset:     "bg-chart-2/10 text-chart-2 border-chart-2/20",
  liability: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  equity:    "bg-chart-4/10 text-chart-4 border-chart-4/20",
};

const CATEGORY_LABELS = {
  project_payment: "Project Payment",
  material_cost: "Material Cost",
  labor: "Labor",
  equipment: "Equipment",
  subcontractor: "Subcontractor",
  overhead: "Overhead",
  permits: "Permits",
  insurance: "Insurance",
  bank_reconciliation: "Bank Reconciliation",
  other: "Other",
};

const fields = [
  { name: "account_code", label: "Account Code", placeholder: "e.g. 4001" },
  { name: "account_name", label: "Account Name", required: true, placeholder: "e.g. Project Revenue" },
  { name: "account_type", label: "Account Type", type: "select", required: true, options: [
    { value: "income", label: "Income" },
    { value: "expense", label: "Expense" },
    { value: "asset", label: "Asset" },
    { value: "liability", label: "Liability" },
    { value: "equity", label: "Equity" },
  ]},
  { name: "category", label: "Transaction Category", type: "select", options: [
    { value: "project_payment", label: "Project Payment" },
    { value: "material_cost", label: "Material Cost" },
    { value: "labor", label: "Labor" },
    { value: "equipment", label: "Equipment" },
    { value: "subcontractor", label: "Subcontractor" },
    { value: "overhead", label: "Overhead" },
    { value: "permits", label: "Permits" },
    { value: "insurance", label: "Insurance" },
    { value: "bank_reconciliation", label: "Bank Reconciliation" },
    { value: "other", label: "Other" },
  ]},
  { name: "description", label: "Notes", placeholder: "Optional description" },
];

export default function ChartOfAccounts() {
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["chartofaccounts"],
    queryFn: () => base44.entities.ChartOfAccount.list("account_code", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ChartOfAccount.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chartofaccounts"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChartOfAccount.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chartofaccounts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ChartOfAccount.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chartofaccounts"] }),
  });

  const filtered = typeFilter === "all" ? accounts : accounts.filter(a => a.account_type === typeFilter);

  // Group by type for counts
  const typeCounts = accounts.reduce((acc, a) => {
    acc[a.account_type] = (acc[a.account_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Chart of Accounts</h1>
          <p className="text-muted-foreground mt-1">{accounts.length} accounts · used to classify transaction descriptions</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="asset">Asset</SelectItem>
              <SelectItem value="liability">Liability</SelectItem>
              <SelectItem value="equity">Equity</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Account
          </Button>
        </div>
      </div>

      {/* Type summary pills */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(typeCounts).map(([type, count]) => (
          <button
            key={type}
            onClick={() => setTypeFilter(typeFilter === type ? "all" : type)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${TYPE_COLORS[type] || "bg-muted text-muted-foreground"}`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)} ({count})
          </button>
        ))}
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Code</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Account Name</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Type</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Category</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Notes</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-muted-foreground text-sm">No accounts yet. Add your first account.</p>
                  </td>
                </tr>
              )}
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{a.account_code || "—"}</td>
                  <td className="px-4 py-3 text-sm font-medium text-foreground">{a.account_name}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs ${TYPE_COLORS[a.account_type] || ""}`}>
                      {a.account_type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {a.category
                      ? <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[a.category] || a.category}</Badge>
                      : <span className="text-xs text-muted-foreground">—</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell max-w-xs truncate">{a.description || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditingItem(a)} className="text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(a.id)} className="text-muted-foreground hover:text-destructive transition-colors">
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
        title="Add Account"
        fields={fields}
        onSubmit={(data) => createMutation.mutateAsync(data)}
      />
      <AddFormDialog
        open={!!editingItem}
        onOpenChange={(v) => { if (!v) setEditingItem(null); }}
        title="Edit Account"
        fields={fields}
        initialData={editingItem || {}}
        onSubmit={(data) => updateMutation.mutateAsync({ id: editingItem.id, data })}
      />
    </div>
  );
}