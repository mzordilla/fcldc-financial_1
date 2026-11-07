import Slide from "../Slide";
import BoardKpi from "../BoardKpi";
import HBarChart from "../HBarChart";
import RankedTable from "../RankedTable";
import { pesoShort } from "@/lib/boardReport";

export default function PayablesSlide({ report: r, number }) {
  const p = r.payables;
  return (
    <Slide title="Accounts Payable" subtitle="Obligations to suppliers, aging and payments made" number={number} monthLabel={r.month.label}>
      <div className="grid grid-cols-4 gap-3">
        <BoardKpi label="Total Outstanding" value={pesoShort(p.total)} note={`${p.count} open bills`} />
        <BoardKpi label="Overdue" value={pesoShort(p.overdueAmount)} tone="bad" note={`${p.overdueCount} bills`} />
        <BoardKpi label="Paid This Month" value={pesoShort(p.paid)} note={`${p.paymentCount} payments`} />
        <BoardKpi label="Due 1-30 Days Past" value={pesoShort(p.aging[1].value)} note="Needs attention" />
      </div>
      <div className="grid grid-cols-2 gap-6 mt-4 h-[calc(100%-7.5rem)]">
        <div className="flex flex-col min-h-0"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Aging</p><div className="flex-1 min-h-0"><HBarChart data={p.aging} vertical color="hsl(var(--chart-5))" /></div></div>
        <RankedTable title="Top suppliers by balance" rows={p.topSuppliers.slice(0, 7)} valueLabel="Outstanding" />
      </div>
    </Slide>
  );
}