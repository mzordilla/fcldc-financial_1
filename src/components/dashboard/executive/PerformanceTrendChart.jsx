import { Area, Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const compact = (v) => `₱${(v / 1000000).toFixed(1)}M`;

export default function PerformanceTrendChart({ series }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-4">
        <h3 className="font-project-display text-base font-bold text-slate-950 dark:text-white">Revenue, Cost & Profit Trend</h3>
        <p className="text-xs text-slate-500">Monthly operating performance</p>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series}>
            <defs>
              <linearGradient id="execNet" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#0d9488" stopOpacity="0.35" />
                <stop offset="1" stopColor="#0d9488" stopOpacity="0" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tickFormatter={compact} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip formatter={(v) => `₱${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar name="Revenue" dataKey="income" fill="#0284c7" radius={[4, 4, 0, 0]} barSize={16} />
            <Bar name="Cost" dataKey="expenses" fill="#f59e0b" radius={[4, 4, 0, 0]} barSize={16} />
            <Area name="Net" type="monotone" dataKey="net" stroke="#0d9488" strokeWidth={2} fill="url(#execNet)" />
            <Line name="Net trend" type="monotone" dataKey="net" stroke="#0d9488" strokeWidth={0} dot={false} legendType="none" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}