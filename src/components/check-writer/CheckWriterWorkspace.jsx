import { Landmark, Printer } from "lucide-react";
import CheckForm from "@/components/check-writer/CheckForm";
import CheckRegister from "@/components/check-writer/CheckRegister";
import useCheckWriter from "@/hooks/useCheckWriter";

export default function CheckWriterWorkspace() {
  const writer = useCheckWriter();
  const total = writer.checks.filter(c => c.status !== "voided").reduce((sum, c) => sum + Number(c.amount || 0), 0);
  return <div className="space-y-5">
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"><div><div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-widest"><Printer className="w-4 h-4" /> Independent disbursement</div><h2 className="text-2xl font-bold tracking-tight mt-1">Check Writer</h2><p className="text-sm text-muted-foreground mt-1">Write, record, and print Philippine bank checks independently.</p></div><div className="flex gap-3"><div className="bg-card border border-border rounded-xl px-4 py-3"><p className="text-[10px] uppercase tracking-widest text-muted-foreground">Checks</p><p className="text-xl font-bold">{writer.checks.length}</p></div><div className="bg-card border border-border rounded-xl px-4 py-3"><p className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1"><Landmark className="w-3 h-3" /> Recorded value</p><p className="text-xl font-bold font-mono">₱{total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p></div></div></header>
    <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-5 items-start"><CheckForm bankAccounts={writer.bankAccounts} onSave={writer.save} saving={writer.saving} /><CheckRegister checks={writer.checks} selected={writer.selected} onToggle={writer.toggle} onPrint={writer.printOne} onBatchPrint={writer.batchPrint} loading={writer.isLoading} /></div>
  </div>;
}