import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import DrilldownBulkEditTable from "./DrilldownBulkEditTable";

const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function TransactionDrilldownDialog({ open, onOpenChange, title, transactions = [] }) {
  const queryClient = useQueryClient();
  const total = transactions.reduce((s, t) => s + (t.amount || 0), 0);

  const saveMutation = useMutation({
    mutationFn: (rows) => base44.entities.Transaction.bulkUpdate(rows.map(r => ({
      id: r.id,
      description: r.description,
      date: r.date,
      amount: r.amount,
      category: r.category,
      chart_of_account: r.chart_of_account,
      project_code: r.project_code,
    }))),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No transactions found.</p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground italic">Edit any number of these transactions, then save all changes at once.</p>
            <DrilldownBulkEditTable
              transactions={transactions}
              onSave={(rows) => saveMutation.mutate(rows)}
              isSaving={saveMutation.isPending}
            />
            <div className="flex justify-between pt-2 border-t border-border font-semibold text-sm">
              <span>Total</span>
              <span>{fmt(total)}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}