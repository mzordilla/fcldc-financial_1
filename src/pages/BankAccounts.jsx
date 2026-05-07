import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Building2, Pencil, Trash2, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import AddFormDialog from "../components/shared/AddFormDialog";

const ACCOUNT_TYPES = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "money_market", label: "Money Market" },
  { value: "line_of_credit", label: "Line of Credit" },
  { value: "other", label: "Other" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "closed", label: "Closed" },
];

const fields = [
  { name: "bank_name", label: "Bank Name", required: true, placeholder: "e.g. Chase, Wells Fargo" },
  { name: "account_name", label: "Account Name / Nickname", required: true, placeholder: "e.g. Main Operating Account" },
  { name: "account_number", label: "Account # (last 4 digits)", placeholder: "e.g. 4521" },
  { name: "account_type", label: "Account Type", type: "select", options: ACCOUNT_TYPES },
  { name: "current_balance", label: "Current Balance ($)", type: "number", required: true, placeholder: "0.00" },
  { name: "currency", label: "Currency", placeholder: "USD" },
  { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
  { name: "notes", label: "Notes", placeholder: "Optional notes" },
];

const typeColors = {
  checking: "bg-primary/10 text-primary",
  savings: "bg-chart-2/10 text-chart-2",
  money_market: "bg-chart-3/10 text-chart-3",
  line_of_credit: "bg-destructive/10 text-destructive",
  other: "bg-muted text-muted-foreground",
};

const fmt = (v) =>
  `$${Math.abs(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function BankAccounts() {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["bankaccounts"],
    queryFn: () => base44.entities.BankAccount.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BankAccount.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bankaccounts"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BankAccount.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bankaccounts"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BankAccount.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bankaccounts"] }),
  });

  const activeAccounts = accounts.filter((a) => a.status !== "closed");
  const totalBalance = activeAccounts.reduce((s, a) => s + (a.current_balance ?? 0), 0);
  const positiveCount = activeAccounts.filter((a) => (a.current_balance ?? 0) >= 0).length;
  const negativeCount = activeAccounts.filter((a) => (a.current_balance ?? 0) < 0).length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Bank Accounts</h1>
          <p className="text-muted-foreground mt-1">Track balances across all your bank accounts</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Account
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Balance</p>
            <p className={`text-xl font-bold ${totalBalance >= 0 ? "text-primary" : "text-destructive"}`}>
              {totalBalance < 0 ? "-" : ""}{fmt(totalBalance)}
            </p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Positive Accounts</p>
            <p className="text-xl font-bold text-foreground">{positiveCount}</p>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-destructive/10">
            <TrendingDown className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Overdrawn / Negative</p>
            <p className="text-xl font-bold text-foreground">{negativeCount}</p>
          </div>
        </div>
      </div>

      {/* Account Cards */}
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading...</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No bank accounts added yet</p>
          <p className="text-sm mt-1">Add your first account to start tracking balances</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {accounts.map((account) => {
            const bal = account.current_balance ?? 0;
            const isNeg = bal < 0;
            return (
              <div
                key={account.id}
                className="bg-card rounded-2xl border border-border p-5 space-y-4 hover:shadow-md transition-shadow"
              >
                {/* Top Row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary/10">
                      <Building2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground leading-tight">{account.account_name}</p>
                      <p className="text-xs text-muted-foreground">{account.bank_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditing(account)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteMutation.mutate(account.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Balance */}
                <div className={`rounded-xl p-4 text-center ${isNeg ? "bg-destructive/5" : "bg-primary/5"}`}>
                  <p className="text-xs text-muted-foreground mb-1">Current Balance</p>
                  <p className={`text-2xl font-bold ${isNeg ? "text-destructive" : "text-primary"}`}>
                    {isNeg ? "-" : ""}{fmt(bal)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{account.currency || "USD"}</p>
                </div>

                {/* Meta */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {account.account_type && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[account.account_type] || typeColors.other}`}>
                        {account.account_type.replace(/_/g, " ")}
                      </span>
                    )}
                    {account.account_number && (
                      <span className="text-xs text-muted-foreground">•••• {account.account_number}</span>
                    )}
                  </div>
                  <Badge
                    variant={account.status === "active" ? "default" : "secondary"}
                    className="text-xs capitalize"
                  >
                    {account.status || "active"}
                  </Badge>
                </div>

                {account.notes && (
                  <p className="text-xs text-muted-foreground border-t border-border pt-3">{account.notes}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AddFormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title="Add Bank Account"
        fields={fields}
        onSubmit={(data) => createMutation.mutateAsync(data)}
      />
      <AddFormDialog
        open={!!editing}
        onOpenChange={(v) => { if (!v) setEditing(null); }}
        title="Edit Bank Account"
        fields={fields}
        initialData={editing || {}}
        onSubmit={(data) => updateMutation.mutateAsync({ id: editing.id, data })}
      />
    </div>
  );
}