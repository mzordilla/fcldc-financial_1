import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Plus, Building2, Pencil, Trash2, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight, ArrowLeftRight, ChevronDown, ChevronUp, RefreshCw, FileBarChart, ClipboardCheck } from "lucide-react";
import { ExecutiveSegmentBar } from "@/components/shared/ExecutiveTabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AddFormDialog from "../components/shared/AddFormDialog";
import BankReconciliationPage from "./BankReconciliation";
import DepositUndepositedDialog from "../components/bank-accounts/DepositUndepositedDialog";
import BankAccountSummaryReport from "../components/bank-accounts/BankAccountSummaryReport";
import CheckMonitoring from "../components/bank-accounts/CheckMonitoring";
import BankTransferDialog from "../components/bank-accounts/BankTransferDialog";
import BankTransferApprovals from "../components/bank-accounts/BankTransferApprovals";

const ACCOUNT_TYPES = [
{ value: "checking", label: "Checking" },
{ value: "savings", label: "Savings" },
{ value: "money_market", label: "Money Market" },
{ value: "line_of_credit", label: "Line of Credit" },
{ value: "other", label: "Other" }];


const STATUS_OPTIONS = [
{ value: "active", label: "Active" },
{ value: "inactive", label: "Inactive" },
{ value: "closed", label: "Closed" }];


const fields = [
{ name: "bank_name", label: "Bank Name", required: true, placeholder: "e.g. Chase, Wells Fargo" },
{ name: "account_name", label: "Account Name / Nickname", required: true, placeholder: "e.g. Main Operating Account" },
{ name: "account_number", label: "Account # (last 4 digits)", placeholder: "e.g. 4521" },
{ name: "account_type", label: "Account Type", type: "select", options: ACCOUNT_TYPES },
{ name: "current_balance", label: "Current Balance (₱)", type: "number", required: true, placeholder: "0.00" },
{ name: "currency", label: "Currency", placeholder: "PHP" },
{ name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
{ name: "notes", label: "Notes", placeholder: "Optional notes" }];


const typeColors = {
  checking: "bg-primary/10 text-primary",
  savings: "bg-chart-2/10 text-chart-2",
  money_market: "bg-chart-3/10 text-chart-3",
  line_of_credit: "bg-destructive/10 text-destructive",
  other: "bg-muted text-muted-foreground"
};

const fmt = (v) =>
`₱${Math.abs(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const isInflow = (transaction) => transaction.type === "income" || (transaction.type === "fund_transfer" && transaction.amount >= 0);
const transactionValue = (transaction) => Math.abs(transaction.amount || 0);

function MonthGroup({ monthKey, monthTransactions }) {
  const [open, setOpen] = useState(false);
  const income = monthTransactions.filter(isInflow).reduce((sum, transaction) => sum + transactionValue(transaction), 0);
  const expense = monthTransactions.filter((transaction) => !isInflow(transaction)).reduce((sum, transaction) => sum + transactionValue(transaction), 0);

  return (
    <div className="overflow-hidden border border-border bg-card">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between bg-muted/60 px-4 py-2 text-left transition-colors hover:bg-muted">
        <div className="flex items-center gap-2">
          {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
          <span className="text-xs font-semibold text-foreground">{monthKey}</span>
          <span className="text-[10px] text-muted-foreground">{monthTransactions.length} transaction{monthTransactions.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex gap-3 text-[10px] font-semibold"><span className="text-primary">+{fmt(income)}</span><span className="text-destructive">-{fmt(expense)}</span></div>
      </button>
      {open && <div className="divide-y divide-border">
        <div className="grid grid-cols-[minmax(0,1fr)_90px_120px] bg-muted/20 px-4 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><span>Description</span><span>Date</span><span className="text-right">Amount</span></div>
        {monthTransactions.map((t) => <div key={t.id} className="grid grid-cols-[minmax(0,1fr)_90px_120px] items-center px-4 py-2.5 text-xs hover:bg-muted/20">
          <div className="flex min-w-0 items-center gap-2"><div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${isInflow(t) ? "bg-primary/10" : "bg-destructive/10"}`}>{isInflow(t) ? <ArrowUpRight className="h-3.5 w-3.5 text-primary" /> : <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />}</div><span className="truncate text-foreground">{t.description}</span></div>
          <span className="text-muted-foreground">{t.date ? format(new Date(t.date), "MMM d, yyyy") : "—"}</span>
          <span className={`text-right font-semibold ${isInflow(t) ? "text-primary" : "text-destructive"}`}>{isInflow(t) ? "+" : "-"}{fmt(transactionValue(t))}</span>
        </div>)}
      </div>}
    </div>);

}

function AccountTransactions({ accountId, transactions }) {
  const allLinked = transactions.
  filter((t) => t.bank_account_id === accountId).
  sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalIncome = allLinked.filter(isInflow).reduce((sum, transaction) => sum + transactionValue(transaction), 0);
  const totalExpense = allLinked.filter((transaction) => !isInflow(transaction)).reduce((sum, transaction) => sum + transactionValue(transaction), 0);

  if (allLinked.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">No transactions linked to this account yet.</p>);

  }

  const groups = {};
  allLinked.forEach((t) => {
    const key = t.date ? format(new Date(t.date), "MMMM yyyy") : "No Date";
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 divide-x divide-border border-y border-border py-3">
        <div className="px-3 first:pl-0"><p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Total inflow</p><p className="mt-1 text-sm font-bold text-primary">+{fmt(totalIncome)}</p></div>
        <div className="px-3"><p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Total outflow</p><p className="mt-1 text-sm font-bold text-destructive">-{fmt(totalExpense)}</p></div>
        <div className="px-3"><p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Transaction count</p><p className="mt-1 text-sm font-bold text-foreground">{allLinked.length}</p></div>
      </div>
      <div className="space-y-2">
        {Object.entries(groups).map(([monthKey, monthTransactions]) =>
        <MonthGroup key={monthKey} monthKey={monthKey} monthTransactions={monthTransactions} />
        )}
      </div>
    </div>);

}

export default function BankAccounts() {
  const [activeTab, setActiveTab] = useState("accounts");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["bankaccounts"],
    queryFn: () => base44.entities.BankAccount.list("-created_date", 100)
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-date", 1000)
  });

  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const { data: transferRequests = [] } = useQuery({
    queryKey: ["bankTransferRequests"],
    queryFn: () => base44.entities.BankTransferRequest.list("-created_date", 200)
  });

  const { data: receivables = [] } = useQuery({
    queryKey: ["receivables_undeposited"],
    queryFn: () => base44.entities.Receivable.list("-created_date", 500)
  });

  // Calculate undeposited collections (payments without bank_account_id)
  const undepositedCollections = receivables.reduce((total, rec) => {
    const undeposited = (rec.payment_history || []).reduce((sum, payment) => {
      if (!payment.bank_account_id || payment.bank_account_id === "") {
        return sum + (payment.amount || 0);
      }
      return sum;
    }, 0);
    return total + undeposited;
  }, 0);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BankAccount.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bankaccounts"] })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BankAccount.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bankaccounts"] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BankAccount.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bankaccounts"] })
  });

  const handleTransfer = async ({ transfers, date, reference }) => {
    const detailedTransfers = transfers.map((line) => {
      const from = accounts.find((account) => account.id === line.fromId);
      const to = accounts.find((account) => account.id === line.toId);
      return { from_bank_account_id: line.fromId, from_bank_name: `${from.account_name} — ${from.bank_name}`, to_bank_account_id: line.toId, to_bank_name: `${to.account_name} — ${to.bank_name}`, amount: line.amount };
    });
    const first = detailedTransfers[0];
    await base44.entities.BankTransferRequest.create({
      transfers: detailedTransfers, ...first,
      amount: detailedTransfers.reduce((sum, line) => sum + line.amount, 0), transfer_date: date, reference,
      requested_by_name: currentUser?.full_name || currentUser?.email, status: "pending"
    });
    queryClient.invalidateQueries({ queryKey: ["bankTransferRequests"] });
  };

  const approveTransfer = async (request) => {
    const latest = await base44.entities.BankTransferRequest.get(request.id);
    if (latest.status !== "pending") throw new Error("This request has already been reviewed.");
    const lines = latest.transfers?.length ? latest.transfers : [{ from_bank_account_id: latest.from_bank_account_id, to_bank_account_id: latest.to_bank_account_id, amount: latest.amount }];
    const accountIds = [...new Set(lines.flatMap((line) => [line.from_bank_account_id, line.to_bank_account_id]))];
    const fetched = await Promise.all(accountIds.map((id) => base44.entities.BankAccount.get(id)));
    const accountMap = Object.fromEntries(fetched.map((account) => [account.id, account]));
    const outgoing = lines.reduce((totals, line) => ({ ...totals, [line.from_bank_account_id]: (totals[line.from_bank_account_id] || 0) + line.amount }), {});
    if (Object.entries(outgoing).some(([id, amount]) => amount > (accountMap[id]?.current_balance || 0))) throw new Error("A source account has insufficient funds for this request.");
    const suffix = latest.reference ? ` · ${latest.reference}` : "";
    await base44.entities.Transaction.bulkCreate(lines.flatMap((line) => {
      const from = accountMap[line.from_bank_account_id];
      const to = accountMap[line.to_bank_account_id];
      return [
        { description: `Transfer to ${to.account_name}${suffix}`, amount: -line.amount, type: "fund_transfer", category: "fund_transfer", chart_of_account: "Cash and Cash Equivalents", bank_account_id: from.id, date: latest.transfer_date, status: "completed" },
        { description: `Transfer from ${from.account_name}${suffix}`, amount: line.amount, type: "fund_transfer", category: "fund_transfer", chart_of_account: "Cash and Cash Equivalents", bank_account_id: to.id, date: latest.transfer_date, status: "completed" }
      ];
    }));
    const deltas = lines.reduce((totals, line) => ({ ...totals, [line.from_bank_account_id]: (totals[line.from_bank_account_id] || 0) - line.amount, [line.to_bank_account_id]: (totals[line.to_bank_account_id] || 0) + line.amount }), {});
    await base44.entities.BankAccount.bulkUpdate(accountIds.map((id) => ({ id, current_balance: (accountMap[id].current_balance || 0) + deltas[id] })));
    await base44.entities.BankTransferRequest.update(latest.id, { status: "approved", reviewed_by: currentUser?.full_name || currentUser?.email, reviewed_date: new Date().toISOString() });
    queryClient.invalidateQueries({ queryKey: ["bankaccounts"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["bankTransferRequests"] });
  };

  const rejectTransfer = async (request) => {
    await base44.entities.BankTransferRequest.update(request.id, { status: "rejected", reviewed_by: currentUser?.full_name || currentUser?.email, reviewed_date: new Date().toISOString() });
    queryClient.invalidateQueries({ queryKey: ["bankTransferRequests"] });
  };

  const activeAccounts = accounts.filter((a) => a.status !== "closed");
  const totalBalance = activeAccounts.filter((a) => a.bank_name?.trim().toUpperCase() !== "OFFSET BANK ACCOUNT").reduce((s, a) => s + (a.current_balance ?? 0), 0);
  const positiveCount = activeAccounts.filter((a) => (a.current_balance ?? 0) >= 0).length;
  const negativeCount = activeAccounts.filter((a) => (a.current_balance ?? 0) < 0).length;

  return (
    <div className="mx-auto max-w-none space-y-0 font-project-body">
      <section className="bg-slate-950 px-5 pb-8 pt-3 text-white shadow-xl md:px-7">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-400">Treasury Command</p>
            <h1 className="mt-1 font-project-display text-xs font-medium text-slate-300">Total Balance</h1>
            <p className={`font-project-display text-3xl font-bold tracking-tight ${totalBalance >= 0 ? "text-teal-400" : "text-rose-400"}`}>{totalBalance < 0 ? "-" : ""}{fmt(totalBalance)}</p>
            <p className="text-xs text-slate-400">Track balances across all your bank accounts</p>
          </div>
          {activeTab === "accounts" && <div className="flex gap-2"><Button onClick={() => setShowTransfer(true)} variant="outline" className="border-slate-700 bg-slate-900 text-white hover:bg-slate-800 hover:text-white" disabled={activeAccounts.length < 2}><ArrowLeftRight className="mr-2 h-4 w-4" /> Request Bank Transfer</Button><Button onClick={() => setShowAdd(true)} className="bg-teal-500 text-white hover:bg-teal-600"><Plus className="mr-2 h-4 w-4" /> Add Account</Button></div>}
        </div>
        {activeTab === "accounts" && <div className="mt-2 grid gap-3 sm:grid-cols-[1.35fr_1fr_1fr]">
          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3"><div className="rounded-lg bg-amber-500/15 p-2.5"><Building2 className="h-5 w-5 text-amber-400" /></div><div className="min-w-0 flex-1"><p className="text-[10px] uppercase tracking-wide text-slate-400">Undeposited Collections</p><p className="truncate text-lg font-bold text-white">{fmt(undepositedCollections)}</p></div><Button size="sm" variant="outline" className="border-slate-700 text-[10px] text-slate-200 hover:bg-slate-800 hover:text-white" disabled={undepositedCollections <= 0} onClick={() => setShowDeposit(true)}>Deposit Collections</Button></div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3"><div className="rounded-lg bg-teal-500/15 p-2.5"><TrendingUp className="h-5 w-5 text-teal-400" /></div><div><p className="text-[10px] uppercase tracking-wide text-slate-400">Positive Accounts</p><p className="text-xl font-bold text-white">{positiveCount}</p></div></div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/70 p-3"><div className="rounded-lg bg-rose-500/15 p-2.5"><TrendingDown className="h-5 w-5 text-rose-400" /></div><div><p className="text-[10px] uppercase tracking-wide text-slate-400">Overdrawn / Negative</p><p className="text-xl font-bold text-white">{negativeCount}</p></div></div>
        </div>}
      </section>

      {/* Tabs */}
      <ExecutiveSegmentBar
        className="relative -mt-9 mx-3 bg-card md:mx-6"
        items={[{ key: "accounts", label: "Bank Accounts", icon: Building2 }, { key: "reconciliation", label: "Bank Reconciliation", icon: RefreshCw }, { key: "summary", label: "Summary Report", icon: FileBarChart }, { key: "checks", label: "Check Monitoring", icon: ClipboardCheck }]}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "reconciliation" && <BankReconciliationPage />}

      {activeTab === "summary" && <BankAccountSummaryReport accounts={accounts} />}

      {activeTab === "checks" && <CheckMonitoring />}

      {activeTab === "accounts" && <>

      {currentUser?.role === "admin" && <BankTransferApprovals requests={transferRequests.filter((request) => request.status === "pending")} onApprove={approveTransfer} onReject={rejectTransfer} />}

      {/* Account portfolio and transaction ledger */}
      {isLoading ?
      <div className="rounded-2xl border border-border bg-card py-16 text-center text-muted-foreground">Loading...</div> :
      accounts.length === 0 ?
      <div className="rounded-2xl border border-border bg-card py-16 text-center text-muted-foreground">
          <Building2 className="mx-auto mb-3 h-10 w-10 opacity-30" />
          <p className="font-medium">No bank accounts added yet</p>
          <p className="mt-1 text-sm">Add your first account to start tracking balances</p>
        </div> :
      <div className="grid gap-3 rounded-2xl border border-border bg-muted/30 p-3 shadow-lg xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="space-y-3">
          {accounts.map((account) => {
            const bal = account.current_balance ?? 0;
            const isNeg = bal < 0;
            return <article key={account.id} className="rounded-xl border border-border bg-card p-4 shadow-sm first:border-primary">
              <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-2.5"><div className="rounded-lg bg-primary/10 p-2"><Building2 className="h-4 w-4 text-primary" /></div><div className="min-w-0"><p className="truncate text-sm font-bold text-foreground">{account.account_name}</p><p className="truncate text-xs font-semibold uppercase tracking-wide text-primary">{account.bank_name}</p></div></div><div className="flex items-center"><button onClick={() => setEditing(account)} className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button><button onClick={() => deleteMutation.mutate(account.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button></div></div>
              <div className="mt-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Current Balance</p><p className={`font-project-display text-xl font-bold ${isNeg ? "text-destructive" : "text-foreground"}`}>{isNeg ? "-" : ""}{fmt(bal)}</p></div>
              <div className="mt-3 flex items-end justify-between gap-2"><div><p className="text-[10px] text-muted-foreground">Account Type</p><p className="text-xs font-medium capitalize text-foreground">{(account.account_type || "other").replace(/_/g, " ")}</p>{account.account_number && <p className="mt-0.5 text-[10px] text-muted-foreground">•••• {account.account_number}</p>}</div><Badge variant={account.status === "active" ? "default" : "secondary"} className="text-[10px] capitalize">{account.status || "active"}</Badge></div>
              {account.notes && <p className="mt-3 border-t border-border pt-2 text-[10px] text-muted-foreground">{account.notes}</p>}
            </article>;
          })}
        </aside>
        <section className="min-w-0 rounded-xl border border-border bg-card p-4 md:p-5">
          <div className="space-y-6">
            {accounts.map((account) => <article key={account.id} className="space-y-3 border-b border-border pb-6 last:border-0 last:pb-0">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-start"><div><p className="text-sm font-bold text-foreground">{account.account_name}</p><p className="text-xs font-semibold uppercase tracking-wide text-primary">{account.bank_name}</p></div><div className="text-left sm:text-right"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Current Balance</p><p className="text-sm font-bold text-foreground">{account.current_balance < 0 ? "-" : ""}{fmt(account.current_balance)}</p></div></div>
              <AccountTransactions accountId={account.id} transactions={transactions} />
            </article>)}
          </div>
        </section>
      </div>
      }

      <AddFormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title="Add Bank Account"
        fields={fields}
        onSubmit={(data) => createMutation.mutateAsync(data)} />
      
      <AddFormDialog
        open={!!editing}
        onOpenChange={(v) => {if (!v) setEditing(null);}}
        title="Edit Bank Account"
        fields={fields}
        initialData={editing || {}}
        onSubmit={(data) => updateMutation.mutateAsync({ id: editing.id, data })} />

      <BankTransferDialog
        open={showTransfer}
        onOpenChange={setShowTransfer}
        accounts={accounts}
        onSubmit={handleTransfer}
      />

      <DepositUndepositedDialog
        open={showDeposit}
        onOpenChange={setShowDeposit}
        receivables={receivables}
        bankAccounts={accounts}
        onDone={() => {
          setShowDeposit(false);
          queryClient.invalidateQueries({ queryKey: ["receivables_undeposited"] });
          queryClient.invalidateQueries({ queryKey: ["transactions"] });
        }}
      />
      </>}
      
    </div>);

}