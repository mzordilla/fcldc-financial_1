import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Card } from "@/components/ui/card";

export default function OutstandingVsGranted({ items }) {
  const data = items
    .filter(d => d.status === "active" && d.amount_granted)
    .map(d => ({
      creditor: d.creditor,
      granted: d.amount_granted || 0,
      outstanding: (d.total_amount || 0) - (d.amount_paid || 0),
    }));

  const totalGranted = data.reduce((s, d) => s + d.granted, 0);
  const totalOutstanding = data.reduce((s, d) => s + d.outstanding, 0);

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">Outstanding vs Amount Granted</h3>
        <p className="text-sm text-muted-foreground">Debt utilization by creditor</p>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-xs text-muted-foreground">Total Granted</p>
            <p className="text-lg font-bold text-chart-2">₱{totalGranted.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Outstanding</p>
            <p className="text-lg font-bold text-destructive">₱{totalOutstanding.toLocaleString()}</p>
          </div>
        </div>
      </div>
      {data.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground text-sm">No active loans with amounts granted</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="creditor" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={80} />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              formatter={(v) => `₱${v.toLocaleString()}`}
            />
            <Legend />
            <Bar dataKey="granted" fill="hsl(var(--chart-2))" name="Amount Granted" />
            <Bar dataKey="outstanding" fill="hsl(var(--destructive))" name="Outstanding" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}