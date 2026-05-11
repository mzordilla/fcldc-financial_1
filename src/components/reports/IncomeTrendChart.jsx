import { useMemo } from "react";
import { format, parseISO, eachMonthOfInterval, startOfMonth } from "date-fns";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const income = payload.find(p => p.dataKey === "income");
  const expense = payload.find(p => p.dataKey === "expense");
  const net = (income?.value || 0) - (expense?.value || 0);
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg p-3 text-sm min-w-[180px]">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {income && (
        <div className="flex justify-between gap-4">
          <span className="text-primary">Income</span>
          <span className="font-medium text-primary">{fmt(income.value)}</span>
        </div>
      )}
      {expense && (
        <div className="flex justify-between gap-4">
          <span className="text-destructive">Expenses</span>
          <span className="font-medium text-destructive">{fmt(expense.value)}</span>
        </div>
      )}
      <div className="flex justify-between gap-4 mt-2 pt-2 border-t border-border">
        <span className="text-muted-foreground">Net</span>
        <span className={`font-semibold ${net >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(net)}</span>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, colorClass, Icon }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold mt-0.5 ${colorClass.includes("primary") ? "text-primary" : colorClass.includes("destructive") ? "text-destructive" : "text-foreground"}`}>{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function IncomeTrendChart({ transactions = [], dateFrom, dateTo }) {
  const months = useMemo(() => {
    if (!dateFrom || !dateTo) return [];
    try {
      return eachMonthOfInterval({
        start: startOfMonth(parseISO(dateFrom)),
        end: startOfMonth(parseISO(dateTo)),
      });
    } catch {
      return [];
    }
  }, [dateFrom, dateTo]);

  const chartData = useMemo(() => {
    return months.map((m) => {
      const key = format(m, "yyyy-MM");
      const label = format(m, "MMM yyyy");
      const mTx = transactions.filter(t => t.date && format(parseISO(t.date), "yyyy-MM") === key);
      const income = mTx.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
      const expense = mTx.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
      const net = income - expense;
      return { month: label, income, expense, net };
    });
  }, [months, transactions]);

  // Aggregate stats
  const totals = chartData.reduce(
    (acc, d) => ({ income: acc.income + d.income, expense: acc.expense + d.expense }),
    { income: 0, expense: 0 }
  );
  const netTotal = totals.income - totals.expense;
  const avgIncome = chartData.length ? totals.income / chartData.length : 0;
  const avgExpense = chartData.length ? totals.expense / chartData.length : 0;

  // Best & worst months
  const best = chartData.length ? chartData.reduce((a, b) => (b.net > a.net ? b : a)) : null;
  const worst = chartData.length ? chartData.reduce((a, b) => (b.net < a.net ? b : a)) : null;

  // Month-over-month change for last two months
  const last = chartData[chartData.length - 1];
  const prev = chartData[chartData.length - 2];
  const momChange = last && prev && prev.income > 0
    ? ((last.income - prev.income) / prev.income) * 100
    : null;

  if (chartData.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-10 text-center text-muted-foreground">
        No data for the selected range.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Income"
          value={fmt(totals.income)}
          sub={`Avg ₱${Math.round(avgIncome).toLocaleString()}/mo`}
          colorClass="bg-primary/10"
          Icon={TrendingUp}
        />
        <StatCard
          label="Total Expenses"
          value={fmt(totals.expense)}
          sub={`Avg ₱${Math.round(avgExpense).toLocaleString()}/mo`}
          colorClass="bg-destructive/10"
          Icon={TrendingDown}
        />
        <StatCard
          label="Net Income"
          value={fmt(netTotal)}
          sub={totals.income > 0 ? `${Math.round((netTotal / totals.income) * 100)}% margin` : undefined}
          colorClass={netTotal >= 0 ? "bg-primary/10" : "bg-destructive/10"}
          Icon={netTotal >= 0 ? TrendingUp : TrendingDown}
        />
        <StatCard
          label="MoM Income Change"
          value={momChange !== null ? `${momChange >= 0 ? "+" : ""}${momChange.toFixed(1)}%` : "—"}
          sub={last ? `vs ${prev?.month}` : undefined}
          colorClass={momChange === null ? "bg-muted" : momChange >= 0 ? "bg-primary/10" : "bg-destructive/10"}
          Icon={momChange === null ? Minus : momChange >= 0 ? TrendingUp : TrendingDown}
        />
      </div>

      {/* Trend Line Chart */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">Income vs. Expenses Trend</h3>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-primary inline-block rounded-full" />Income</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-destructive inline-block rounded-full" />Expenses</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-chart-2 inline-block rounded-full" />Net</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              axisLine={false}
              tickLine={false}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="4 4" />
            <Line
              type="monotone"
              dataKey="income"
              name="Income"
              stroke="hsl(var(--primary))"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "hsl(var(--primary))", strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="expense"
              name="Expenses"
              stroke="hsl(var(--destructive))"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "hsl(var(--destructive))", strokeWidth: 0 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="net"
              name="Net"
              stroke="hsl(var(--chart-2))"
              strokeWidth={2}
              strokeDasharray="5 3"
              dot={false}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Data Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">Monthly Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Month</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">Income</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">Expenses</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">Net</th>
                <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">Margin</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((row, i) => {
                const margin = row.income > 0 ? Math.round((row.net / row.income) * 100) : null;
                const isBest = best && row.month === best.month;
                const isWorst = worst && row.month === worst.month && chartData.length > 1;
                return (
                  <tr
                    key={row.month}
                    className={`border-b border-border/50 ${isBest ? "bg-primary/5" : isWorst ? "bg-destructive/5" : i % 2 === 0 ? "" : "bg-muted/20"}`}
                  >
                    <td className="px-5 py-3 font-medium flex items-center gap-2">
                      {row.month}
                      {isBest && <span className="text-xs text-primary font-normal bg-primary/10 px-1.5 py-0.5 rounded">Best</span>}
                      {isWorst && <span className="text-xs text-destructive font-normal bg-destructive/10 px-1.5 py-0.5 rounded">Worst</span>}
                    </td>
                    <td className="px-5 py-3 text-right text-primary">{fmt(row.income)}</td>
                    <td className="px-5 py-3 text-right text-destructive">{fmt(row.expense)}</td>
                    <td className={`px-5 py-3 text-right font-semibold ${row.net >= 0 ? "text-primary" : "text-destructive"}`}>
                      {fmt(row.net)}
                    </td>
                    <td className={`px-5 py-3 text-right text-xs ${margin === null ? "text-muted-foreground" : margin >= 0 ? "text-primary" : "text-destructive"}`}>
                      {margin !== null ? `${margin}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-border bg-muted/30 font-semibold">
                <td className="px-5 py-3">Total</td>
                <td className="px-5 py-3 text-right text-primary">{fmt(totals.income)}</td>
                <td className="px-5 py-3 text-right text-destructive">{fmt(totals.expense)}</td>
                <td className={`px-5 py-3 text-right ${netTotal >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(netTotal)}</td>
                <td className={`px-5 py-3 text-right text-xs ${totals.income > 0 ? (netTotal >= 0 ? "text-primary" : "text-destructive") : "text-muted-foreground"}`}>
                  {totals.income > 0 ? `${Math.round((netTotal / totals.income) * 100)}%` : "—"}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}