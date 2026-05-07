import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Card } from "@/components/ui/card";

export default function WorkingCapitalComparison({ debts }) {
  const data = debts
    .filter(d => d.status === "active")
    .map(d => ({
      creditor: d.creditor,
      availed: d.amount_availed || 0,
      outstanding: (d.total_amount || 0) - (d.amount_paid || 0),
    }));

  const totalAvailed = data.reduce((s, d) => s + d.availed, 0);
  const totalOutstanding = data.reduce((s, d) => s + d.outstanding, 0);

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-foreground mb-1">Working Capital Comparison</h3>
        <p className="text-sm text-muted-foreground">Availed vs Outstanding by creditor</p>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-xs text-muted-foreground">Total Availed</p>
            <p className="text-lg font-bold text-chart-2">₱{totalAvailed.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Outstanding</p>
            <p className="text-lg font-bold text-destructive">₱{totalOutstanding.toLocaleString()}</p>
          </div>
        </div>
      </div>
      {data.length === 0 ? (
        <p className="text-center py-8 text-muted-foreground text-sm">No active loans</p>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
            <YAxis type="category" dataKey="creditor" width={120} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              formatter={(v) => `₱${v.toLocaleString()}`}
            />
            <Legend />
            <Bar dataKey="availed" fill="hsl(var(--chart-2))" name="Availed" />
            <Bar dataKey="outstanding" fill="hsl(var(--destructive))" name="Outstanding" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}