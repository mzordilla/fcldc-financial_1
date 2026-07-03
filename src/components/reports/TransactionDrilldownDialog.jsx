import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";

const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function TransactionDrilldownDialog({ open, onOpenChange, title, transactions = [] }) {
  const total = transactions.reduce((s, t) => s + (t.amount || 0), 0);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No transactions found.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Description</th>
                  <th className="py-2 pr-3">Project</th>
                  <th className="py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td className="py-2 pr-3 whitespace-nowrap">{t.date ? format(parseISO(t.date), "MMM d, yyyy") : "—"}</td>
                    <td className="py-2 pr-3">{t.description || "—"}</td>
                    <td className="py-2 pr-3">{t.project_code || "—"}</td>
                    <td className="py-2 text-right">{fmt(t.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {transactions.length > 0 && (
            <div className="flex justify-between pt-2 border-t border-border font-semibold text-sm">
              <span>Total</span>
              <span>{fmt(total)}</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}