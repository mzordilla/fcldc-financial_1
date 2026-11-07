import Slide from "../Slide";
import BoardKpi from "../BoardKpi";
import HBarChart from "../HBarChart";
import RankedTable from "../RankedTable";
import { pesoShort } from "@/lib/boardReport";

export default function ReceivablesSlide({ report: r, number }) {
  const rec = r.receivables;
  return (
    <Slide title="Accounts Receivable" subtitle="Outstanding balances, aging and collections" number={number} monthLabel={r.month.label}>
      <div className="grid grid-cols-4 gap-3">
        <BoardKpi label="Total Outstanding" value={pesoShort(rec.total)} note={`${rec.count} open accounts`} />
        <BoardKpi label="Overdue" value={pesoShort(rec.overdueAmount)} tone="bad" note={`${rec.overdueCount} accounts`} />
        <BoardKpi label="Collected This Month" value={pesoShort(rec.collected)} tone="good" note={`${rec.collectionCount} collections`} />
        <BoardKpi label="By Type" value={rec.byType[0] ? pesoShort(rec.byType[0].value) : "—"} note={rec.byType.map((t) => `${t.name}: ${pesoShort(t.value)}`).join(" · ") || "—"} />
      </div>
      <div className="grid grid-cols-2 gap-6 mt-4 h-[calc(100%-7.5rem)]">
        <div className="flex flex-col min-h-0"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Aging</p><div className="flex-1 min-h-0"><HBarChart data={rec.aging} vertical color="hsl(var(--chart-1))" /></div></div>
        <RankedTable title="Top clients by balance" rows={rec.topClients.slice(0, 7)} valueLabel="Outstanding" />
      </div>
    </Slide>
  );
}