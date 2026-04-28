import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";

function buildChartData(transactions) {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = subMonths(new Date(), i);
    const start = startOfMonth(monthDate);
    const end = endOfMonth(monthDate);
    
    let income = 0;
    let expenses = 0;
    
    transactions.forEach(t => {
      if (!t.date) return;
      const d = new Date(t.date);
      if (isWithinInterval(d, { start, end })) {
        if (t.type === "income") income += t.amount || 0;
        else expenses += t.amount || 0;
      }
    });

    months.push({
      month: format(monthDate, "MMM"),
      income,
      expenses,
      net: income - expenses,
    });
  }
  return months;
}

const formatCurrency = (val) => `$${(val / 1000).toFixed(0)}k`;

export default function CashFlowChart({ transactions }) {
  const data = buildChartData(transactions);

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Cash Flow</h3>
          <p className="text-sm text-muted-foreground">Income vs Expenses over 6 months</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            Income
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
            Expenses
          </div>
        </div>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(160, 84%, 39%)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0.2} />
                <stop offset="100%" stopColor="hsl(0, 84%, 60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
            <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(220, 9%, 46%)' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(220, 9%, 46%)' }} tickFormatter={formatCurrency} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid hsl(220, 13%, 91%)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
              formatter={(value) => [`$${value.toLocaleString()}`, undefined]}
            />
            <Area type="monotone" dataKey="income" stroke="hsl(160, 84%, 39%)" fill="url(#incomeGrad)" strokeWidth={2.5} />
            <Area type="monotone" dataKey="expenses" stroke="hsl(0, 84%, 60%)" fill="url(#expenseGrad)" strokeWidth={2.5} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}