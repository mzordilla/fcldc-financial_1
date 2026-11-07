import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import Slide from "../Slide";
import RankedTable from "../RankedTable";
import { peso } from "@/lib/boardReport";

export const PALETTE = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(var(--primary) / 0.5)", "hsl(var(--chart-2) / 0.5)", "hsl(var(--muted-foreground))"];

export default function ExpenseSlide({ report: r, number }) {
  return (
    <Slide title="Cost & Expense Breakdown" subtitle="Cost of sales and operating expenses by account" number={number} monthLabel={r.month.label}>
      {r.expenses.length === 0 ? <p className="text-muted-foreground">No expenses recorded this month.</p> : (
        <div className="grid grid-cols-2 gap-8 h-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={r.expenses} dataKey="value" nameKey="name" innerRadius="50%" outerRadius="85%" paddingAngle={2} isAnimationActive={false}>
                {r.expenses.map((e, i) => <Cell key={e.name} fill={PALETTE[i % PALETTE.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => peso(v)} />
            </PieChart>
          </ResponsiveContainer>
          <RankedTable title="Top expense accounts" rows={r.expenses} />
        </div>
      )}
    </Slide>
  );
}