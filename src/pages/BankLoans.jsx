import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Plus, Trash2, CheckCircle, Landmark, CalendarClock, Percent, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import AddFormDialog from "../components/shared/AddFormDialog";

const loanTypeLabels = {
  term_loan: "Term Loan",
  construction_loan: "Construction Loan",
  equipment_loan: "Equipment Loan",
  line_of_credit: "Line of Credit",
  sba_loan: "SBA Loan",
  mortgage: "Mortgage",
  bridge_loan: "Bridge Loan",
  other: "Other",
};

const statusStyles = {
  active: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  paid_off: "bg-primary/10 text-primary border-primary/20",
  in_default: "bg-destructive/10 text-destructive border-destructive/20",
  deferred: "bg-chart-3/10 text-chart-3 border-chart-3/20",
};

const fields = [
  { name: "lender", label: "Lender / Bank", required: true, placeholder: "e.g. First National Bank" },
  { name: "loan_name", label: "Loan Name", placeholder: "e.g. Equipment Expansion Loan" },
  { name: "loan_number", label: "Loan Number", placeholder: "e.g. LN-20260001" },
  { name: "loan_type", label: "Loan Type", type: "select", options: [
    { value: "term_loan", label: "Term Loan" },
    { value: "construction_loan", label: "Construction Loan" },
    { value: "equipment_loan", label: "Equipment Loan" },
    { value: "line_of_credit", label: "Line of Credit" },
    { value: "sba_loan", label: "SBA Loan" },
    { value: "mortgage", label: "Mortgage" },
    { value: "bridge_loan", label: "Bridge Loan" },
    { value: "other", label: "Other" },
  ]},
  { name: "principal", label: "Principal Amount ($)", type: "number", required: true, placeholder: "0.00" },
  { name: "outstanding_balance", label: "Outstanding Balance ($)", type: "number", placeholder: "0.00" },
  { name: "interest_rate", label: "Interest Rate (% p.a.)", type: "number", placeholder: "6.5" },
  { name: "monthly_payment", label: "Monthly Payment ($)", type: "number", placeholder: "0.00" },
  { name: "start_date", label: "Start Date", type: "date" },
  { name: "maturity_date", label: "Maturity Date", type: "date" },
  { name: "next_payment_date", label: "Next Payment Date", type: "date" },
  { name: "collateral", label: "Collateral", placeholder: "e.g. Equipment, Real estate" },
  { name: "purpose", label: "Purpose", placeholder: "e.g. Purchase of excavator fleet" },
  { name: "status", label: "Status", type: "select", options: [
    { value: "active", label: "Active" },
    { value: "paid_off", label: "Paid Off" },
    { value: "in_default", label: "In Default" },
    { value: "deferred", label: "Deferred" },
  ]},
];

export default function BankLoans() {
  const [showAdd, setShowAdd] = useState(false);
  const [editingLoan, setEditingLoan] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: loans = [], isLoading } = useQuery({
    queryKey: ["bankloans"],
    queryFn: () => base44.entities.BankLoan.list("-created_date", 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BankLoan.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bankloans"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BankLoan.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bankloans"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BankLoan.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bankloans"] }),
  });

  const markPaidOff = (loan) => updateMutation.mutate({ id: loan.id, data: { status: "paid_off", outstanding_balance: 0 } });

  const filtered = statusFilter === "all" ? loans : loans.filter(l => l.status === statusFilter);

  const totalOutstanding = loans.filter(l => l.status === "active").reduce((s, l) => s + (l.outstanding_balance ?? l.principal ?? 0), 0);
  const totalMonthly = loans.filter(l => l.status === "active").reduce((s, l) => s + (l.monthly_payment || 0), 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Bank Loans</h1>
          <p className="text-muted-foreground mt-1">
            ${totalOutstanding.toLocaleString()} outstanding · ${totalMonthly.toLocaleString()}/mo repayments
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paid_off">Paid Off</SelectItem>
              <SelectItem value="in_default">In Default</SelectItem>
              <SelectItem value="deferred">Deferred</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Loan
          </Button>
        </div>
      </div>

      <div className="grid gap-5">
        {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
        {!isLoading && filtered.length === 0 && <p className="text-center py-12 text-muted-foreground">No loans recorded</p>}
        {filtered.map((loan) => {
          const balance = loan.outstanding_balance ?? loan.principal ?? 0;
          const paid = (loan.principal || 0) - balance;
          const paidPct = loan.principal ? Math.min((paid / loan.principal) * 100, 100) : 0;
          return (
            <div key={loan.id} className="bg-card rounded-2xl border border-border p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Landmark className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{loan.lender}</h3>
                      {loan.loan_name && <p className="text-xs text-muted-foreground">{loan.loan_name}</p>}
                    </div>
                    <Badge variant="outline" className={`text-xs ${statusStyles[loan.status] || ""}`}>
                      {(loan.status || "active").replace(/_/g, " ")}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {loanTypeLabels[loan.loan_type] || loan.loan_type || "Loan"}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                    <div className="bg-muted/50 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground mb-0.5">Principal</p>
                      <p className="font-semibold text-sm">${(loan.principal || 0).toLocaleString()}</p>
                    </div>
                    <div className="bg-muted/50 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground mb-0.5">Balance</p>
                      <p className="font-semibold text-sm text-destructive">${balance.toLocaleString()}</p>
                    </div>
                    {loan.interest_rate != null && (
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-xs text-muted-foreground mb-0.5">Rate</p>
                        <p className="font-semibold text-sm flex items-center gap-0.5">
                          <Percent className="w-3 h-3" />{loan.interest_rate}% p.a.
                        </p>
                      </div>
                    )}
                    {loan.monthly_payment != null && (
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-xs text-muted-foreground mb-0.5">Monthly</p>
                        <p className="font-semibold text-sm">${(loan.monthly_payment || 0).toLocaleString()}</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                      <span>Repayment progress</span>
                      <span>{paidPct.toFixed(0)}% paid</span>
                    </div>
                    <Progress value={paidPct} className="h-2" />
                  </div>

                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                    {loan.loan_number && <span>Ref: {loan.loan_number}</span>}
                    {loan.collateral && <span>Collateral: {loan.collateral}</span>}
                    {loan.next_payment_date && (
                      <span className="flex items-center gap-1">
                        <CalendarClock className="w-3 h-3" />
                        Next payment: {format(new Date(loan.next_payment_date), "MMM d, yyyy")}
                      </span>
                    )}
                    {loan.maturity_date && <span>Matures: {format(new Date(loan.maturity_date), "MMM yyyy")}</span>}
                  </div>
                  {loan.purpose && <p className="text-xs text-muted-foreground mt-1">Purpose: {loan.purpose}</p>}
                </div>

                <div className="flex sm:flex-col gap-2">
                  {loan.status === "active" && (
                    <Button variant="ghost" size="icon" onClick={() => markPaidOff(loan)} className="text-primary hover:text-primary">
                      <CheckCircle className="w-4 h-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" onClick={() => setEditingLoan(loan)} className="text-muted-foreground hover:text-foreground">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(loan.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <AddFormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title="Add Bank Loan"
        fields={fields}
        onSubmit={(data) => createMutation.mutateAsync(data)}
      />
      <AddFormDialog
        open={!!editingLoan}
        onOpenChange={(v) => { if (!v) setEditingLoan(null); }}
        title="Edit Bank Loan"
        fields={fields}
        initialData={editingLoan || {}}
        onSubmit={(data) => updateMutation.mutateAsync({ id: editingLoan.id, data })}
      />
    </div>
  );
}