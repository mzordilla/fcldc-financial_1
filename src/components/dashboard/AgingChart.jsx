import { differenceInDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const BUCKETS = [
  { label: "Current", color: "hsl(var(--chart-1))" },
  { label: "1–30 days", color: "hsl(var(--chart-3))" },
  { label: "31–60 days", color: "#f97316" },
  { label: "61–90 days", color: "hsl(var(--chart-5))" },
  { label: "90+ days", color: "#dc2626" },
];

function bucketItems(items, amountKey, paidKey, dueDateKey, excludeStatus) {
  const today = new Date();
  const totals = [0, 0, 0, 0, 0];
  items
    .filter((i) => i.status !== excludeStatus)
    .forEach((i) => {
      if (!i[dueDateKey]) return;
      const remaining = (i[amountKey] || 0) - (i[paidKey] || 0);
      const days = differenceInDays(today, new Date(i[dueDateKey]));
      if (days <= 0) totals[0] += remaining;
      else if (days <= 30) totals[1] += remaining;
      else if (days <= 60) totals[2] += remaining;
      else if (days <= 90) totals[3] += remaining;
      else totals[4] += remaining;
    });
  return BUCKETS.map((b, i) => ({ ...b, amount: totals[i] }));
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3 shadow-lg text-sm">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      <p style={{ color: payload[0]?.fill }} className="font-medium">
        ${Number(payload[0]?.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </p>
    </div>
  );
};

function AgingPanel({ title, data, linkPath }) {
  const total = data.reduce((s, b) => s + b.amount, 0);
  return (
    <div className="bg-card rounded-2xl border border-border p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title} Aging</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total outstanding: <span className="font-semibold text-foreground">${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </p>
        </div>
        <a href={linkPath} className="text-xs text-primary hover:underline">View all →</a>
      </div>

      {/* Bucket summary pills */}
      <div className="grid grid-cols-5 gap-1.5">
        {data.map((b) => (
          <div key={b.label} className="text-center">
            <div className="h-1 rounded-full mb-1.5" style={{ backgroundColor: b.color }} />
            <p className="text-[10px] text-muted-foreground leading-tight">{b.label}</p>
            <p className={`text-xs font-bold mt-0.5 ${b.amount > 0 && b.label !== "Current" ? "text-destructive" : "text-foreground"}`}>
              ${b.amount >= 1000 ? `${(b.amount / 1000).toFixed(1)}k` : b.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </p>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} margin={{ top: 4, right: 0, left: -20, bottom: 0 }} barCategoryGap="35%">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "hsl(var(--muted))" }} />
          <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
            {data.map((b) => <Cell key={b.label} fill={b.color} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function AgingChart({ receivables = [], payables = [] }) {
  const receivableData = bucketItems(receivables, "amount", "amount_paid", "due_date", "paid");
  const payableData = bucketItems(payables, "amount", "amount_paid", "due_date", "paid");

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <AgingPanel title="Receivables" data={receivableData} linkPath="/receivables" />
      <AgingPanel title="Payables" data={payableData} linkPath="/payables" />
    </div>
  );
}