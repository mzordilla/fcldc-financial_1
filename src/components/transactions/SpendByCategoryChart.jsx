import { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const CATEGORY_LABELS = {
  project_payment: "Project Payments",
  material_cost: "Materials",
  labor: "Labor",
  equipment: "Equipment",
  subcontractor: "Subcontractor",
  overhead: "Overhead",
  permits: "Permits & Fees",
  insurance: "Insurance",
  bank_reconciliation: "Bank Reconciliation",
  other: "Other",
};

const COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#f97316", "#84cc16",
  "#ec4899", "#6b7280",
];

const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value, payload: { percent } } = payload[0];
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-foreground">{name}</p>
      <p className="text-muted-foreground">{fmt(value)} <span className="text-xs">({(percent * 100).toFixed(1)}%)</span></p>
    </div>
  );
};

export default function SpendByCategoryChart({ transactions = [] }) {
  const data = useMemo(() => {
    const expenses = transactions.filter(t => t.type === "expense");
    const map = {};
    expenses.forEach(t => {
      const cat = t.category || "other";
      map[cat] = (map[cat] || 0) + (t.amount || 0);
    });
    return Object.entries(map)
      .map(([cat, value]) => ({ name: CATEGORY_LABELS[cat] || cat, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  const totalExpenses = data.reduce((s, d) => s + d.value, 0);

  if (data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center justify-center h-48">
        <p className="text-muted-foreground text-sm">No expense data to display</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">Spend by Category</h3>
        <p className="text-xs text-muted-foreground mt-0.5">Total expenses: {fmt(totalExpenses)}</p>
      </div>
      <div className="flex flex-col lg:flex-row gap-4 items-center">
        <div className="w-full lg:w-64 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5 w-full">
          {data.map((d, i) => (
            <div key={d.name} className="flex items-center gap-2 py-1">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-xs text-muted-foreground truncate flex-1">{d.name}</span>
              <span className="text-xs font-medium text-foreground ml-auto">{fmt(d.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}