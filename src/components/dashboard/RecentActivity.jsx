import { format } from "date-fns";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function RecentActivity({ transactions }) {
  const recent = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 8);

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-1">Recent Activity</h3>
      <p className="text-sm text-muted-foreground mb-4">Latest transactions</p>
      <div className="space-y-3">
        {recent.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No transactions yet</p>
        )}
        {recent.map((t) => (
          <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                t.type === "income" ? "bg-primary/10" : "bg-destructive/10"
              }`}>
                {t.type === "income"
                  ? <ArrowUpRight className="w-4 h-4 text-primary" />
                  : <ArrowDownRight className="w-4 h-4 text-destructive" />
                }
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{t.description}</p>
                <p className="text-xs text-muted-foreground">
                  {t.project_name || (t.category || "").replace(/_/g, " ")}
                  {t.date && ` · ${format(new Date(t.date), "MMM d")}`}
                </p>
              </div>
            </div>
            <span className={`text-sm font-semibold ${
              t.type === "income" ? "text-primary" : "text-destructive"
            }`}>
              {t.type === "income" ? "+" : "-"}${(t.amount || 0).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}