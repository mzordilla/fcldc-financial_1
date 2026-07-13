import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Plus, ArrowUpRight, ArrowDownRight, Trash2, Pencil, Building2, TableProperties, FileUp, Download, HardDriveDownload, Search } from "lucide-react";
import { exportToExcel } from "@/utils/excelUtils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TransactionFormDialog from "../components/transactions/TransactionFormDialog";
import InlineCategorySelect from "../components/transactions/InlineCategorySelect";
import InlineChartOfAccountSelect from "../components/transactions/InlineChartOfAccountSelect";
import InlineProjectSelect from "../components/transactions/InlineProjectSelect";
import BatchTransactionDialog from "../components/transactions/BatchTransactionDialog";
import SpendByCategoryChart from "../components/transactions/SpendByCategoryChart";
import ExcelImportDialog from "../components/transactions/ExcelImportDialog";
import ChartOfAccounts from "./ChartOfAccounts";
import Payees from "./Payees";
import ReceiptScanner from "./ReceiptScanner";

const CATEGORIES = [
  { value: "project_payment", label: "Project Payment" },
  { value: "material_cost", label: "Material Cost" },
  { value: "labor", label: "Labor" },
  { value: "direct_labor", label: "Direct Labor" },
  { value: "equipment", label: "Equipment" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "overhead", label: "Overhead" },
  { value: "operating_expense", label: "Operating Expense" },
  { value: "permits", label: "Permits" },
  { value: "insurance", label: "Insurance" },
  { value: "bank_reconciliation", label: "Bank Reconciliation" },
  { value: "non_current_assets", label: "Non-Current Assets" },
  { value: "current_assets", label: "Current Assets" },
  { value: "current_liabilities", label: "Current Liabilities" },
  { value: "non_current_liabilities", label: "Non-Current Liabilities" },
  { value: "repair_and_maintenance", label: "Repair & Maintenance" },
  { value: "fixtures", label: "Fixtures" },
  { value: "fund_transfer", label: "Fund Transfer" },
  { value: "other", label: "Other" },
];

export default function Transactions() {
  const [showAdd, setShowAdd] = useState(false);
  const [showBatch, setShowBatch] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingT, setEditingT] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [search, setSearch] = useState("");
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-date", 100000),
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankaccounts"],
    queryFn: () => base44.entities.BankAccount.list("-created_date", 100),
  });

  const { data: chartOfAccounts = [] } = useQuery({
    queryKey: ["chartofaccounts"],
    queryFn: () => base44.entities.ChartOfAccount.list("account_code", 200),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("project_code", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bankaccounts"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Transaction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bankaccounts"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Transaction.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bankaccounts"] });
    },
  });

  const filtered = transactions
    .filter(t => typeFilter === "all" || t.type === typeFilter)
    .filter(t => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (t.description || "").toLowerCase().includes(q) ||
        (t.project_code || "").toLowerCase().includes(q) ||
        (t.category || "").toLowerCase().includes(q) ||
        (t.chart_of_account || "").toLowerCase().includes(q)
      );
    });

  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleExport = () => {
    exportToExcel(filtered.map(t => ({
      description: t.description, type: t.type, amount: t.amount,
      category: t.category, project_code: t.project_code, date: t.date, status: t.status,
    })), "transactions.xlsx", "Transactions");
  };

  const handleBackupAll = async () => {
    setIsBackingUp(true);
    // Fetch all transactions without limit
    const all = await base44.entities.Transaction.list("-date", 9999);
    const rows = all.map(t => ({
      id: t.id,
      description: t.description,
      type: t.type,
      amount: t.amount,
      category: t.category,
      project_code: t.project_code || "",
      bank_account_id: t.bank_account_id || "",
      date: t.date || "",
      status: t.status || "",
      created_date: t.created_date || "",
      updated_date: t.updated_date || "",
      created_by: t.created_by || "",
    }));
    const dateStr = format(new Date(), "yyyy-MM-dd");
    exportToExcel(rows, `transactions_backup_${dateStr}.xlsx`, "Transactions Backup");
    setIsBackingUp(false);
  };

  const accountMap = Object.fromEntries(bankAccounts.map(a => [a.id, a]));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <Tabs defaultValue="transactions" className="w-full">
        <TabsList className="mb-4 flex-wrap h-auto gap-1">
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="receipt-scanner">Receipt Scanner</TabsTrigger>
          <TabsTrigger value="chart-of-accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="suppliers">Supplier Masterlist</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Transactions</h1>
            <p className="text-muted-foreground mt-1">Track all income and expenses</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="sm:ml-auto w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Add
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="expense">Expenses</SelectItem>
              <SelectItem value="fund_transfer">Fund Transfer</SelectItem>
              <SelectItem value="other">Others</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport} size="sm">
            <Download className="w-4 h-4 mr-1" /> Export
          </Button>
          <Button variant="outline" onClick={handleBackupAll} disabled={isBackingUp} size="sm">
            <HardDriveDownload className="w-4 h-4 mr-1" /> {isBackingUp ? "Backing up…" : "Backup All"}
          </Button>
          <Button variant="outline" onClick={() => setShowImport(true)} size="sm">
            <FileUp className="w-4 h-4 mr-1" /> Import Excel
          </Button>
          <Button variant="outline" onClick={() => setShowBatch(true)} size="sm">
            <TableProperties className="w-4 h-4 mr-1" /> Batch Enter
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9 w-full sm:w-80"
          placeholder="Search description, project, category..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <SpendByCategoryChart transactions={filtered} />

      {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
      {!isLoading && filtered.length === 0 && <p className="text-center py-12 text-muted-foreground">No transactions yet</p>}
      {!isLoading && (() => {
        // Group by month key "YYYY-MM"
        const monthMap = {};
        filtered.forEach(t => {
          const key = t.date ? t.date.slice(0, 7) : "0000-00";
          if (!monthMap[key]) monthMap[key] = [];
          monthMap[key].push(t);
        });
        const sortedMonths = Object.keys(monthMap).sort((a, b) => b.localeCompare(a));
        return sortedMonths.map(monthKey => {
          const group = monthMap[monthKey];
          const monthIncome = group.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
          const monthExpense = group.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
          const monthLabel = monthKey === "0000-00" ? "No Date" : format(new Date(monthKey + "-01"), "MMMM yyyy");
          return (
            <div key={monthKey} className="bg-card rounded-2xl border border-border overflow-hidden">
              {/* Month header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-5 py-3 bg-muted/40 border-b border-border">
                <span className="font-semibold text-foreground">{monthLabel}</span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-primary font-medium">+₱{monthIncome.toLocaleString()}</span>
                  <span className="text-destructive font-medium">-₱{monthExpense.toLocaleString()}</span>
                  <span className={`font-bold ${monthIncome - monthExpense >= 0 ? "text-primary" : "text-destructive"}`}>
                    Net: {monthIncome - monthExpense >= 0 ? "+" : ""}₱{(monthIncome - monthExpense).toLocaleString()}
                  </span>
                  <span className="text-muted-foreground text-xs">{group.length} txn{group.length !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full table-fixed">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2 w-48">Description</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2 hidden sm:table-cell">Project</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2 hidden md:table-cell">Category</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2 hidden lg:table-cell">Chart of Account</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2 hidden xl:table-cell">Bank Account</th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Date</th>
                      <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">Amount</th>
                      <th className="w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.map(t => {
                      const account = t.bank_account_id ? accountMap[t.bank_account_id] : null;
                      return (
                        <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${t.type === "income" ? "bg-primary/10" : "bg-destructive/10"}`}>
                                {t.type === "income" ? <ArrowUpRight className="w-3.5 h-3.5 text-primary" /> : <ArrowDownRight className="w-3.5 h-3.5 text-destructive" />}
                              </div>
                              <span className="text-sm font-medium truncate" title={t.description}>{t.description}</span>
                            </div>
                          </td>
                          <td className="px-2 py-1 hidden sm:table-cell">
                            <InlineProjectSelect
                              value={t.project_code || t.project_name}
                              projects={projects}
                              onChange={(v) => updateMutation.mutate({ id: t.id, data: { project_code: v } })}
                            />
                          </td>
                          <td className="px-2 py-1 hidden md:table-cell">
                            <InlineCategorySelect
                              value={t.category}
                              categories={CATEGORIES}
                              onChange={(v) => updateMutation.mutate({ id: t.id, data: { category: v } })}
                            />
                          </td>
                          <td className="px-2 py-1 hidden lg:table-cell">
                            <InlineChartOfAccountSelect
                              value={t.chart_of_account}
                              accounts={chartOfAccounts}
                              onChange={(v) => updateMutation.mutate({ id: t.id, data: { chart_of_account: v } })}
                            />
                          </td>
                          <td className="px-4 py-3 hidden xl:table-cell">
                            {account ? (
                              <div className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{account.account_name}</span>
                              </div>
                            ) : <span className="text-xs text-muted-foreground">—</span>}
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground whitespace-nowrap">
                            {t.date ? format(new Date(t.date), "MMM d, yyyy") : "—"}
                          </td>
                          <td className={`px-4 py-3 text-right text-sm font-semibold whitespace-nowrap ${t.type === "income" ? "text-primary" : "text-destructive"}`}>
                            {t.type === "income" ? "+" : "-"}₱{(t.amount || 0).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setEditingT(t)} className="text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-4 h-4" /></button>
                              <button onClick={() => deleteMutation.mutate(t.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
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
        });
      })()}

      <ExcelImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        onImport={async (rows) => {
          await Promise.all(rows.map(r => createMutation.mutateAsync(r)));
        }}
      />
      <BatchTransactionDialog
        open={showBatch}
        onOpenChange={setShowBatch}
        bankAccounts={bankAccounts}
        onSubmit={async (rows) => {
          await Promise.all(rows.map(r => createMutation.mutateAsync(r)));
        }}
      />
      <TransactionFormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title="Add Transaction"
        bankAccounts={bankAccounts}
        categories={CATEGORIES}
        onSubmit={(data) => createMutation.mutateAsync(data)}
      />
      <TransactionFormDialog
        open={!!editingT}
        onOpenChange={(v) => { if (!v) setEditingT(null); }}
        title="Edit Transaction"
        bankAccounts={bankAccounts}
        categories={CATEGORIES}
        initialData={editingT || {}}
        onSubmit={(data) => updateMutation.mutateAsync({ id: editingT.id, data })}
      />
        </TabsContent>

        <TabsContent value="receipt-scanner">
          <ReceiptScanner />
        </TabsContent>

        <TabsContent value="chart-of-accounts">
          <ChartOfAccounts embedded />
        </TabsContent>

        <TabsContent value="suppliers">
          <Payees embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}