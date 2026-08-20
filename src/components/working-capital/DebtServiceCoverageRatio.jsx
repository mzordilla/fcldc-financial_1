import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLoanBalance } from "@/lib/loanBalance";

export default function DebtServiceCoverageRatio({ items }) {
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);

  const totalMonthlyDebt = items
    .filter(d => d.status === "active")
    .reduce((sum, loan) => {
      const principal = getLoanBalance(loan);
      const monthlyInterest = principal > 0 ? (principal * (loan.interest_rate || 0) / 12 / 100) : 0;
      return sum + (loan.monthly_payment || 0) + monthlyInterest;
    }, 0);

  const dscr = monthlyRevenue > 0 ? monthlyRevenue / totalMonthlyDebt : 0;
  const healthStatus = dscr >= 1.25 ? "Healthy" : dscr >= 1 ? "Acceptable" : "At Risk";
  const statusColor = dscr >= 1.25 ? "text-primary" : dscr >= 1 ? "text-chart-3" : "text-destructive";

  return (
    <Card className="rounded-xl p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="font-project-display text-base font-bold leading-tight text-foreground">Debt Service Coverage Ratio (DSCR)</h3>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="revenue" className="text-sm">Monthly Revenue (₱)</Label>
          <Input
            id="revenue"
            type="number"
            placeholder="Enter monthly revenue"
            value={monthlyRevenue || ""}
            onChange={(e) => setMonthlyRevenue(parseFloat(e.target.value) || 0)}
            className="mt-1 h-8 text-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-border pt-3">
          <div>
            <p className="text-xs text-muted-foreground">Monthly Debt Service</p>
            <p className="text-lg font-bold text-destructive">₱{totalMonthlyDebt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">DSCR</p>
            <p className={`text-lg font-bold ${statusColor}`}>{dscr.toFixed(2)}x</p>
          </div>
        </div>

        <div className="border-t border-border pt-3">
          <p className="text-xs font-semibold text-muted-foreground mb-2">Status</p>
          <p className={`text-sm font-semibold ${statusColor}`}>{healthStatus}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {dscr >= 1.25 && "Strong ability to service debt obligations"}
            {dscr >= 1 && dscr < 1.25 && "Adequate debt coverage; monitor closely"}
            {dscr < 1 && "Insufficient income to cover debt service"}
          </p>
        </div>
      </div>
    </Card>
  );
}