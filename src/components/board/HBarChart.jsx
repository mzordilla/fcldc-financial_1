import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { peso, pesoShort } from "@/lib/boardReport";

export default function HBarChart({ data, color = "hsl(var(--chart-1))", vertical = false }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout={vertical ? "horizontal" : "vertical"} margin={{ top: 5, right: 20, left: 5, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        {vertical ? <XAxis dataKey="name" tick={{ fontSize: 11 }} /> : <XAxis type="number" tickFormatter={pesoShort} tick={{ fontSize: 11 }} />}
        {vertical ? <YAxis tickFormatter={pesoShort} tick={{ fontSize: 11 }} width={65} /> : <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />}
        <Tooltip formatter={(v) => peso(v)} />
        <Bar dataKey="value" name="Amount" fill={color} radius={vertical ? [4, 4, 0, 0] : [0, 4, 4, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}