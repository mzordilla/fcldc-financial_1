import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, addDays, addMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from "date-fns";
import { Building2 } from "lucide-react";
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
      periods.push({
        label: `${format(cursor, "MMM d")} - ${format(periodEnd, "MMM d")}`,
        start: cursor,
        end: periodEnd,
      });
      cursor = addDays(periodEnd, 1);
    }
  } else {
    let cursor = startOfMonth(start);
    while (cursor <= end) {
      const periodEnd = endOfMonth(cursor);
      periods.push({
        label: format(cursor, "MMM yyyy"),
        start: cursor,
        end: periodEnd,
      });
      cursor = addMonths(cursor, 1);
    }
  }
  return periods;
}

export default function BankAccountSummaryReport({ accounts }) {
  const [periodType, setPeriodType] = useState("monthly");
  const [startDate, setStartDate] = useState(format(startOfMonth(subMonths(new Date(), 2)), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const { data: allTransactions = [], isLoading } = useQuery({
    queryKey: ["transactions_all_bank_summary"],
    queryFn: () => base44.entities.Transaction.list("-date", 100000),
  });

  const periods = useMemo(() => buildPeriods(periodType, startDate, endDate), [periodType, startDate, endDate]);

  const rows = useMemo(() => {
    return accounts.map((account) => {
      const linked = allTransactions.filter((t) => t.bank_account_id === account.id);
      const periodData = periods.map((period) => {
        const inPeriod = linked.filter((t) => {
          if (!t.date) return false;
          const d = new Date(t.date);
          return d >= period.start && d <= period.end;
        });
        const deposits = inPeriod.filter((t) => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
        const withdrawals = inPeriod.filter((t) => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
        return { deposits, withdrawals, endingBalance: deposits - withdrawals };
      });
      return { account, periodData };
    });
  }, [accounts, allTransactions, periods]);

  const periodTotals = periods.map((_, idx) => {
    return rows.reduce(
      (acc, r) => ({
        deposits: acc.deposits + r.periodData[idx].deposits,
        withdrawals: acc.withdrawals + r.periodData[idx].withdrawals,
        endingBalance: acc.endingBalance + r.periodData[idx].endingBalance,
      }),
      { deposits: 0, withdrawals: 0, endingBalance: 0 }
    );
  });

  if (accounts.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No bank accounts added yet</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Bank Account Summary</h2>
          <p className="text-sm text-muted-foreground">Sum of deposits and withdrawals per account, by period</p>
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
                <th className="border border-border px-3 py-2 text-left font-semibold text-foreground sticky left-0 bg-muted/50 z-10">Bank Account</th>
                <th className="border border-border px-2 py-2 text-left font-semibold text-foreground bg-muted/50 whitespace-nowrap">Row</th>
                {periods.map((p) => (
                  <th key={p.label} className="border border-border px-2 py-2 text-center font-semibold text-foreground bg-muted/50 whitespace-nowrap">
                    {p.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ account, periodData }) => {
                const lines = [
                  { key: "deposits", label: "Deposits" },
                  { key: "withdrawals", label: "Withdrawals" },
                  { key: "endingBalance", label: "Ending Balance" },
                ];
                return (
                  <>
                    {lines.map((line, lineIdx) => (
                      <tr key={`${account.id}_${line.key}`} className="hover:bg-muted/30">
                        {lineIdx === 0 && (
                          <td rowSpan={lines.length} className="border border-border px-3 py-2 align-top font-medium text-foreground whitespace-nowrap sticky left-0 bg-card">
                            {account.account_name}
                            <div className="font-normal text-muted-foreground">{account.bank_name}</div>
                          </td>
                        )}
                        <td className="border border-border px-2 py-1.5 text-muted-foreground whitespace-nowrap bg-muted/5">{line.label}</td>
                        {periodData.map((pd, idx) => (
                          <td
                            key={idx}
                            className={`border border-border px-2 py-1.5 text-right ${
                              line.key === "withdrawals" ? "text-destructive" : line.key === "deposits" ? "text-primary" : "text-foreground font-medium"
                            }`}
                          >
                            {line.key === "withdrawals" ? "-" : ""}{fmt(pd[line.key])}
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
                <td colSpan={2} className="border border-border px-3 py-2 text-foreground sticky left-0 bg-muted/40">Total Ending Balance</td>
                {periodTotals.map((t, idx) => (
                  <td key={idx} className={`border border-border px-2 py-2 text-right ${t.endingBalance < 0 ? "text-destructive" : "text-foreground"}`}>
                    {t.endingBalance < 0 ? "-" : ""}{fmt(t.endingBalance)}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}