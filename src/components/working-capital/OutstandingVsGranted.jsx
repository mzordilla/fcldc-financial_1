import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";

export default function OutstandingVsGranted({ items }) {
  const items_filtered = items.filter(d => d.status === "active" && d.amount_granted && d.type === "credit_line");
  
  const totalGranted = items_filtered.reduce((s, d) => s + (d.amount_granted || 0), 0);
  const totalOutstanding = items_filtered.reduce((s, d) => s + ((d.total_amount || 0) - (d.amount_paid || 0)), 0);
  const available = totalGranted - totalOutstanding;

  const pieData = [
    { name: "Outstanding", value: totalOutstanding },
    { name: "Available", value: Math.max(0, available) },
  ];

  const COLORS = ["hsl(var(--destructive))", "hsl(var(--chart-2))"];

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">Outstanding vs Amount Granted</h3>
        <p className="text-sm text-muted-foreground">Debt utilization overview</p>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div>
            <p className="text-xs text-muted-foreground">Total Granted</p>
            <p className="text-lg font-bold text-chart-2">₱{totalGranted.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="text-lg font-bold text-destructive">₱{totalOutstanding.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Available</p>
            <p className="text-lg font-bold text-primary">₱{available.toLocaleString()}</p>
          </div>
        </div>
      </div>
      {items_filtered.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground text-sm">No active loans with amounts granted</p>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              formatter={(v) => `₱${v.toLocaleString()}`}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}