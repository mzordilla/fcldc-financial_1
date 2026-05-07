import { AlertTriangle, DollarSign, Calendar } from "lucide-react";

export default function DebtSummary({ debts = [], loans = [] }) {
  const activeDebts = debts.filter(d => d.status === "active");
  const activeLoans = loans.filter(l => l.status === "active");
  
  // Calculate totals
  const totalDebtObligation = activeDebts.reduce((s, d) => s + ((d.total_amount || 0) - (d.amount_paid || 0)), 0);
  const totalLoanObligation = activeLoans.reduce((s, l) => s + ((l.outstanding_balance || 0)), 0);
  const totalObligation = totalDebtObligation + totalLoanObligation;
  
  const monthlyDebtPayments = activeDebts.reduce((s, d) => s + (d.monthly_payment || 0), 0);
  const monthlyLoanPayments = activeLoans.reduce((s, l) => s + (l.monthly_payment || 0), 0);
  const totalMonthlyPayments = monthlyDebtPayments + monthlyLoanPayments;
  
  const totalInterestAccrued = activeDebts.reduce((s, d) => {
    const rate = (d.interest_rate || 0) / 100 / 12;
    const balance = (d.total_amount || 0) - (d.amount_paid || 0);
    return s + (balance * rate);
  }, 0) + activeLoans.reduce((s, l) => {
    const rate = (l.interest_rate || 0) / 100 / 12;
    return s + ((l.outstanding_balance || 0) * rate);
  }, 0);

  const fmt = (v) => `₱${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Loan Obligations</p>
            <p className="text-2xl font-bold text-foreground">{fmt(totalObligation)}</p>
            <p className="text-xs text-muted-foreground mt-2">{activeDebts.length + activeLoans.length} active loans</p>
          </div>
          <AlertTriangle className="w-5 h-5 text-chart-5 flex-shrink-0" />
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Monthly Payments Due</p>
            <p className="text-2xl font-bold text-foreground">{fmt(totalMonthlyPayments)}</p>
            <p className="text-xs text-muted-foreground mt-2">/month</p>
          </div>
          <Calendar className="w-5 h-5 text-chart-2 flex-shrink-0" />
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Monthly Interest Accrued</p>
            <p className="text-2xl font-bold text-foreground">{fmt(totalInterestAccrued)}</p>
            <p className="text-xs text-muted-foreground mt-2">/month</p>
          </div>
          <DollarSign className="w-5 h-5 text-destructive flex-shrink-0" />
        </div>
      </div>
    </div>
  );
}