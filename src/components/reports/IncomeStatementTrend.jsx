import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO, eachMonthOfInterval, startOfMonth, endOfMonth } from "date-fns";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { buildPeriod, incomeStatementAccountNames } from "@/components/reports/comparativeIncomeStatementUtils";
import IncomeStatementTrendTable from "@/components/reports/IncomeStatementTrendTable";

const short = (v) => `₱${(v / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 })}k`;
const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function IncomeStatementTrend({ transactions, dateFrom, dateTo }) {
  const { data: chartOfAccounts = [] } = useQuery({ queryKey: ["chartofaccounts"], queryFn: () => base44.entities.ChartOfAccount.list("account_code", 1000) });
  const { data: bankAccounts = [] } = useQuery({ queryKey: ["bankaccounts"], queryFn: () => base44.entities.BankAccount.list("-created_date", 100) });
  const { data: ppeAssets = [] } = useQuery({ queryKey: ["ppe_assets"], queryFn: () => base44.entities.PPEAsset.list("-acquisition_date", 500) });

  const rows = useMemo(() => {
    const accts = incomeStatementAccountNames(chartOfAccounts, bankAccounts);
    const months = eachMonthOfInterval({ start: startOfMonth(parseISO(dateFrom)), end: startOfMonth(parseISO(dateTo)) });
    return months.map((m) => {
      const p = buildPeriod(transactions, format(m, "yyyy-MM-dd"), format(endOfMonth(m), "yyyy-MM-dd"), accts, ppeAssets);
      return {
        label: format(m, "MMM yyyy"),
        revenue: p.totalRevenue, cogs: p.totalCOGS, grossProfit: p.grossProfit, opex: p.totalOpex, net: p.incomeBeforeTax,
        margin: p.totalRevenue > 0 ? (p.incomeBeforeTax / p.totalRevenue) * 100 : 0,
      };
    });
  }, [transactions, chartOfAccounts, bankAccounts, ppeAssets, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-foreground">Income Statement Trend</h3>
        <p className="text-xs text-muted-foreground mb-4">Monthly revenue, costs and net income based on Income Statement accounts</p>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tickFormatter={short} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v) => fmt(v)} />
            <Legend />
            <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="cogs" name="Cost of Sales" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="opex" name="Operating Expenses" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
            <Line type="monotone" dataKey="net" name="Net Income" stroke="hsl(var(--chart-2))" strokeWidth={2.5} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <IncomeStatementTrendTable rows={rows} />
    </div>
  );
}