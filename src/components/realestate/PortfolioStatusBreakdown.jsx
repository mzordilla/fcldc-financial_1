import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#64748b"];
const LABELS = { available_for_sale: "For Sale", available_for_lease: "For Lease", sold: "Sold", leased: "Leased", reserved: "Reserved", under_renovation: "Renovation" };

function StatusPie({ title, records }) {
  const counts = records.reduce((result, record) => ({ ...result, [record.status || "unknown"]: (result[record.status || "unknown"] || 0) + 1 }), {});
  const data = Object.entries(counts).map(([key, value]) => ({ name: LABELS[key] || key, value }));

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-2 text-center"><p className="text-sm font-semibold text-foreground">{title}</p><p className="text-xs text-muted-foreground">{records.length} records</p></div>
      {data.length ? <div className="flex items-center gap-4">
        <ResponsiveContainer width="60%" height={190}>
          <PieChart><Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} innerRadius={34}>{data.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
        </ResponsiveContainer>
        <div className="min-w-[130px] space-y-2">{data.map((item, index) => <div key={item.name} className="flex items-center justify-between gap-3 text-xs"><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />{item.name}</span><strong>{item.value}</strong></div>)}</div>
      </div> : <p className="py-16 text-center text-sm text-muted-foreground">No data</p>}
    </div>
  );
}

export default function PortfolioStatusBreakdown({ units, parking }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:col-span-2">
      <h3 className="mb-5 font-semibold text-foreground">Unit Status Breakdown</h3>
      <div className="flex flex-col gap-6 md:flex-row md:divide-x md:divide-border"><StatusPie title="Condo & Commercial Units" records={units} /><StatusPie title="Parking" records={parking} /></div>
    </div>
  );
}