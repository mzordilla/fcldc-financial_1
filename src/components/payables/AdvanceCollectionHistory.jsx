import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Image, FileCheck } from "lucide-react";

const openFile = async uri => { const url = uri.startsWith("http") ? uri : (await base44.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 600 })).signed_url; window.open(url, "_blank"); };

export default function AdvanceCollectionHistory({ advance, bankAccounts }) {
  const collections = advance.collections || [];
  const initial = (advance.amount || 0) - collections.reduce((s, c) => s + (c.amount || 0), 0);
  const bank = id => { if (id === "undeposited") return "Undeposited Collections"; const b = bankAccounts.find(a => a.id === id); return b ? `${b.bank_name} — ${b.account_name}` : "—"; };
  const rows = [{ collection_date: advance.received_date, amount: initial, bank_account_id: advance.bank_account_id, reference: advance.reference, notes: "Initial advance" }, ...collections];
  return <div className="bg-muted/30 px-6 py-3"><p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Collections ({rows.length})</p><table className="w-full text-xs"><thead><tr className="text-left text-muted-foreground">{["Date", "Amount", "Deposited To", "Reference", "Notes", "Attachments"].map(h => <th key={h} className="py-1 pr-3 font-medium">{h}</th>)}</tr></thead><tbody>{rows.map((c, i) => <tr key={i} className="border-t border-border">
    <td className="py-1.5 pr-3">{c.collection_date ? format(new Date(c.collection_date), "MMM d, yyyy") : "—"}</td>
    <td className="py-1.5 pr-3 font-semibold">₱{(c.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
    <td className="py-1.5 pr-3">{bank(c.bank_account_id)}</td><td className="py-1.5 pr-3">{c.reference || "—"}</td><td className="py-1.5 pr-3">{c.notes || "—"}</td>
    <td className="py-1.5">{c.receipt_url && <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => openFile(c.receipt_url)}><Image className="w-3 h-3" /> Receipt</Button>}{c.check_image_url && <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => openFile(c.check_image_url)}><FileCheck className="w-3 h-3" /> Check</Button>}{!c.receipt_url && !c.check_image_url && "—"}</td>
  </tr>)}</tbody></table></div>;
}