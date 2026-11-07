import { TrendingUp, TrendingDown } from "lucide-react";

export default function BoardKpi({ label, value, change, note, tone = "default" }) {
  const toneCls = tone === "bad" ? "text-destructive" : tone === "good" ? "text-primary" : "text-foreground";
  return (
    <div className="rounded-xl border border-border bg-background/60 p-4 flex flex-col gap-1">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-project-display text-2xl font-bold ${toneCls}`}>{value}</p>
      {change !== undefined && (
        <p className={`flex items-center gap-1 text-xs font-semibold ${change >= 0 ? "text-primary" : "text-destructive"}`}>
          {change >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          {Math.abs(change).toFixed(1)}% vs prior month
        </p>
      )}
      {note && <p className="text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}