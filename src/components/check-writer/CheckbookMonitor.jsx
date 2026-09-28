import { useMemo } from "react";
import { BookOpen, AlertTriangle, Printer } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

const BOOK = 100, REORDER_AT = 20;

function printRequest(list) {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const rows = list.map(b => `<tr><td>${b.bank}</td><td>${b.start} – ${b.end}</td><td>${b.last}</td><td>${b.used}</td><td>${b.voided}</td><td>${b.remaining}</td><td>${b.end + 1} – ${b.end + BOOK}</td></tr>`).join("");
  const fmt = v => Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const details = list.map(b => {
    const items = [...b.items].sort((x, y) => x.n - y.n);
    const total = items.filter(c => c.status !== "voided").reduce((s, c) => s + Number(c.amount || 0), 0);
    return `<h3 style="margin-top:24px">Checks Issued – ${b.bank} (Series ${b.start} – ${b.end})</h3><table><thead><tr><th>Check No.</th><th>Date</th><th>Payee</th><th>PR Ref</th><th>Particulars</th><th>Status</th><th style="text-align:right">Amount</th></tr></thead><tbody>${items.map(c => `<tr><td>${c.check_number}</td><td>${c.check_date || ""}</td><td>${c.payee || ""}</td><td>${(c.payment_request_numbers || []).join(", ")}</td><td>${c.memo || ""}</td><td>${c.status === "voided" ? "VOIDED" : c.status}</td><td style="text-align:right">${c.status === "voided" ? "0.00" : fmt(c.amount)}</td></tr>`).join("")}<tr><td colspan="6" style="text-align:right"><b>TOTAL (${items.length} checks)</b></td><td style="text-align:right"><b>${fmt(total)}</b></td></tr></tbody></table>`;
  }).join("");
  const w = window.open("", "_blank");
  w.document.write(`<html><head><title>Request for New Checkbook</title><style>body{font-family:Arial;font-size:12px;padding:30px}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{border:1px solid #999;padding:6px;text-align:left}th{background:#eee}.sig td{border:none;padding-top:50px}</style></head><body><h2 style="margin:0">REQUEST FOR NEW CHECKBOOK</h2><p>Date: ${today}</p><p>This is to request the issuance of new checkbook(s) for the following account(s), as the current checkbook series is nearly or fully consumed:</p><table><thead><tr><th>Bank / Account</th><th>Current Series</th><th>Last Check No. Used</th><th>Issued</th><th>Voided</th><th>Remaining Leaves</th><th>Requested Next Series</th></tr></thead><tbody>${rows}</tbody></table><p>Quantity requested: ${list.length} checkbook(s) of ${BOOK} leaves each.</p>${details}<table class="sig"><tr><td>Requested by:<br/>____________________</td><td>Checked by:<br/>____________________</td><td>Approved by:<br/>____________________</td></tr></table></body></html>`);
  w.document.close(); w.print();
}

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
      (map[key].items ||= []).push({ ...c, n });
      if (c.status === "voided") map[key].voided++;
    });
    return Object.values(map).map(b => {
      const max = Math.max(...b.nums);
      const missing = [];
      for (let i = b.start; i <= max; i++) if (!b.nums.has(i)) missing.push(i);
      return { ...b, used: b.nums.size, last: max, remaining: b.end - max, missing };
    }).sort((a, b) => a.bank.localeCompare(b.bank) || b.start - a.start);
  }, [checks]);
  const lowBooks = books.filter(b => b.remaining <= REORDER_AT);

  return <section className="bg-card border border-border rounded-xl p-4 space-y-3">
    <div className="flex justify-between items-end gap-2"><div><h3 className="font-bold text-lg flex items-center gap-2"><BookOpen className="w-5 h-5" /> Checkbook Monitoring</h3><p className="text-xs text-muted-foreground">Series of {BOOK} per checkbook · request a new checkbook when {REORDER_AT} or fewer leaves remain</p></div>
      <Button variant="outline" disabled={!lowBooks.length} onClick={() => printRequest(lowBooks)}><Printer /> Checkbook Request Report ({lowBooks.length})</Button></div>
    {books.length === 0 ? <p className="text-sm text-muted-foreground py-4 text-center">No checks recorded yet.</p> :
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{books.map(b => {
      const low = b.remaining <= REORDER_AT;
      return <div key={b.key} className={`border rounded-lg p-3 space-y-2 ${low ? "border-destructive/50 bg-destructive/5" : "border-border"}`}>
        <div className="flex justify-between items-start"><div><p className="font-semibold text-sm">{b.bank || "Bank account"}</p><p className="font-mono text-xs text-muted-foreground">{b.start} – {b.end}</p></div>{low && <span className="text-xs font-semibold text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {b.remaining === 0 ? "Exhausted" : "Request new checkbook"}</span>}</div>
        <Progress value={((b.last - b.start + 1) / BOOK) * 100} />
        <div className="grid grid-cols-4 text-xs gap-1"><div><p className="text-muted-foreground">Last No.</p><p className="font-mono font-semibold">{b.last}</p></div><div><p className="text-muted-foreground">Issued</p><p className="font-semibold">{b.used}</p></div><div><p className="text-muted-foreground">Voided</p><p className="font-semibold">{b.voided}</p></div><div><p className="text-muted-foreground">Remaining</p><p className={`font-semibold ${low ? "text-destructive" : ""}`}>{b.remaining}</p></div></div>
        {low && <Button size="sm" variant="destructive" className="w-full" onClick={() => printRequest([b])}><Printer /> Print Checkbook Request</Button>}
        {b.missing.length > 0 && <p className="text-xs text-amber-700">Unrecorded/skipped: {b.missing.slice(0, 15).join(", ")}{b.missing.length > 15 ? ` +${b.missing.length - 15} more` : ""}</p>}
      </div>;
    })}</div>}
  </section>;
}