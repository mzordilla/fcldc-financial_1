import { useState } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const money = (value) => `₱${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export default function BankTransferApprovals({ requests, onApprove, onReject }) {
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const act = async (request, action) => {
    setBusyId(request.id);
    setError("");
    try { await action(request); } catch (err) { setError(err?.message || "The request could not be processed."); }
    finally { setBusyId(""); }
  };

  if (!requests.length) return null;
  return <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/20">
    <div className="mb-3"><h2 className="text-sm font-bold text-foreground">Bank Transfers Awaiting Approval</h2><p className="text-xs text-muted-foreground">Review transfer requests before funds are moved.</p></div>
    {error && <p className="mb-3 text-xs text-destructive">{error}</p>}
    <div className="divide-y divide-amber-200 dark:divide-amber-900">
      {requests.map((request) => {
        const lines = request.transfers?.length ? request.transfers : [{ from_bank_name: request.from_bank_name, to_bank_name: request.to_bank_name, amount: request.amount }];
        return <div key={request.id} className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-foreground">{lines.length} transfer{lines.length > 1 ? "s" : ""} · {money(request.amount)}</p>{lines.map((line, index) => <p key={index} className="truncate text-xs text-muted-foreground">{line.from_bank_name} → {line.to_bank_name} · {money(line.amount)}</p>)}<p className="mt-1 text-xs text-muted-foreground">{request.transfer_date} · Requested by {request.requested_by_name || "User"}{request.reference ? ` · ${request.reference}` : ""}</p></div>
          <div className="flex gap-2"><Button size="sm" variant="outline" disabled={!!busyId} onClick={() => act(request, onReject)}><X className="h-3.5 w-3.5" /> Reject</Button><Button size="sm" disabled={!!busyId} onClick={() => act(request, onApprove)}><Check className="h-3.5 w-3.5" /> {busyId === request.id ? "Processing..." : "Approve All"}</Button></div>
        </div>;
      })}
    </div>
  </section>;
}