import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Plus, Trash2, CheckCircle, Pencil, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import AddFormDialog from "../components/shared/AddFormDialog";

const typeLabels = {
  loan: "Loan",
  credit_line: "Credit Line",
  equipment_financing: "Equipment",
  vendor_credit: "Vendor Credit",
  mortgage: "Mortgage",
  other: "Other",
};

const statusStyles = {
  active: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  paid_off: "bg-primary/10 text-primary border-primary/20",
  defaulted: "bg-destructive/10 text-destructive border-destructive/20",
};

const fields = [
  { name: "creditor", label: "Creditor", required: true, placeholder: "e.g. First National Bank" },
  { name: "description", label: "Description", placeholder: "e.g. Equipment loan for excavator" },
  { name: "total_amount", label: "Total Amount ($)", type: "number", required: true, placeholder: "0.00" },
  { name: "amount_paid", label: "Amount Paid ($)", type: "number", placeholder: "0.00" },
  { name: "interest_rate", label: "Interest Rate (%)", type: "number", placeholder: "5.5" },
  { name: "monthly_payment", label: "Monthly Payment ($)", type: "number", placeholder: "0.00" },
  { name: "due_date", label: "Payoff Date", type: "date" },
  { name: "type", label: "Type", type: "select", options: [
    { value: "loan", label: "Loan" },
    { value: "credit_line", label: "Credit Line" },
    { value: "equipment_financing", label: "Equipment Financing" },
    { value: "vendor_credit", label: "Vendor Credit" },
    { value: "mortgage", label: "Mortgage" },
    { value: "other", label: "Other" },
  ]},
  { name: "status", label: "Status", type: "select", options: [
    { value: "active", label: "Active" },
    { value: "paid_off", label: "Paid Off" },
    { value: "defaulted", label: "Defaulted" },
  ]},
  { name: "contract_attachment_url", label: "Loan Contract", type: "file" },
];

export default function Debts() {
  const [showAdd, setShowAdd] = useState(false);
  const [editingDebt, setEditingDebt] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: debts = [], isLoading } = useQuery({
    queryKey: ["debts"],
    queryFn: () => base44.entities.Debt.list("-created_date", 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Debt.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["debts"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Debt.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["debts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Debt.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["debts"] }),
  });

  const markPaidOff = (d) => updateMutation.mutate({ id: d.id, data: { status: "paid_off", amount_paid: d.total_amount } });

  const filtered = statusFilter === "all" ? debts : debts.filter(d => d.status === statusFilter);

  const totalActive = debts.filter(d => d.status === "active").reduce((s, d) => s + ((d.total_amount || 0) - (d.amount_paid || 0)), 0);
  const monthlyPayments = debts.filter(d => d.status === "active").reduce((s, d) => s + (d.monthly_payment || 0), 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Debts & Liabilities</h1>
          <p className="text-muted-foreground mt-1">
            ₱{totalActive.toLocaleString()} outstanding · ₱{monthlyPayments.toLocaleString()}/mo payments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paid_off">Paid Off</SelectItem>
              <SelectItem value="defaulted">Defaulted</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
        {!isLoading && filtered.length === 0 && <p className="text-center py-12 text-muted-foreground">No debts recorded</p>}
        {filtered.map((d) => {
          const remaining = (d.total_amount || 0) - (d.amount_paid || 0);
          const paidPct = d.total_amount ? Math.min(((d.amount_paid || 0) / d.total_amount) * 100, 100) : 0;
          return (
            <div key={d.id} className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h3 className="font-semibold text-foreground">{d.creditor}</h3>
                    <Badge variant="outline" className={`text-xs ${statusStyles[d.status] || ""}`}>
                      {(d.status || "active").replace(/_/g, " ")}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {typeLabels[d.type] || d.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {d.description || ""}
                    {d.interest_rate ? ` · ${d.interest_rate}% APR` : ""}
                    {d.monthly_payment ? ` · ₱${d.monthly_payment.toLocaleString()}/mo` : ""}
                    {d.due_date && ` · Due ${format(new Date(d.due_date), "MMM yyyy")}`}
                  </p>
                  {d.contract_attachment_url && (
                    <a href={d.contract_attachment_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                      <Paperclip className="w-3 h-3" /> Contract
                    </a>
                  )}
                  <div className="mt-3 flex items-center gap-3">
                    <Progress value={paidPct} className="h-2 flex-1" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      ₱{(d.amount_paid || 0).toLocaleString()} / ₱{(d.total_amount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                  <p className="text-lg font-bold text-foreground">₱{remaining.toLocaleString()}</p>
                  <div className="flex gap-1">
                    {d.status === "active" && (
                      <Button variant="ghost" size="icon" onClick={() => markPaidOff(d)} className="text-primary hover:text-primary">
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setEditingDebt(d)} className="text-muted-foreground hover:text-foreground">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(d.id)} className="text-muted-foreground hover:text-destructive">
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
        title="Add Debt"
        fields={fields}
        onSubmit={(data) => createMutation.mutateAsync(data)}
      />
      <AddFormDialog
        open={!!editingDebt}
        onOpenChange={(v) => { if (!v) setEditingDebt(null); }}
        title="Edit Debt"
        fields={fields}
        initialData={editingDebt || {}}
        onSubmit={(data) => updateMutation.mutateAsync({ id: editingDebt.id, data })}
      />
    </div>
  );
}