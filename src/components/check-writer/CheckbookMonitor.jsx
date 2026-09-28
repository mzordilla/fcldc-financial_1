import { useMemo } from "react";
import { BookOpen, AlertTriangle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const BOOK = 100, REORDER_AT = 20;

export default function CheckbookMonitor({ checks }) {
  const books = useMemo(() => {
    const map = {};
    checks.forEach(c => {
      const n = parseInt(String(c.check_number).replace(/\D/g, ""), 10);
      if (!n) return;
      const start = Math.floor((n - 1) / BOOK) * BOOK + 1;
      const key = `${c.bank_account_id}-${start}`;
      map[key] ||= { key, bank: `${c.bank_name || ""} ${c.account_number || ""}`.trim(), start, end: start + BOOK - 1, nums: new Set(), voided: 0 };
      map[key].nums.add(n);
      if (c.status === "voided") map[key].voided++;
    });
    return Object.values(map).map(b => {
      const max = Math.max(...b.nums);
      const missing = [];
      for (let i = b.start; i <= max; i++) if (!b.nums.has(i)) missing.push(i);
      return { ...b, used: b.nums.size, last: max, remaining: b.end - max, missing };
    }).sort((a, b) => a.bank.localeCompare(b.bank) || b.start - a.start);
  }, [checks]);

  return <section className="bg-card border border-border rounded-xl p-4 space-y-3">
    <div><h3 className="font-bold text-lg flex items-center gap-2"><BookOpen className="w-5 h-5" /> Checkbook Monitoring</h3><p className="text-xs text-muted-foreground">Series of {BOOK} per checkbook · request a new checkbook when {REORDER_AT} or fewer leaves remain</p></div>
    {books.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No checks recorded yet.</p> :
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{books.map(b => {
      const low = b.remaining <= REORDER_AT;
      return <div key={b.key} className={`border rounded-lg p-3 space-y-2 ${low ? "border-destructive/50 bg-destructive/5" : "border-border"}`}>
        <div className="flex justify-between items-start"><div><p className="font-semibold text-sm">{b.bank || "Bank account"}</p><p className="font-mono text-xs text-muted-foreground">{b.start} – {b.end}</p></div>{low && <span className="text-xs font-semibold text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {b.remaining === 0 ? "Exhausted" : "Request new checkbook"}</span>}</div>
        <Progress value={((b.last - b.start + 1) / BOOK) * 100} />
        <div className="grid grid-cols-4 text-xs gap-1"><div><p className="text-muted-foreground">Last No.</p><p className="font-mono font-semibold">{b.last}</p></div><div><p className="text-muted-foreground">Issued</p><p className="font-semibold">{b.used}</p></div><div><p className="text-muted-foreground">Voided</p><p className="font-semibold">{b.voided}</p></div><div><p className="text-muted-foreground">Remaining</p><p className={`font-semibold ${low ? "text-destructive" : ""}`}>{b.remaining}</p></div></div>
        {b.missing.length > 0 && <p className="text-xs text-amber-700">Unrecorded/skipped: {b.missing.slice(0, 15).join(", ")}{b.missing.length > 15 ? ` +${b.missing.length - 15} more` : ""}</p>}
      </div>;
    })}</div>}
  </section>;
}