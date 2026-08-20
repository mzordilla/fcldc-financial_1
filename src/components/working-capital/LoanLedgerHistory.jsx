import { format } from "date-fns";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { getLoanBalance } from "@/lib/loanBalance";

const money = (value) => `₱${(Number(value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export default function LoanLedgerHistory({ loan }) {
  const entries = [...(loan.ledger_entries || [])].reverse();
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3 rounded-lg border border-border bg-card p-3 text-xs">
        <div><p className="text-muted-foreground">Total Availed</p><p className="font-bold">{money(loan.amount_availed)}</p></div>
        <div><p className="text-muted-foreground">Total Paid</p><p className="font-bold text-primary">{money(loan.amount_paid)}</p></div>
        <div><p className="text-muted-foreground">Outstanding</p><p className="font-bold text-destructive">{money(getLoanBalance(loan))}</p></div>
      </div>
      {entries.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">No manual entries yet</p> : (
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {entries.map((entry, index) => {
            const availment = entry.entry_type === "availment";
            return <div key={`${entry.entry_date}-${index}`} className="flex items-center justify-between gap-4 px-3 py-2 text-xs">
              <div className="flex min-w-0 items-center gap-2">{availment ? <ArrowUpRight className="h-4 w-4 text-destructive" /> : <ArrowDownLeft className="h-4 w-4 text-primary" />}<div className="min-w-0"><p className="font-semibold capitalize">{entry.entry_type}</p><p className="truncate text-muted-foreground">{entry.entry_date ? format(new Date(entry.entry_date), "MMM d, yyyy") : "—"}{entry.reference ? ` · ${entry.reference}` : ""}{entry.notes ? ` · ${entry.notes}` : ""}</p></div></div>
              <span className={availment ? "font-bold text-destructive" : "font-bold text-primary"}>{availment ? "+" : "−"}{money(entry.amount)}</span>
            </div>;
          })}
        </div>
      )}
    </div>
  );
}