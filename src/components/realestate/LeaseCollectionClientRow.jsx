import { ChevronDown } from "lucide-react";
import LeaseCollectionClientDetails from "./LeaseCollectionClientDetails";

const fmt = (n) => `₱${Number(n || 0).toLocaleString()}`;

export default function LeaseCollectionClientRow({ group, expanded, onToggle, onOpen }) {
  const { client, rows, buckets, total } = group;
  return <div className="bg-card">
    <button className="w-full px-5 py-3 bg-muted/50 hover:bg-muted/70 transition-colors" onClick={onToggle}>
      <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1fr_1fr_2.5rem] gap-0 items-center">
        <div className="flex items-center gap-2 text-left min-w-0"><ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${expanded ? "" : "-rotate-90"}`} />
          <div className="min-w-0"><h3 className="text-base font-semibold truncate">{client}</h3><p className="text-xs text-muted-foreground mt-0.5">{rows.length} billing month{rows.length !== 1 ? "s" : ""} · {fmt(total)} outstanding</p></div>
        </div>
        <span className="text-right text-xs font-semibold text-primary">{fmt(buckets.current)}</span>
        <span className="text-right text-xs font-semibold text-chart-3">{fmt(buckets.days30)}</span>
        <span className="text-right text-xs font-semibold text-orange-500">{fmt(buckets.days60)}</span>
        <span className="text-right text-xs font-semibold text-destructive">{fmt(buckets.days90)}</span>
        <span className="text-right text-xs font-semibold text-destructive">{fmt(buckets.days90plus)}</span>
        <span className="text-right text-xs font-bold">{fmt(total)}</span><span />
      </div>
    </button>
    {expanded && <LeaseCollectionClientDetails rows={rows} onOpen={onOpen} />}
  </div>;
}