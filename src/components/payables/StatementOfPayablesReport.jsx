import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, addDays, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from "date-fns";
import { FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const fmt = (v) =>
  `₱${Math.abs(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function buildPeriods(periodType, startDate, endDate) {
  const periods = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (periodType === "weekly") {
    let cursor = startOfWeek(start, { weekStartsOn: 1 });
    while (cursor <= end) {
      const periodEnd = endOfWeek(cursor, { weekStartsOn: 1 });
      periods.push({ label: `${format(cursor, "MMM d")} - ${format(periodEnd, "MMM d")}`, start: cursor, end: periodEnd });
      cursor = addDays(periodEnd, 1);
    }
  } else {
    let cursor = startOfMonth(start);
    while (cursor <= end) {
      const periodEnd = endOfMonth(cursor);
      periods.push({ label: format(cursor, "MMM yyyy"), start: cursor, end: periodEnd });
      cursor = addMonths(cursor, 1);
    }
  }
  return periods;
}

export default function StatementOfPayablesReport() {
  const [periodType, setPeriodType] = useState("monthly");
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(new Date(), 2)), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: allPayables = [], isLoading } = useQuery({
    queryKey: ["payables_all_statement"],
    queryFn: () => base44.entities.Payable.list("-due_date", 100000),
  });

  const periods = useMemo(() => buildPeriods(periodType, startDate, endDate), [periodType, startDate, endDate]);

  const suppliers = useMemo(() => {
    const names = new Set(allPayables.map((p) => p.supplier_name).filter(Boolean));
    return [...names].sort();
  }, [allPayables]);

  const rows = useMemo(() => {
    return suppliers.map((supplier) => {
      const linked = allPayables.filter((p) => p.supplier_name === supplier);
      const periodData = periods.map((period) => {
        const invoiced = linked
          .filter((p) => p.due_date && new Date(p.due_date) >= period.start && new Date(p.due_date) <= period.end)
          .reduce((s, p) => s + (p.amount || 0), 0);
        const paid = linked
          .flatMap((p) => p.payment_history || [])
          .filter((h) => h.payment_date && new Date(h.payment_date) >= period.start && new Date(h.payment_date) <= period.end)
          .reduce((s, h) => s + (h.amount || 0), 0);
        return { invoiced, paid, balance: invoiced - paid };
      });
      return { supplier, periodData };
    });
  }, [suppliers, allPayables, periods]);

  const periodTotals = periods.map((_, idx) =>
    rows.reduce(
      (acc, r) => ({
        invoiced: acc.invoiced + r.periodData[idx].invoiced,
        paid: acc.paid + r.periodData[idx].paid,
        balance: acc.balance + r.periodData[idx].balance,
      }),
      { invoiced: 0, paid: 0, balance: 0 }
    )
  );

  if (!isLoading && suppliers.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No payables recorded yet</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Statement of Payables</h2>
          <p className="text-sm text-muted-foreground">Invoiced vs. paid amounts per supplier, by period</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-36" />
          <span className="text-muted-foreground text-sm">to</span>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-36" />
          <Select value={periodType} onValueChange={setPeriodType}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {isLoading ? (
        <div className="text-center py-16 text-muted-foreground">Loading...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr>
                <th className="border border-border px-3 py-2 text-left font-semibold text-foreground sticky left-0 bg-muted/50 z-10">Supplier</th>
                <th className="border border-border px-2 py-2 text-left font-semibold text-foreground bg-muted/50 whitespace-nowrap">Row</th>
                {periods.map((p) => (
                  <th key={p.label} className="border border-border px-2 py-2 text-center font-semibold text-foreground bg-muted/50 whitespace-nowrap">
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ supplier, periodData }) => {
                const lines = [
                  { key: "invoiced", label: "Invoiced" },
                  { key: "paid", label: "Paid" },
                  { key: "balance", label: "Balance" },
                ];
                return (
                  <>
                    {lines.map((line, lineIdx) => (
                      <tr key={`${supplier}_${line.key}`} className="hover:bg-muted/30">
                        {lineIdx === 0 && (
                          <td rowSpan={lines.length} className="border border-border px-3 py-2 align-top font-medium text-foreground whitespace-nowrap sticky left-0 bg-card">
                            {supplier}
                          </td>
                        )}
                        <td className="border border-border px-2 py-1.5 text-muted-foreground whitespace-nowrap bg-muted/5">{line.label}</td>
                        {periodData.map((pd, idx) => (
                          <td
                            key={idx}
                            className={`border border-border px-2 py-1.5 text-right ${
                              line.key === "paid" ? "text-primary" : line.key === "invoiced" ? "text-foreground" : "text-destructive font-medium"
                            }`}
                          >
                            {fmt(pd[line.key])}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-muted/40 font-semibold">
                <td colSpan={2} className="border border-border px-3 py-2 text-foreground sticky left-0 bg-muted/40">Total Balance</td>
                {periodTotals.map((t, idx) => (
                  <td key={idx} className="border border-border px-2 py-2 text-right text-destructive">{fmt(t.balance)}</td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}