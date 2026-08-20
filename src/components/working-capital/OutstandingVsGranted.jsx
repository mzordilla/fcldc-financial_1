import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card } from "@/components/ui/card";
import { getLoanBalance } from "@/lib/loanBalance";

export default function OutstandingVsGranted({ items }) {
  const creditLines = items.filter((d) => d.status === "active" && d.type === "credit_line" && d.amount_granted);
  const mortgages = items.filter((d) => d.status === "active" && d.type === "mortgage" && d.amount_granted);
  const allItems = [...creditLines, ...mortgages];

  const creditLineGranted = creditLines.reduce((s, d) => s + (d.amount_granted || 0), 0);
  const creditLineOutstanding = creditLines.reduce((s, d) => s + getLoanBalance(d), 0);
  const creditLineAvailable = creditLineGranted - creditLineOutstanding;

  const totalOutstanding = allItems.reduce((s, d) => s + getLoanBalance(d), 0);
  const totalGranted = allItems.reduce((s, d) => s + (d.amount_granted || 0), 0);

  const pieData = [
  { name: "Outstanding", value: totalOutstanding },
  { name: "Available", value: Math.max(0, creditLineAvailable) }];


  const utilization = totalGranted > 0 ? Math.min(100, Math.round((totalOutstanding / totalGranted) * 100)) : 0;

  return (
    <Card className="rounded-xl p-4 shadow-sm">
      <div>
        <h3 className="font-project-display text-base font-bold text-foreground">Debt Utilization</h3>
        <div className="mt-3 space-y-1.5 text-[11px]">
          <div className="flex justify-between border-b border-border/60 pb-1"><span>Total Granted</span><strong>₱{totalGranted.toLocaleString()}</strong></div>
          <div className="flex justify-between border-b border-border/60 pb-1"><span>Outstanding</span><strong>₱{totalOutstanding.toLocaleString()}</strong></div>
          <div className="flex justify-between"><span>Available (Credit Line)</span><strong>₱{Math.max(0, creditLineAvailable).toLocaleString()}</strong></div>
        </div>
      </div>
      <p className="mt-4 text-[11px] font-bold text-foreground">Outstanding vs Amount Granted</p>
      {allItems.length === 0 ? <p className="py-8 text-center text-xs text-muted-foreground">No active loans with amounts granted</p> :
        <div className="mt-2 text-center">
          <svg viewBox="0 0 176 96" className="mx-auto h-24 w-full max-w-44" aria-label={`${utilization}% utilized`}>
            <path d="M 16 88 A 72 72 0 0 1 160 88" fill="none" stroke="hsl(var(--muted))" strokeWidth="12" strokeLinecap="round" pathLength="100" />
            <path d="M 16 88 A 72 72 0 0 1 160 88" fill="none" stroke="hsl(var(--destructive))" strokeWidth="12" strokeLinecap="round" pathLength="100" strokeDasharray={`${utilization} 100`} />
            <text x="88" y="78" textAnchor="middle" className="fill-foreground text-xl font-bold">{utilization}%</text>
          </svg>
          <div className="-mt-1 flex justify-center gap-4 text-[9px] text-muted-foreground"><span className="flex items-center gap-1"><i className="h-1.5 w-4 bg-destructive" />Utilization</span><span className="flex items-center gap-1"><i className="h-1.5 w-4 bg-chart-2" />Available</span></div>
        </div>}
    </Card>
  );
}