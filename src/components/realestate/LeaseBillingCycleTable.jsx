import { format } from "date-fns";
import { CheckCircle, Pencil, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const statusClass = { pending: "border-chart-3/20 bg-chart-3/10 text-chart-3", approved: "border-primary/20 bg-primary/10 text-primary", rejected: "border-destructive/20 bg-destructive/10 text-destructive" };

export default function LeaseBillingCycleTable({ cycles, loading, processing, onEdit, onDelete, onApprove, onReject }) {
  if (loading) return <p className="py-12 text-center text-muted-foreground">Loading lease billings...</p>;
  if (!cycles.length) return <p className="py-12 text-center text-muted-foreground">No lease billing cycles yet</p>;
  return <div className="overflow-x-auto rounded-2xl border border-border bg-card"><table className="w-full text-sm">
    <thead className="border-b border-border bg-muted/30"><tr><th className="px-3 py-2 text-left">Billing #</th><th className="px-3 py-2 text-left">Tenant / Unit</th><th className="px-3 py-2 text-left">Month</th><th className="px-3 py-2 text-left">Due</th><th className="px-3 py-2 text-right">Amount</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Actions</th></tr></thead>
    <tbody className="divide-y divide-border">{cycles.map((cycle) => <tr key={cycle.id} className="hover:bg-muted/20">
      <td className="px-3 py-2 font-mono text-xs">{cycle.billing_number || "—"}</td>
      <td className="px-3 py-2"><p className="font-medium">{cycle.tenant_name}</p><p className="text-xs text-muted-foreground">{cycle.unit_number}{cycle.building ? ` · ${cycle.building}` : ""}</p></td>
      <td className="px-3 py-2">{cycle.period_month}</td><td className="px-3 py-2 whitespace-nowrap">{cycle.due_date ? format(new Date(cycle.due_date), "MMM d, yyyy") : "—"}</td>
      <td className="px-3 py-2 text-right font-semibold">₱{Number(cycle.billing_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      <td className="px-3 py-2"><Badge variant="outline" className={statusClass[cycle.approval_status]}>{cycle.approval_status || "pending"}</Badge></td>
      <td className="px-3 py-2"><div className="flex justify-end gap-1">{cycle.approval_status === "pending" && <><Button size="sm" onClick={() => onApprove(cycle)} disabled={processing}><CheckCircle className="w-3.5 h-3.5" /> Approve</Button><Button size="icon" variant="ghost" onClick={() => onReject(cycle)} disabled={processing} title="Reject"><XCircle className="w-4 h-4" /></Button></>}<Button size="icon" variant="ghost" onClick={() => onEdit(cycle)} title="Edit"><Pencil className="w-4 h-4" /></Button><Button size="icon" variant="ghost" onClick={() => onDelete(cycle.id)} title="Delete"><Trash2 className="w-4 h-4" /></Button></div></td>
    </tr>)}</tbody>
  </table></div>;
}