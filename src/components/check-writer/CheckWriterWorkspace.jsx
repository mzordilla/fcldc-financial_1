import { Landmark, Printer } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import CheckForm from "@/components/check-writer/CheckForm";
import CheckRegister from "@/components/check-writer/CheckRegister";
import useCheckWriter from "@/hooks/useCheckWriter";

export default function CheckWriterWorkspace() {
  const writer = useCheckWriter();
  const { data: approvedRequests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ["approved_payment_requests_for_checks"],
    queryFn: () => base44.entities.PaymentRequest.filter({ approval_status: "approved" }, "-created_date", 500),
  });
  const linkedRequestIds = new Set(writer.checks.filter(check => check.status !== "voided").flatMap(check => check.payment_request_ids || []));
  const availableRequests = approvedRequests.filter(request => !linkedRequestIds.has(request.id));
  const total = writer.checks.filter(c => c.status !== "voided").reduce((sum, c) => sum + Number(c.amount || 0), 0);
  return <div className="space-y-5">
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-widest"><Printer className="w-4 h-4" /> Check disbursement</div><h2 className="text-2xl font-bold tracking-tight mt-1">Check Writer</h2><p className="text-sm text-muted-foreground mt-1">Select an approved PR or write an independent check, then save and print.</p></div><div className="flex gap-3"><div className="bg-card border border-border rounded-xl px-4 py-3"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Checks</p><p className="text-xl font-bold">{writer.checks.length}</p></div><div className="bg-card border border-border rounded-xl px-4 py-3"><p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1"><Landmark className="w-3 h-3" /> Recorded value</p><p className="text-xl font-bold font-mono">₱{total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div></div></header>
    <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-5 items-start"><CheckForm bankAccounts={writer.bankAccounts} approvedRequests={availableRequests} loadingRequests={loadingRequests} onSave={writer.save} saving={writer.saving} /><CheckRegister checks={writer.checks} selected={writer.selected} onToggle={writer.toggle} onPrint={writer.printOne} onBatchPrint={writer.batchPrint} loading={writer.isLoading} /></div>
  </div>;
}