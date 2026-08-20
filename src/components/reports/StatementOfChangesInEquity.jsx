import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, eachMonthOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { fetchAllTransactions } from "@/lib/fetchAllTransactions";

const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtSigned = (v) => (v < 0 ? `(₱${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })})` : fmt(v));

const netOf = (list) =>
  list.reduce((s, t) => s + (t.type === "income" ? (t.amount || 0) : t.type === "expense" ? -(t.amount || 0) : 0), 0);

function Row({ label, value, isTotal, isSub, colorClass }) {
  return (
    <div className={`flex justify-between py-2 ${isSub ? "pl-6" : ""} ${isTotal ? "border-t border-border font-semibold" : "border-b border-border/30"}`}>
      <span className={`text-sm ${isSub ? "text-muted-foreground" : "text-foreground"}`}>{label}</span>
      <span className={`text-sm font-medium ${colorClass || ""}`}>{fmtSigned(value)}</span>
    </div>
  );
}

export default function StatementOfChangesInEquity({ dateFrom, dateTo }) {
  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => fetchAllTransactions("-date"),
  });

  const sce = useMemo(() => {
    const dated = transactions.filter(t => t.date);
    const beginning = netOf(dated.filter(t => t.date < dateFrom));
    const periodTx = dated.filter(t => t.date >= dateFrom && t.date <= dateTo);
    const income = periodTx.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
    const expenses = periodTx.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
    const netIncome = income - expenses;

    const months = eachMonthOfInterval({ start: startOfMonth(parseISO(dateFrom)), end: startOfMonth(parseISO(dateTo)) });
    let running = beginning;
    const rows = months.map((m) => {
      const from = format(startOfMonth(m), "yyyy-MM-dd");
      const to = format(endOfMonth(m), "yyyy-MM-dd");
      const mTx = periodTx.filter(t => t.date >= from && t.date <= to);
      const mNet = netOf(mTx);
      const open = running;
      running += mNet;
      return { label: format(m, "MMMM yyyy"), open, net: mNet, close: running };
    });

    return { beginning, income, expenses, netIncome, ending: beginning + netIncome, rows };
  }, [transactions, dateFrom, dateTo]);

  const handleExport = () => {
    const rows = [
      ["STATEMENT OF CHANGES IN EQUITY"],
      [`Period: ${format(parseISO(dateFrom), "MMMM d, yyyy")} – ${format(parseISO(dateTo), "MMMM d, yyyy")}`],
      [],
      ["Retained Earnings, Beginning", sce.beginning],
      ["Add: Revenue for the period", sce.income],
      ["Less: Expenses for the period", -sce.expenses],
      ["Net Income for the period", sce.netIncome],
      ["Retained Earnings, Ending", sce.ending],
      [],
      ["MONTHLY MOVEMENT"],
      ["Month", "Beginning Equity", "Net Income", "Ending Equity"],
      ...sce.rows.map(r => [r.label, r.open, r.net, r.close]),
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "Changes in Equity");
    XLSX.writeFile(wb, `Statement_of_Changes_in_Equity_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Statement of Changes in Equity</h2>
          <p className="text-sm text-muted-foreground">
            {format(parseISO(dateFrom), "MMMM d, yyyy")} – {format(parseISO(dateTo), "MMMM d, yyyy")}
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Beginning Equity</p>
          <p className="text-2xl font-bold text-foreground">{fmtSigned(sce.beginning)}</p>
        </div>
        <div className={`bg-card border rounded-2xl p-4 ${sce.netIncome >= 0 ? "border-primary/20" : "border-destructive/20"}`}>
          <p className="text-xs text-muted-foreground mb-1">Net Income for Period</p>
          <p className={`text-2xl font-bold ${sce.netIncome >= 0 ? "text-primary" : "text-destructive"}`}>{fmtSigned(sce.netIncome)}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Ending Equity</p>
          <p className={`text-2xl font-bold ${sce.ending >= 0 ? "text-primary" : "text-destructive"}`}>{fmtSigned(sce.ending)}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="text-base font-semibold text-foreground mb-3">Retained Earnings Movement</h3>
        <Row label="Retained Earnings, Beginning" value={sce.beginning} />
        <Row label="Add: Revenue for the period" value={sce.income} isSub colorClass="text-primary" />
        <Row label="Less: Expenses for the period" value={-sce.expenses} isSub colorClass="text-destructive" />
        <Row label="Net Income for the period" value={sce.netIncome} isTotal colorClass={sce.netIncome >= 0 ? "text-primary" : "text-destructive"} />
        <div className="flex justify-between items-center mt-4 pt-3 border-t-2 border-border">
          <span className="font-bold text-foreground">RETAINED EARNINGS, ENDING</span>
          <span className={`text-lg font-bold ${sce.ending >= 0 ? "text-primary" : "text-destructive"}`}>{fmtSigned(sce.ending)}</span>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-base font-semibold text-foreground">Monthly Movement</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2">Month</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">Beginning</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">Net Income</th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2">Ending</th>
              </tr>
            </thead>
            <tbody>
              {sce.rows.map((r) => (
                <tr key={r.label} className="border-b border-border/40 last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-2 text-foreground">{r.label}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">{fmtSigned(r.open)}</td>
                  <td className={`px-4 py-2 text-right font-medium ${r.net >= 0 ? "text-primary" : "text-destructive"}`}>{fmtSigned(r.net)}</td>
                  <td className="px-4 py-2 text-right font-semibold text-foreground">{fmtSigned(r.close)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-muted-foreground italic">
        Equity is tracked as retained earnings from recorded transactions. Owner contributions and withdrawals are not currently recorded separately.
      </p>
    </div>
  );
}