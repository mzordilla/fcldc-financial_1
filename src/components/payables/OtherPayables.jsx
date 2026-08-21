import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Plus, Trash2, ChevronDown, Banknote, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MultiOtherPayableDialog from "./MultiOtherPayableDialog";
import MarkPayableAsPaidDialog from "./MarkPayableAsPaidDialog";
import AgingSummary from "./AgingSummary";
import EditOtherPayableDialog from "./EditOtherPayableDialog";
import { buildAging } from "@/lib/payablesAging";

const statusStyles = {
  unpaid: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  partially_paid: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  paid: "bg-primary/10 text-primary border-primary/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function OtherPayables() {
  const [showAdd, setShowAdd] = useState(false);
  const [paying, setPaying] = useState(null);
  const [editing, setEditing] = useState(null);
  const [expanded, setExpanded] = useState(new Set());
  const queryClient = useQueryClient();

  const { data: payables = [], isLoading } = useQuery({
    queryKey: ["other_payables"],
    queryFn: () => base44.entities.Payable.filter({ payable_type: "other" }, "-due_date", 1000),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["other_payables"] });
    queryClient.invalidateQueries({ queryKey: ["payablesAgingSummary"] });
  };

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Payable.create(data),
    onSuccess: invalidate,
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Payable.update(id, data),
    onSuccess: invalidate,
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Payable.delete(id),
    onSuccess: invalidate,
  });

  const outstandingPayables = payables.filter((p) => p.status !== "paid");
  const groups = {};
  outstandingPayables.forEach((p) => {
    const key = p.supplier_name || "No Payee";
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });
  const payeeList = Object.keys(groups).sort().map((payee) => {
    const rows = groups[payee];
    const outstanding = rows
      .filter((r) => r.status !== "paid")
      .reduce((s, r) => s + ((r.amount || 0) - (r.amount_paid || 0)), 0);
    return { payee, rows, outstanding };
  });
  const totalOutstanding = payeeList.reduce((s, g) => s + g.outstanding, 0);
  const aging = buildAging(outstandingPayables);

  const toggle = (payee) => setExpanded((prev) => {
    const next = new Set(prev);
    next.has(payee) ? next.delete(payee) : next.add(payee);
    return next;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {payeeList.length} payee{payeeList.length !== 1 ? "s" : ""} · ₱{totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })} outstanding
        </p>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add
        </Button>
      </div>

      {!isLoading && outstandingPayables.length > 0 && (
        <AgingSummary overall={aging.buckets} overallTotal={aging.total} title="Aging Analysis — Other Payables" />
      )}

      {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
      {!isLoading && payeeList.length === 0 && <p className="text-center py-12 text-muted-foreground">No other payables yet</p>}

      <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
        {payeeList.map(({ payee, rows, outstanding }) => {
          const isExpanded = expanded.has(payee);
          return (
            <div key={payee} className="bg-card">
              <button className="w-full px-4 py-2.5 bg-muted/50 hover:bg-muted/70 transition-colors" onClick={() => toggle(payee)}>
                <div className="flex items-center gap-2">
                  <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform shrink-0 ${isExpanded ? "" : "-rotate-90"}`} />
                  <div className="text-left min-w-0">
                    <h3 className="text-sm font-semibold text-foreground truncate">{payee}</h3>
                    <p className="text-[11px] text-muted-foreground">{rows.length} item{rows.length !== 1 ? "s" : ""}</p>
                  </div>
                  <span className="ml-auto text-xs font-bold text-foreground">₱{outstanding.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </button>
              {isExpanded && (
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 border-y border-border">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Description</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Ref #</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Due</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">Amount</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">Balance</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((p) => (
                      <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2 text-xs text-foreground">{p.description || "—"}</td>
                        <td className="px-4 py-2 text-xs font-mono text-muted-foreground">{p.invoice_number || "—"}</td>
                        <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">
                          {p.due_date ? format(new Date(p.due_date), "MMM d, yyyy") : "—"}
                        </td>
                        <td className="px-4 py-2 text-right text-xs font-mono">₱{(p.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-2 text-right text-xs font-mono font-bold">
                          ₱{((p.amount || 0) - (p.amount_paid || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-2">
                          <Badge variant="outline" className={`text-xs ${statusStyles[p.status] || ""}`}>{(p.status || "unpaid").replace(/_/g, " ")}</Badge>
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end gap-2">
                            {p.status !== "paid" && (
                              <button onClick={() => setPaying(p)} className="text-primary hover:text-primary/70" title="Record payment">
                                <Banknote className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => setEditing(p)} className="text-muted-foreground hover:text-foreground" title="Edit">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteMutation.mutate(p.id)} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>

      <MultiOtherPayableDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        onSubmit={async (items) => {
          for (const item of items) await createMutation.mutateAsync(item);
        }}
      />
      <EditOtherPayableDialog
        open={!!editing}
        onOpenChange={(v) => { if (!v) setEditing(null); }}
        payable={editing}
        onConfirm={(data) => updateMutation.mutateAsync({ id: editing.id, data })}
      />
      <MarkPayableAsPaidDialog
        open={!!paying}
        onOpenChange={(v) => { if (!v) setPaying(null); }}
        payable={paying}
        onConfirm={(data) => updateMutation.mutateAsync({ id: paying.id, data })}
      />
    </div>
  );
}