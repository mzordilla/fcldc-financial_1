import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { Pencil } from "lucide-react";
import TransactionFormDialog from "@/components/transactions/TransactionFormDialog";
import { TRANSACTION_CATEGORIES } from "@/lib/transactionCategories";

const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function TransactionDrilldownDialog({ open, onOpenChange, title, transactions = [] }) {
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();
  const total = transactions.reduce((s, t) => s + (t.amount || 0), 0);

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankaccounts"],
    queryFn: () => base44.entities.BankAccount.list("-created_date", 100),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Transaction.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bankaccounts"] });
    },
  });

  return (
    <>
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
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t, i) => (
                    <tr
                      key={t.id || i}
                      onClick={() => setEditing(t)}
                      className="border-b border-border/30 cursor-pointer hover:bg-muted/30"
                      title="Click to edit this transaction"
                    >
                      <td className="py-2 pr-3 whitespace-nowrap">{t.date ? format(parseISO(t.date), "MMM d, yyyy") : "—"}</td>
                      <td className="py-2 pr-3">{t.description || "—"}</td>
                      <td className="py-2 pr-3">{t.project_code || "—"}</td>
                      <td className="py-2 text-right">{fmt(t.amount)}</td>
                      <td className="py-2 text-right text-muted-foreground"><Pencil className="w-3.5 h-3.5" /></td>
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

      <TransactionFormDialog
        open={!!editing}
        onOpenChange={(v) => { if (!v) setEditing(null); }}
        title="Edit Transaction"
        bankAccounts={bankAccounts}
        categories={TRANSACTION_CATEGORIES}
        initialData={editing || {}}
        onSubmit={(data) => updateMutation.mutateAsync({ id: editing.id, data })}
      />
    </>
  );
}