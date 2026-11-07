import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import Slide from "../Slide";
import { peso, pesoShort } from "@/lib/boardReport";

export default function TrendSlide({ report: r, number }) {
  return (
    <Slide title="Six-Month Performance Trend" subtitle="Revenue, total costs and net income" number={number} monthLabel={r.month.label}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={r.trend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tickFormatter={pesoShort} tick={{ fontSize: 11 }} width={70} />
          <Tooltip formatter={(v) => peso(v)} />
          <Legend />
          <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="costs" name="Total Costs" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          <Line dataKey="net" name="Net Income" stroke="hsl(var(--chart-3))" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </Slide>
  );
}