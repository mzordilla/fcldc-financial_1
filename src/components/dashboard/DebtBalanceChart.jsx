import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const fmt = (v) => `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-lg text-sm">
      <p className="font-semibold text-foreground mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="flex justify-between gap-6">
          <span>{p.name}</span>
          <span className="font-medium">{fmt(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

export default function DebtBalanceChart({ loans = [], debts = [] }) {
  // Combine loans and debts grouped by creditor/lender name
  const map = {};

  loans.forEach((l) => {
    const key = l.lender || "Unknown";
    if (!map[key]) map[key] = { name: key, Principal: 0, Outstanding: 0 };
    map[key].Principal += l.principal || 0;
    map[key].Outstanding += l.outstanding_balance ?? l.principal ?? 0;
  });

  debts.forEach((d) => {
    const key = d.creditor || "Unknown";
    if (!map[key]) map[key] = { name: key, Principal: 0, Outstanding: 0 };
    map[key].Principal += d.total_amount || 0;
    map[key].Outstanding += (d.total_amount || 0) - (d.amount_paid || 0);
  });

  const data = Object.values(map).sort((a, b) => b.Principal - a.Principal);

  if (data.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-6">
        <h3 className="text-sm font-semibold text-foreground mb-1">Debt by Creditor</h3>
        <p className="text-sm text-muted-foreground">No loan or debt data available.</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <h3 className="text-sm font-semibold text-foreground mb-0.5">Debt by Creditor</h3>
      <p className="text-xs text-muted-foreground mb-5">
        Principal vs. outstanding balance across all bank loans and debts
      </p>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, paddingTop: 12 }}
            formatter={(value) => <span style={{ color: "hsl(var(--muted-foreground))" }}>{value}</span>}
          />
          <Bar dataKey="Principal" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Outstanding" fill="hsl(var(--chart-5))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}