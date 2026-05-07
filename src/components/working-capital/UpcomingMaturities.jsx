import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, CheckCircle } from "lucide-react";
import { differenceInDays, format } from "date-fns";

export default function UpcomingMaturities({ items }) {
  const today = new Date();
  const activeLoans = items.filter(d => d.status === "active" && d.due_date);

  // Group loans by maturity buckets
  const buckets = {
    "30 Days": { min: 0, max: 30, loans: [], color: "bg-destructive/10 text-destructive", icon: AlertCircle },
    "30-60 Days": { min: 31, max: 60, loans: [], color: "bg-chart-3/10 text-chart-3", icon: Clock },
    "60-90 Days": { min: 61, max: 90, loans: [], color: "bg-chart-2/10 text-chart-2", icon: Clock },
    "90+ Days": { min: 91, max: 365, loans: [], color: "bg-primary/10 text-primary", icon: CheckCircle },
  };

  activeLoans.forEach(loan => {
    const daysUntilDue = differenceInDays(new Date(loan.due_date), today);
    
    if (daysUntilDue <= 30) {
      buckets["30 Days"].loans.push({ ...loan, daysUntilDue });
    } else if (daysUntilDue <= 60) {
      buckets["30-60 Days"].loans.push({ ...loan, daysUntilDue });
    } else if (daysUntilDue <= 90) {
      buckets["60-90 Days"].loans.push({ ...loan, daysUntilDue });
    } else if (daysUntilDue <= 365) {
      buckets["90+ Days"].loans.push({ ...loan, daysUntilDue });
    }
  });

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">Upcoming Loan Maturities</h3>
        <p className="text-sm text-muted-foreground">12-month repayment schedule overview</p>
      </div>

      <div className="space-y-4">
        {Object.entries(buckets).map(([bucketName, bucket]) => {
          const Icon = bucket.icon;
          return (
            <div key={bucketName} className={`p-4 rounded-lg border border-border ${bucket.color.split(" ")[0]}`}>
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`w-5 h-5 ${bucket.color.split(" ")[1]}`} />
                <span className="font-semibold text-sm">{bucketName}</span>
                <Badge variant="secondary" className="ml-auto text-xs">{bucket.loans.length} loans</Badge>
              </div>
              
              {bucket.loans.length === 0 ? (
                <p className="text-xs text-muted-foreground">No loans due in this period</p>
              ) : (
                <div className="space-y-2">
                  {bucket.loans.sort((a, b) => a.daysUntilDue - b.daysUntilDue).map(loan => (
                    <div key={loan.id} className="text-xs bg-card/50 p-2 rounded border border-border">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-foreground">{loan.creditor}</p>
                          <p className="text-muted-foreground text-xs mt-0.5">Due: {format(new Date(loan.due_date), "MMM d, yyyy")}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">₱{((loan.total_amount || 0) - (loan.amount_paid || 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                          <p className="text-muted-foreground text-xs">{loan.daysUntilDue} days</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}