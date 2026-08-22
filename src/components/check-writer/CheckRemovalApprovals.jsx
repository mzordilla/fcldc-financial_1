import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CheckRemovalApprovals({ checks, onReview, reviewingId }) {
  const pending = checks.filter(check => check.deletion_request_status === "pending");
  if (!pending.length) return null;
  return <section className="bg-card border border-border rounded-2xl p-3 space-y-2">
    <div><p className="text-[10px] font-semibold uppercase tracking-widest text-primary">Admin approval</p><h3 className="font-bold">Printed Check Removal Requests</h3></div>
    {pending.map(check => <div key={check.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border p-3">
      <div><div className="flex items-center gap-2"><span className="font-mono font-semibold">#{check.check_number}</span><Badge variant="outline">{check.deletion_action === "delete" ? "Permanent delete" : "Mark void"}</Badge></div><p className="text-sm mt-1">{check.payee} · ₱{Number(check.amount || 0).toLocaleString()}</p><p className="text-xs text-muted-foreground mt-1">{check.deletion_reason} — {check.deletion_requested_by}</p></div>
      <div className="flex gap-2"><Button size="sm" variant="outline" disabled={reviewingId === check.id} onClick={() => onReview(check, false)}>Reject</Button><Button size="sm" disabled={reviewingId === check.id} onClick={() => onReview(check, true)}>{reviewingId === check.id ? "Processing..." : "Approve"}</Button></div>
    </div>)}
  </section>;
}