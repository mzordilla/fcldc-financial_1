import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#14b8a6", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function OutstandingByCreditor({ items }) {
  const activeLoans = items.filter(d => d.status === "active");
  
  // Group by creditor and calculate outstanding
  const byCreditor = {};
  activeLoans.forEach(loan => {
    const outstanding = (loan.total_amount || 0) - (loan.amount_paid || 0);
    if (outstanding > 0) {
      if (!byCreditor[loan.creditor]) {
        byCreditor[loan.creditor] = 0;
      }
      byCreditor[loan.creditor] += outstanding;
    }
  });

  const data = Object.keys(byCreditor).map(creditor => ({
    name: creditor,
    value: byCreditor[creditor],
  })).sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outstanding by Creditor</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">No active loans</p>
        </CardContent>
      </Card>
    );
  }

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Outstanding by Creditor</CardTitle>
        <p className="text-sm text-muted-foreground mt-1">Total: ₱{total.toLocaleString()}</p>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => `₱${value.toLocaleString()}`}
              contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
            />
            <Legend wrapperStyle={{ paddingTop: "1rem" }} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}