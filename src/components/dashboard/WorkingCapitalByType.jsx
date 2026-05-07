import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";

const typeLabels = {
  loan: "Loan",
  credit_line: "Credit Line",
  equipment_financing: "Equipment Financing",
  vendor_credit: "Vendor Credit",
  mortgage: "Mortgage",
  other: "Other",
};

const typeColors = {
  loan: "#20c997",
  credit_line: "#4c6ef5",
  equipment_financing: "#ff922b",
  vendor_credit: "#a61e4d",
  mortgage: "#748ffc",
  other: "#adb5bd",
};

export default function WorkingCapitalByType({ debts = [] }) {
  const activeDebts = debts.filter(d => d.status === "active");
  
  const typeBreakdown = Object.keys(typeLabels).map(type => {
    const typedDebts = activeDebts.filter(d => d.type === type);
    return {
      type: typeLabels[type],
      outstanding: typedDebts.reduce((s, d) => s + ((d.total_amount || 0) - (d.amount_paid || 0)), 0),
      count: typedDebts.length,
    };
  }).filter(d => d.count > 0);

  if (typeBreakdown.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-8 text-center">
        <p className="text-muted-foreground">No working capital loans</p>
      </div>
    );
  }

  const colors = typeBreakdown.map(d => typeColors[Object.keys(typeLabels).find(k => typeLabels[k] === d.type)] || "#adb5bd");

  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <h3 className="font-semibold text-foreground mb-4">Working Capital Loans by Type</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={typeBreakdown}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="type" stroke="var(--muted-foreground)" style={{ fontSize: "12px" }} />
          <YAxis stroke="var(--muted-foreground)" style={{ fontSize: "12px" }} />
          <Tooltip 
            contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
            labelStyle={{ color: "var(--foreground)" }}
            formatter={(value) => `₱${value.toLocaleString()}`}
          />
          <Bar dataKey="outstanding" fill="var(--chart-2)" radius={[8, 8, 0, 0]}>
            {typeBreakdown.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {typeBreakdown.map((item, idx) => (
          <div key={item.type} className="text-center">
            <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: colors[idx] }} />
            <p className="text-xs font-medium text-foreground">{item.type}</p>
            <p className="text-xs text-muted-foreground">{item.count} loan{item.count !== 1 ? 's' : ''}</p>
            <p className="text-sm font-semibold text-foreground">₱{(item.outstanding).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
        ))}
      </div>
    </div>
  );
}