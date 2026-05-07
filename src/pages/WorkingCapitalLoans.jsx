import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Plus, Trash2, CheckCircle, Pencil, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AddFormDialog from "../components/shared/AddFormDialog";
import MonthlyLoanMonitoring from "../components/working-capital/MonthlyLoanMonitoring";
import OutstandingVsGranted from "../components/working-capital/OutstandingVsGranted";
import ProjectedCashOutflows from "../components/working-capital/ProjectedCashOutflows";
import DebtServiceCoverageRatio from "../components/working-capital/DebtServiceCoverageRatio";
import UpcomingMaturities from "../components/working-capital/UpcomingMaturities";

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
  { name: "description", label: "Description", placeholder: "e.g. Working capital for operations" },
  { name: "amount_granted", label: "Amount Granted (₱)", type: "number", placeholder: "0.00" },
  { name: "amount_availed", label: "Amount Availed (₱)", type: "number", placeholder: "0.00" },
  { name: "total_amount", label: "Total Amount (₱)", type: "number", required: true, placeholder: "0.00" },
  { name: "amount_paid", label: "Amount Paid (₱)", type: "number", placeholder: "0.00" },
  { name: "principal_balance", label: "Principal Balance (₱)", type: "number", placeholder: "0.00" },
  { name: "interest_rate", label: "Interest Rate (%)", type: "number", placeholder: "5.5" },
  { name: "interest_accrued_1yr", label: "1-Year Interest Accrual (₱)", type: "number", placeholder: "0.00" },
  { name: "monthly_payment", label: "Monthly Payment (₱)", type: "number", placeholder: "0.00" },
  { name: "loan_granted", label: "Loan Granted Date", type: "date" },
  { name: "loan_availed", label: "Loan Availed Date", type: "date" },
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
];

export default function WorkingCapitalLoans() {
  const [showAdd, setShowAdd] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["workingcapitalloans"],
    queryFn: () => base44.entities.WorkingCapitalLoan.list("-created_date", 50),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.WorkingCapitalLoan.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workingcapitalloans"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.WorkingCapitalLoan.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workingcapitalloans"] }),
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ["workingcapitalloans"] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.WorkingCapitalLoan.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workingcapitalloans"] }),
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: ["workingcapitalloans"] });
    }
  });

  const markPaidOff = (d) => updateMutation.mutate({ id: d.id, data: { status: "paid_off", amount_paid: d.total_amount } });

  const filtered = statusFilter === "all" ? items : items.filter(d => d.status === statusFilter);

  const totalActive = items.filter(d => d.status === "active").reduce((s, d) => s + ((d.total_amount || 0) - (d.amount_paid || 0)), 0);
  const monthlyPayments = items.filter(d => d.status === "active").reduce((s, d) => s + (d.monthly_payment || 0), 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Working Capital Loans</h1>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <OutstandingVsGranted items={items} />
        <ProjectedCashOutflows items={items} />
      </div>

      <DebtServiceCoverageRatio items={items} />

      <UpcomingMaturities items={items} />

      <div className="bg-card rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 border-border hover:bg-secondary/50">
              <TableHead className="font-semibold">Creditor</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="text-right font-semibold">Granted Amount</TableHead>
              <TableHead className="text-right font-semibold">Utilization</TableHead>
              <TableHead className="text-right font-semibold">Paid</TableHead>
              <TableHead className="text-right font-semibold">Outstanding</TableHead>
              <TableHead className="text-right font-semibold">Rate</TableHead>
              <TableHead className="text-right font-semibold">Monthly</TableHead>
              <TableHead className="text-center font-semibold">Status</TableHead>
              <TableHead className="text-center font-semibold w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan="9" className="text-center py-12 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan="9" className="text-center py-12 text-muted-foreground">
                  No working capital loans recorded
                </TableCell>
              </TableRow>
            )}
            {filtered.map((d) => {
              const remaining = (d.total_amount || 0) - (d.amount_paid || 0);
              const isExpanded = expandedId === d.id;
              return (
                <TableRow key={d.id} className="border-border hover:bg-secondary/30 transition-colors">
                  <TableCell className="font-medium text-foreground">{d.creditor}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {typeLabels[d.type] || d.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    ₱{(d.amount_granted || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {d.amount_granted ? `${Math.round(((d.amount_availed || 0) / d.amount_granted) * 100)}%` : "-"}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    ₱{(d.amount_paid || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-right text-sm font-semibold text-foreground">
                    ₱{remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {d.interest_rate ? `${d.interest_rate}%` : "-"}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {d.monthly_payment ? `₱${d.monthly_payment.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className={`text-xs ${statusStyles[d.status] || ""}`}>
                      {(d.status || "active").replace(/_/g, " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {d.status === "active" && (
                        <Button variant="ghost" size="icon" onClick={() => markPaidOff(d)} className="h-8 w-8 text-primary hover:text-primary" title="Mark as Paid Off">
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setExpandedId(isExpanded ? null : d.id)}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title={isExpanded ? "Collapse" : "Expand"}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setEditingItem(d)} className="h-8 w-8 text-muted-foreground hover:text-foreground" title="Edit">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteItem(d)} className="h-8 w-8 text-muted-foreground hover:text-destructive" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {!isLoading && filtered.length > 0 && expandedId && (
          <div className="border-t border-border px-6 py-4 bg-secondary/30">
            <MonthlyLoanMonitoring loan={filtered.find(d => d.id === expandedId)} />
          </div>
        )}
      </div>

      <AddFormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title="Add Working Capital Loan"
        fields={fields}
        onSubmit={(data) => createMutation.mutateAsync(data)}
      />
      <AddFormDialog
        open={!!editingItem}
        onOpenChange={(v) => { if (!v) setEditingItem(null); }}
        title="Edit Working Capital Loan"
        fields={fields}
        initialData={editingItem || {}}
        onSubmit={(data) => updateMutation.mutateAsync({ id: editingItem.id, data })}
      />

      <AlertDialog open={!!deleteItem} onOpenChange={(v) => { if (!v) setDeleteItem(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Loan</AlertDialogTitle>
            <AlertDialogDescription>
              {user?.role === "admin" ? (
                <>This action cannot be undone. Are you sure you want to delete this loan?</>
              ) : (
                <>Only admins can delete loans. Please contact an administrator to delete this loan.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialog.Footer>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {user?.role === "admin" && (
              <AlertDialogAction onClick={() => { deleteMutation.mutate(deleteItem.id); setDeleteItem(null); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            )}
          </AlertDialog.Footer>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}