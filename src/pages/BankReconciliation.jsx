import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { Plus, CheckCircle2, AlertTriangle, Clock, Pencil, Trash2, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ReconciliationDialog from "../components/reconciliation/ReconciliationDialog";

const fmt = (v) => `₱${(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_CONFIG = {
  reconciled: { label: "Reconciled", icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10 text-primary border-primary/20" },
  discrepancy: { label: "Discrepancy", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10 text-destructive border-destructive/20" },
  in_progress: { label: "In Progress", icon: Clock, color: "text-chart-3", bg: "bg-chart-3/10 text-chart-3 border-chart-3/20" },
};

function computeAdjustedBank(rec) {
  return (rec.closing_balance_bank || 0)
    + (rec.deposits_in_transit || 0)
    - (rec.outstanding_checks || 0)
    + (rec.bank_errors || 0);
}

function computeAdjustedBook(rec) {
  return (rec.closing_balance_book || 0)
    + (rec.interest_earned || 0)
    - (rec.bank_charges || 0)
    + (rec.book_errors || 0);
}

function ReconciliationCard({ rec, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = STATUS_CONFIG[rec.status] || STATUS_CONFIG.in_progress;
  const Icon = cfg.icon;

  const adjBank = computeAdjustedBank(rec);
  const adjBook = computeAdjustedBook(rec);
  const diff = adjBank - adjBook;
  const isBalanced = Math.abs(diff) < 0.01;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-foreground">{rec.account_name || "Bank Account"}</p>
          <p className="text-sm text-muted-foreground">{rec.period_label || `${rec.period_start} – ${rec.period_end}`}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-xs ${cfg.bg}`}>
            <Icon className="w-3 h-3 mr-1" />
            {cfg.label}
          </Badge>
          <button onClick={() => onEdit(rec)} className="text-muted-foreground hover:text-foreground p-1">
            <Pencil className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(rec.id)} className="text-muted-foreground hover:text-destructive p-1">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Balance Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-muted/40 rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Adjusted Bank</p>
          <p className="text-lg font-bold text-foreground">{fmt(adjBank)}</p>
        </div>
        <div className="bg-muted/40 rounded-xl p-3 text-center">
          <p className="text-xs text-muted-foreground mb-0.5">Adjusted Book</p>
          <p className="text-lg font-bold text-foreground">{fmt(adjBook)}</p>
        </div>
      </div>

      {/* Difference */}
      <div className={`flex items-center justify-between rounded-xl px-4 py-2.5 ${isBalanced ? "bg-primary/5 border border-primary/20" : "bg-destructive/5 border border-destructive/20"}`}>
        <span className="text-sm font-medium">Difference</span>
        <span className={`text-base font-bold ${isBalanced ? "text-primary" : "text-destructive"}`}>
          {isBalanced ? "✓ Balanced" : fmt(diff)}
        </span>
      </div>

      {/* Expandable Details */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-primary hover:underline"
      >
        {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {expanded ? "Hide details" : "Show details"}
      </button>

      {expanded && (
        <div className="space-y-2 text-sm border-t border-border pt-3">
          <div className="grid grid-cols-2 gap-4">
            {/* Bank side */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bank Statement</p>
              <div className="flex justify-between"><span className="text-muted-foreground">Closing Balance</span><span>{fmt(rec.closing_balance_bank)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">+ Deposits in Transit</span><span className="text-primary">{fmt(rec.deposits_in_transit)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">− Outstanding Checks</span><span className="text-destructive">{fmt(rec.outstanding_checks)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">± Bank Errors</span><span>{fmt(rec.bank_errors)}</span></div>
              <div className="flex justify-between border-t border-border pt-1 font-semibold"><span>Adjusted Bank</span><span>{fmt(adjBank)}</span></div>
            </div>
            {/* Book side */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Books / System</p>
              <div className="flex justify-between"><span className="text-muted-foreground">Closing Balance</span><span>{fmt(rec.closing_balance_book)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">+ Interest Earned</span><span className="text-primary">{fmt(rec.interest_earned)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">− Bank Charges</span><span className="text-destructive">{fmt(rec.bank_charges)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">± Book Errors</span><span>{fmt(rec.book_errors)}</span></div>
              <div className="flex justify-between border-t border-border pt-1 font-semibold"><span>Adjusted Book</span><span>{fmt(adjBook)}</span></div>
            </div>
          </div>
          {rec.notes && <p className="text-xs text-muted-foreground border-t border-border pt-2">{rec.notes}</p>}
        </div>
      )}
    </div>
  );
}

export default function BankReconciliationPage() {
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: reconciliations = [], isLoading } = useQuery({
    queryKey: ["bank_reconciliations"],
    queryFn: () => base44.entities.BankReconciliation.list("-period_end", 100),
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankaccounts"],
    queryFn: () => base44.entities.BankAccount.list("-created_date", 100),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-date", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BankReconciliation.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bank_reconciliations"] }); setShowDialog(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BankReconciliation.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["bank_reconciliations"] }); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BankReconciliation.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bank_reconciliations"] }),
  });

  const summary = useMemo(() => {
    const total = reconciliations.length;
    const reconciled = reconciliations.filter(r => r.status === "reconciled").length;
    const discrepancy = reconciliations.filter(r => r.status === "discrepancy").length;
    const inProgress = reconciliations.filter(r => r.status === "in_progress").length;
    return { total, reconciled, discrepancy, inProgress };
  }, [reconciliations]);

  function handleEdit(rec) {
    setEditing(rec);
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Bank Reconciliation</h1>
          <p className="text-muted-foreground mt-1">Match your books against bank statements</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Reconciliation
        </Button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Total</p>
          <p className="text-2xl font-bold text-foreground">{summary.total}</p>
        </div>
        <div className="bg-card border border-primary/20 rounded-2xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Reconciled</p>
          <p className="text-2xl font-bold text-primary">{summary.reconciled}</p>
        </div>
        <div className="bg-card border border-chart-3/20 rounded-2xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">In Progress</p>
          <p className="text-2xl font-bold text-chart-3">{summary.inProgress}</p>
        </div>
        <div className="bg-card border border-destructive/20 rounded-2xl p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Discrepancy</p>
          <p className="text-2xl font-bold text-destructive">{summary.discrepancy}</p>
        </div>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading...</div>
      ) : reconciliations.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <RefreshCw className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No reconciliations yet</p>
          <p className="text-sm mt-1">Create one to start matching your bank statements</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {reconciliations.map(rec => (
            <ReconciliationCard
              key={rec.id}
              rec={rec}
              onEdit={handleEdit}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      <ReconciliationDialog
        open={showDialog || !!editing}
        onOpenChange={(v) => { if (!v) { setShowDialog(false); setEditing(null); } }}
        bankAccounts={bankAccounts}
        transactions={transactions}
        initialData={editing}
        onSubmit={(data) => {
          if (editing) {
            updateMutation.mutateAsync({ id: editing.id, data });
          } else {
            createMutation.mutateAsync(data);
          }
        }}
      />
    </div>
  );
}