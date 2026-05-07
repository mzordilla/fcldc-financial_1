import { Building2, TrendingDown, TrendingUp, Minus } from "lucide-react";

const fmt = (v) =>
  `₱${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function DeductionRow({ label, amount, color }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>- {fmt(amount)}</span>
    </div>
  );
}

export default function BankBalanceSection({ transactions = [], payables = [], loans = [], debts = [] }) {
  // Gross bank balance = all income transactions minus all expense transactions
  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + (t.amount || 0), 0);

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + (t.amount || 0), 0);

  const grossBalance = totalIncome - totalExpenses;

  // Deductions
  const unpaidPayables = payables
    .filter((p) => p.status !== "paid")
    .reduce((s, p) => s + ((p.amount || 0) - (p.amount_paid || 0)), 0);

  const activeDebtBalance = debts
    .filter((d) => d.status === "active")
    .reduce((s, d) => s + ((d.total_amount || 0) - (d.amount_paid || 0)), 0);

  const totalDeductions = unpaidPayables + activeDebtBalance;
  const netBankBalance = grossBalance - totalDeductions;

  const deductions = [
    { label: "Unpaid Payables", amount: unpaidPayables, color: "text-chart-3" },
    { label: "Working Capital Loans", amount: activeDebtBalance, color: "text-destructive" },
  ];

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center gap-2 mb-5">
        <div className="p-2 rounded-lg bg-primary/10">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Bank Balance Summary</h3>
          <p className="text-xs text-muted-foreground">Net position after all financial obligations</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: balance breakdown */}
        <div className="space-y-1">
          {/* Gross balance */}
          <div className="flex items-center justify-between py-2 border-b border-border">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Gross Cash Balance</span>
            </div>
            <span className="text-sm font-bold text-primary">{fmt(grossBalance)}</span>
          </div>

          {/* Deductions */}
          {deductions.map((d) => (
            <DeductionRow key={d.label} {...d} />
          ))}

          {/* Separator */}
          <div className="flex items-center justify-between pt-3 mt-1">
            <div className="flex items-center gap-2">
              <Minus className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-semibold text-muted-foreground">Total Deductions</span>
            </div>
            <span className="text-sm font-bold text-destructive">- {fmt(totalDeductions)}</span>
          </div>
        </div>

        {/* Right: net balance card */}
        <div className="flex flex-col items-center justify-center bg-muted rounded-xl p-6 text-center">
          <div className={`p-3 rounded-full mb-3 ${netBankBalance >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}>
            {netBankBalance >= 0
              ? <TrendingUp className="w-6 h-6 text-primary" />
              : <TrendingDown className="w-6 h-6 text-destructive" />}
          </div>
          <p className="text-xs text-muted-foreground mb-1">Estimated Net Bank Balance</p>
          <p className={`text-3xl font-bold ${netBankBalance >= 0 ? "text-primary" : "text-destructive"}`}>
            {netBankBalance < 0 ? "-" : ""}{fmt(netBankBalance)}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            After deducting payables, loans & debts
          </p>

          {/* Mini breakdown pills */}
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              Income {fmt(totalIncome)}
            </span>
            <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-medium">
              Expenses {fmt(totalExpenses)}
            </span>
            <span className="text-[10px] bg-chart-5/10 text-chart-5 px-2 py-0.5 rounded-full font-medium">
              Obligations {fmt(totalDeductions)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}