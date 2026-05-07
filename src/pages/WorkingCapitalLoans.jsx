import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Plus, Trash2, CheckCircle, Pencil, ChevronDown, ChevronUp, RotateCcw, List, LayoutGrid } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import AddFormDialog from "../components/shared/AddFormDialog";
import OutstandingVsGranted from "../components/working-capital/OutstandingVsGranted";
import ProjectedCashOutflows from "../components/working-capital/ProjectedCashOutflows";
import DebtServiceCoverageRatio from "../components/working-capital/DebtServiceCoverageRatio";
import UpcomingMaturities from "../components/working-capital/UpcomingMaturities";
import LoanTypeTable from "../components/working-capital/LoanTypeTable";
import CreditorLoansTable from "../components/working-capital/CreditorLoansTable";


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
  const [viewMode, setViewMode] = useState("grouped"); // "grouped" or "table"
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

  const activeItems = items.filter(d => d.status === "active");
  const totalActive = activeItems.reduce((s, d) => s + ((d.total_amount || 0) - (d.amount_paid || 0)), 0);
  const monthlyPayments = activeItems.reduce((s, d) => s + (d.monthly_payment || 0), 0);
  const totalGranted = activeItems.filter(d => d.amount_granted).reduce((s, d) => s + (d.amount_granted || 0), 0);
  const totalDrawn = activeItems.filter(d => d.amount_granted).reduce((s, d) => s + (d.amount_availed || 0), 0);
  const availableBalance = Math.max(0, totalGranted - totalDrawn);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Working Capital Loans</h1>
          <p className="text-muted-foreground mt-1">
            ₱{totalActive.toLocaleString()} outstanding · ₱{availableBalance.toLocaleString()} available · ₱{monthlyPayments.toLocaleString()}/mo payments
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
           <Button variant="outline" size="icon" onClick={() => setViewMode(viewMode === "grouped" ? "table" : "grouped")} title={viewMode === "grouped" ? "Table View" : "Grouped View"}>
             {viewMode === "grouped" ? <List className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
           </Button>
           <Button variant="outline" size="icon" onClick={() => queryClient.invalidateQueries({ queryKey: ["workingcapitalloans"] })} title="Refresh">
             <RotateCcw className="w-4 h-4" />
           </Button>
           <Button onClick={() => setShowAdd(true)}>
             <Plus className="w-4 h-4 mr-2" /> Add
           </Button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <OutstandingVsGranted items={items} />
       </div>

       <ProjectedCashOutflows items={items} />

      <DebtServiceCoverageRatio items={items} />

      <UpcomingMaturities items={items} />

      {viewMode === "table" ? (
        <div>
          {!isLoading && filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No working capital loans recorded</div>
          ) : (
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Creditor</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Type</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Total Amount</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Outstanding</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Interest Rate</th>
                    <th className="px-6 py-4 text-right text-sm font-semibold text-foreground">Monthly Payment</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(loan => (
                    <tr key={loan.id} className="border-b border-border hover:bg-muted/50">
                      <td className="px-6 py-4 text-sm text-foreground">{loan.creditor}</td>
                      <td className="px-6 py-4 text-sm text-foreground">{typeLabels[loan.type] || loan.type}</td>
                      <td className="px-6 py-4 text-sm text-right text-foreground">₱{(loan.total_amount || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-right text-foreground">₱{Math.max(0, (loan.total_amount || 0) - (loan.amount_paid || 0)).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-right text-foreground">{loan.interest_rate || "-"}%</td>
                      <td className="px-6 py-4 text-sm text-right text-foreground">₱{(loan.monthly_payment || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-sm text-left">
                        <Badge variant="outline" className={statusStyles[loan.status] || ""}>
                          {(loan.status || "active").replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {loan.status === "active" && (
                            <Button variant="ghost" size="icon" onClick={() => markPaidOff(loan)} className="text-primary hover:text-primary" title="Mark as Paid Off">
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => setEditingItem(loan)} className="text-muted-foreground hover:text-foreground">
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteItem(loan)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.keys(typeLabels).map(type => {
            const typeLoans = filtered.filter(d => d.type === type);
            if (typeLoans.length === 0) return null;

            // Group by creditor
            const byCreditor = {};
            typeLoans.forEach(loan => {
              if (!byCreditor[loan.creditor]) byCreditor[loan.creditor] = [];
              byCreditor[loan.creditor].push(loan);
            });

            return (
              <div key={type} className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">{typeLabels[type]}</h2>
                <div className="space-y-4">
                  {Object.keys(byCreditor).map(creditor => (
                    <CreditorLoansTable
                      key={creditor}
                      creditor={creditor}
                      loans={byCreditor[creditor]}
                      expandedId={expandedId}
                      setExpandedId={setExpandedId}
                      onEdit={setEditingItem}
                      onDelete={setDeleteItem}
                      onMarkPaidOff={markPaidOff}
                      isLoading={isLoading}
                    />
                  ))}
                </div>
              </div>
            );
          })}
          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No working capital loans recorded
            </div>
          )}
        </div>
      )}

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
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {user?.role === "admin" && (
              <AlertDialogAction onClick={() => { deleteMutation.mutate(deleteItem.id); setDeleteItem(null); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}