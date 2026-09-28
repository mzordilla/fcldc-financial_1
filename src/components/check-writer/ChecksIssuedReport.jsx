import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { FileSpreadsheet, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const peso = (n) => Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function range(period, date) {
  const d = parseISO(date);
  if (period === "daily") return [d, d];
  if (period === "weekly") return [startOfWeek(d, { weekStartsOn: 1 }), endOfWeek(d, { weekStartsOn: 1 })];
  return [startOfMonth(d), endOfMonth(d)];
}

export default function ChecksIssuedReport({ checks }) {
  const [period, setPeriod] = useState("monthly");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [from, to] = range(period, date);
  const fromKey = format(from, "yyyy-MM-dd"), toKey = format(to, "yyyy-MM-dd");
  const label = fromKey === toKey ? format(from, "MMM d, yyyy") : `${format(from, "MMM d, yyyy")} – ${format(to, "MMM d, yyyy")}`;

  const rows = useMemo(() => checks
    .filter(c => c.check_date >= fromKey && c.check_date <= toKey)
    .sort((a, b) => String(a.check_number).localeCompare(String(b.check_number), undefined, { numeric: true })), [checks, fromKey, toKey]);
  const total = rows.filter(r => r.status !== "voided").reduce((s, r) => s + Number(r.amount || 0), 0);

  const exportExcel = () => {
    const data = rows.map(r => ({ "Check No.": r.check_number, Date: r.check_date, Payee: r.payee, Bank: `${r.bank_name || ""} ${r.account_number || ""}`.trim(), "PR Ref": (r.payment_request_numbers || []).join(", "), Particulars: r.memo || "", Status: r.status, Amount: r.status === "voided" ? 0 : Number(r.amount || 0) }));
    data.push({ "Check No.": "TOTAL", Amount: total });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), "RCI");
    XLSX.writeFile(wb, `RCI_${fromKey}_${toKey}.xlsx`);
  };

  const print = () => {
    const body = rows.map(r => `<tr><td>${r.check_number}</td><td>${r.check_date}</td><td>${r.payee}</td><td>${r.bank_name || ""}</td><td>${(r.payment_request_numbers || []).join(", ")}</td><td>${r.memo || ""}</td><td>${r.status === "voided" ? "VOIDED" : ""}</td><td style="text-align:right">${r.status === "voided" ? "0.00" : peso(r.amount)}</td></tr>`).join("");
    const w = window.open("", "_blank");
    w.document.write(`<html><head><title>RCI</title><style>body{font-family:Arial;font-size:11px;padding:20px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:4px}th{background:#eee}</style></head><body><h2 style="margin:0">Report of Checks Issued (RCI)</h2><p>Period: ${label}</p><table><thead><tr><th>Check No.</th><th>Date</th><th>Payee</th><th>Bank</th><th>PR Ref</th><th>Particulars</th><th>Remarks</th><th>Amount</th></tr></thead><tbody>${body}<tr><td colspan="7" style="text-align:right"><b>TOTAL</b></td><td style="text-align:right"><b>${peso(total)}</b></td></tr></tbody></table><br/><br/><table style="border:none"><tr><td style="border:none">Prepared by: ____________</td><td style="border:none">Checked by: ____________</td><td style="border:none">Approved by: ____________</td></tr></table></body></html>`);
    w.document.close(); w.print();
  };

  return <section className="bg-card border border-border rounded-xl p-4 space-y-3">
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
      <div><h3 className="font-bold text-lg">Report of Checks Issued (RCI)</h3><p className="text-xs text-muted-foreground">Sorted by check number · {label}</p></div>
      <div className="flex flex-wrap gap-2">
        <Select value={period} onValueChange={setPeriod}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent></Select>
        <Input type="date" value={date} onChange={e => e.target.value && setDate(e.target.value)} className="w-40" />
        <Button variant="outline" onClick={exportExcel} disabled={!rows.length}><FileSpreadsheet /> Excel</Button>
        <Button onClick={print} disabled={!rows.length}><Printer /> Print</Button>
      </div>
    </div>
    <div className="overflow-x-auto"><table className="w-full text-sm">
      <thead><tr className="text-left text-xs uppercase text-muted-foreground border-b border-border"><th className="py-2">Check No.</th><th>Date</th><th>Payee</th><th>Bank</th><th>PR Ref</th><th>Status</th><th className="text-right">Amount</th></tr></thead>
      <tbody>{rows.length === 0 ? <tr><td colSpan={7} className="py-6 text-center text-muted-foreground">No checks issued in this period.</td></tr> : rows.map(r => <tr key={r.id} className={`border-b border-border ${r.status === "voided" ? "text-muted-foreground line-through" : ""}`}><td className="py-2 font-mono font-semibold">{r.check_number}</td><td>{r.check_date}</td><td>{r.payee}</td><td>{r.bank_name}</td><td className="text-xs">{(r.payment_request_numbers || []).join(", ")}</td><td className="capitalize">{r.status}</td><td className="text-right font-mono">{peso(r.amount)}</td></tr>)}</tbody>
      <tfoot><tr className="font-bold"><td colSpan={6} className="py-2 text-right">Total ({rows.length} checks)</td><td className="text-right font-mono">₱{peso(total)}</td></tr></tfoot>
    </table></div>
  </section>;
}