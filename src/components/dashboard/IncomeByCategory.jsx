import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

const CATEGORY_LABELS = {
  project_payment: "Projects",
  material_cost: "Materials",
  labor: "Labor",
  equipment: "Equipment",
  subcontractor: "Subcontractor",
  overhead: "Overhead",
  permits: "Permits",
  insurance: "Insurance",
  other: "Other",
};

const COLORS = [
  "hsl(160, 84%, 39%)",
  "hsl(199, 89%, 48%)",
  "hsl(43, 96%, 56%)",
  "hsl(280, 65%, 60%)",
  "hsl(0, 84%, 60%)",
  "hsl(160, 50%, 55%)",
  "hsl(199, 60%, 60%)",
  "hsl(43, 70%, 70%)",
];

export default function IncomeByCategory({ transactions }) {
  const categoryTotals = {};
  transactions
    .filter(t => t.type === "income" && t.category)
    .forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + (t.amount || 0);
    });

  const data = Object.entries(categoryTotals)
    .map(([key, value]) => ({ name: CATEGORY_LABELS[key] || key, amount: value }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);

  return (
    <div className="bg-card rounded-2xl border border-border p-6">
      <h3 className="text-lg font-semibold text-foreground mb-1">Income by Category</h3>
      <p className="text-sm text-muted-foreground mb-6">Revenue breakdown</p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -15, bottom: 0 }} barSize={32}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(220, 9%, 46%)' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'hsl(220, 9%, 46%)' }} tickFormatter={(v) => `₱${(v/1000).toFixed(0)}k`} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: '1px solid hsl(220, 13%, 91%)', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
              formatter={(value) => [`₱${value.toLocaleString()}`, "Amount"]}
            />
            <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
              {data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}