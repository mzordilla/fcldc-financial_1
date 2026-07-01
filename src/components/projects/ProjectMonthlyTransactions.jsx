import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function ProjectMonthlyTransactions({ transactions = [] }) {
  const [expandedMonth, setExpandedMonth] = useState(null);

  const byMonth = {};
  transactions.forEach((t) => {
    if (!t.date) return;
    const key = format(parseISO(t.date), "yyyy-MM");
    if (!byMonth[key]) byMonth[key] = [];
    byMonth[key].push(t);
  });

  const months = Object.keys(byMonth).sort().reverse();

  if (months.length === 0) {
    return <p className="text-sm text-muted-foreground">No transactions recorded</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground mb-1">Transactions by Month</p>
      {months.map((key) => {
        const label = format(parseISO(`${key}-01`), "MMMM yyyy");
        const txs = byMonth[key].slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        const income = txs.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
        const expenses = txs.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
        const isOpen = expandedMonth === key;

        return (
          <div key={key} className="border border-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandedMonth(isOpen ? null : key)}
              className="w-full flex items-center justify-between px-3 py-2 text-xs bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                <span className="font-medium text-foreground">{label}</span>
                <span className="text-muted-foreground">({txs.length})</span>
              </div>
              <div className="flex gap-3">
                {income > 0 && <span className="text-primary font-medium">+₱{income.toLocaleString()}</span>}
                {expenses > 0 && <span className="text-destructive font-medium">-₱{expenses.toLocaleString()}</span>}
              </div>
            </button>
            {isOpen && (
              <div className="divide-y divide-border/50">
                {txs.map((t) => (
                  <div key={t.id} className="flex items-center justify-between px-3 py-2 text-xs hover:bg-muted/20">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-muted-foreground whitespace-nowrap">{t.date ? format(parseISO(t.date), "MMM d") : "—"}</span>
                      <span className="text-foreground truncate">{t.description || "—"}</span>
                      <Badge variant="secondary" className="text-xs shrink-0">{t.category || "other"}</Badge>
                    </div>
                    <span className={`font-semibold shrink-0 ml-2 ${t.type === "income" ? "text-primary" : "text-destructive"}`}>
                      {t.type === "income" ? "+" : "-"}₱{(t.amount || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}