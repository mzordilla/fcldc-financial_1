import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";

export default function ProjectedCashOutflows({ items }) {
  const activeLoans = items.filter(d => d.status === "active" && d.monthly_payment);

  // Create 12-month projection
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() + i);
    return {
      month: date.toLocaleString("default", { month: "short" }),
      monthNum: date.getMonth(),
      year: date.getFullYear(),
    };
  });

  const chartData = months.map((m) => {
    const totalOutflow = activeLoans.reduce((sum, loan) => {
      if (loan.due_date && new Date(loan.due_date) < new Date(m.year, m.monthNum + 1, 1)) {
        return sum;
      }
      return sum + (loan.monthly_payment || 0);
    }, 0);

    return {
      name: `${m.month}`,
      outflow: totalOutflow,
    };
  });

  const totalMonthlyAverage =
    activeLoans.reduce((sum, d) => sum + (d.monthly_payment || 0), 0);

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">Projected Monthly Debt Servicing</h3>
        <p className="text-sm text-muted-foreground">12-month cash outflow projection</p>
        <div className="mt-4">
          <p className="text-xs text-muted-foreground">Monthly Average</p>
          <p className="text-lg font-bold text-destructive">₱{totalMonthlyAverage.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
      </div>
      {activeLoans.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground text-sm">No active loans with monthly payments</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              formatter={(v) => `₱${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            />
            <Legend />
            <Bar dataKey="outflow" name="Monthly Outflow" fill="hsl(var(--destructive))" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}