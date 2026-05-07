import { Card } from "@/components/ui/card";
import { TrendingDown, Landmark, AlertCircle } from "lucide-react";

export default function DebtSummarySectionTop({ debts }) {
  const activeDebts = debts.filter(d => d.status === "active");
  
  const totalDebt = activeDebts.reduce((s, d) => s + ((d.total_amount || 0) - (d.amount_paid || 0)), 0);
  const totalOutstanding = activeDebts.reduce((s, d) => s + ((d.total_amount || 0) - (d.amount_paid || 0)), 0);
  
  // Weighted average interest rate
  const weightedRate = totalOutstanding > 0
    ? activeDebts.reduce((s, d) => {
        const outstanding = (d.total_amount || 0) - (d.amount_paid || 0);
        return s + ((d.interest_rate || 0) * outstanding);
      }, 0) / totalOutstanding
    : 0;

  // 6-month cash flow impact
  const sixMonthPayments = activeDebts.reduce((s, d) => s + ((d.monthly_payment || 0) * 6), 0);
  const sixMonthInterest = activeDebts.reduce((s, d) => {
    const interest1yr = d.interest_accrued_1yr || ((d.total_amount || 0) * (d.interest_rate || 0) / 100);
    return s + (interest1yr / 2); // Approximate 6-month interest
  }, 0);
  const totalSixMonthImpact = sixMonthPayments + sixMonthInterest;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-5 bg-gradient-to-br from-card to-secondary/30 border-border">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground font-medium mb-1">Total Debt Outstanding</p>
            <p className="text-2xl md:text-3xl font-bold text-foreground">
              ₱{totalDebt.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {activeDebts.length} active loan{activeDebts.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Landmark className="w-8 h-8 text-chart-1/40 flex-shrink-0" />
        </div>
      </Card>

      <Card className="p-5 bg-gradient-to-br from-card to-secondary/30 border-border">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground font-medium mb-1">Weighted Avg Interest Rate</p>
            <p className="text-2xl md:text-3xl font-bold text-foreground">
              {weightedRate.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Annual percentage rate
            </p>
          </div>
          <AlertCircle className="w-8 h-8 text-chart-5/40 flex-shrink-0" />
        </div>
      </Card>

      <Card className="p-5 bg-gradient-to-br from-card to-secondary/30 border-border">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground font-medium mb-1">6-Month Cash Impact</p>
            <p className="text-2xl md:text-3xl font-bold text-destructive">
              ₱{totalSixMonthImpact.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Payments + Interest
            </p>
          </div>
          <TrendingDown className="w-8 h-8 text-destructive/40 flex-shrink-0" />
        </div>
      </Card>
    </div>
  );
}