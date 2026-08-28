import { useMemo } from "react";
import { Droplets, Scale, Wallet, PiggyBank } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { getLoanBalance } from "@/lib/loanBalance";

const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const ratioColor = (value, good, warn) =>
  value >= good ? "text-primary" : value >= warn ? "text-chart-3" : "text-destructive";

function RatioCard({ icon: Icon, label, value, display, hint, good, warn }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Icon className={`w-4 h-4 ${ratioColor(value, good, warn)}`} />
      </div>
      <p className={`text-2xl font-bold ${ratioColor(value, good, warn)}`}>{display}</p>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
    </div>
  );
}

export default function FinancialRatiosPanel() {
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bank_accounts_ratios"],
    queryFn: () => base44.entities.BankAccount.list("-created_date", 500),
  });
  const { data: payables = [] } = useQuery({
    queryKey: ["payables_efficiency"],
    queryFn: () => base44.entities.Payable.list("-created_date", 10000),
  });
  const { data: receivables = [] } = useQuery({
    queryKey: ["receivables_efficiency"],
    queryFn: () => base44.entities.Receivable.list("-created_date", 10000),
  });
  const { data: wcLoans = [] } = useQuery({
    queryKey: ["wc_loans_ratios"],
    queryFn: () => base44.entities.WorkingCapitalLoan.list("-created_date", 1000),
  });

  const m = useMemo(() => {
    const cash = bankAccounts
      .filter((b) => b.status !== "closed")
      .reduce((s, b) => s + (b.current_balance || 0), 0);
    const receivablesOutstanding = receivables
      .filter((r) => r.status !== "paid")
      .reduce((s, r) => s + ((r.amount || 0) - (r.amount_paid || 0)), 0);
    const payablesOutstanding = payables
      .filter((p) => p.status !== "paid")
      .reduce((s, p) => s + ((p.amount || 0) - (p.withholding_tax_amount || 0) - (p.amount_paid || 0)), 0);
    const loanDebt = wcLoans
      .filter((l) => l.status === "active")
      .reduce((s, l) => s + getLoanBalance(l), 0);

    const currentAssets = cash + receivablesOutstanding;
    const currentLiabilities = payablesOutstanding;
    const totalDebt = payablesOutstanding + loanDebt;

    return {
      cash,
      receivablesOutstanding,
      payablesOutstanding,
      loanDebt,
      currentAssets,
      currentLiabilities,
      workingCapital: currentAssets - currentLiabilities,
      currentRatio: currentLiabilities > 0 ? currentAssets / currentLiabilities : Infinity,
      quickRatio: currentLiabilities > 0 ? (cash + receivablesOutstanding) / currentLiabilities : Infinity,
      cashRatio: currentLiabilities > 0 ? cash / currentLiabilities : Infinity,
      debtToAssets: currentAssets > 0 ? totalDebt / currentAssets : 0,
    };
  }, [bankAccounts, payables, receivables, wcLoans]);

  const showRatio = (v) => (v === Infinity ? "∞" : v.toFixed(2));

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Droplets className="w-4 h-4 text-chart-2" />
        Liquidity & Financial Ratios
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <RatioCard
          icon={Droplets}
          label="Current Ratio"
          value={m.currentRatio}
          display={showRatio(m.currentRatio)}
          hint="Current assets ÷ current liabilities (target ≥ 1.5)"
          good={1.5}
          warn={1.0}
        />
        <RatioCard
          icon={Wallet}
          label="Cash Ratio"
          value={m.cashRatio}
          display={showRatio(m.cashRatio)}
          hint="Cash ÷ current liabilities (target ≥ 0.5)"
          good={0.5}
          warn={0.2}
        />
        <RatioCard
          icon={PiggyBank}
          label="Working Capital"
          value={m.workingCapital >= 0 ? 2 : 0}
          display={fmt(m.workingCapital)}
          hint="Current assets − current liabilities"
          good={1}
          warn={0.5}
        />
        <RatioCard
          icon={Scale}
          label="Debt-to-Assets"
          value={m.debtToAssets <= 0.5 ? 2 : m.debtToAssets <= 1 ? 1 : 0}
          display={m.debtToAssets.toFixed(2)}
          hint="Total debt ÷ current assets (target ≤ 0.5)"
          good={2}
          warn={1}
        />
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h4 className="text-sm font-semibold text-foreground mb-4">Ratio Components</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-sm text-muted-foreground">Cash & Bank Balances</span>
            <span className="text-sm font-semibold text-primary">{fmt(m.cash)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-sm text-muted-foreground">Outstanding Receivables</span>
            <span className="text-sm font-semibold text-foreground">{fmt(m.receivablesOutstanding)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-sm text-muted-foreground">Outstanding Payables</span>
            <span className="text-sm font-semibold text-destructive">{fmt(m.payablesOutstanding)}</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="text-sm text-muted-foreground">Active Loan Balances</span>
            <span className="text-sm font-semibold text-destructive">{fmt(m.loanDebt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}