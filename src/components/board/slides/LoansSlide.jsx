import Slide from "../Slide";
import BoardKpi from "../BoardKpi";
import HBarChart from "../HBarChart";
import { pesoShort } from "@/lib/boardReport";

export default function LoansSlide({ report: r, number }) {
  const l = r.loans;
  return (
    <Slide title="Debt & Working Capital Loans" subtitle="Outstanding facilities by creditor" number={number} monthLabel={r.month.label}>
      <div className="grid grid-cols-3 gap-6 h-full">
        <div className="flex flex-col gap-3">
          <BoardKpi label="Outstanding Balance" value={pesoShort(l.balance)} note={`${l.count} active facilities`} />
          <BoardKpi label="Total Granted" value={pesoShort(l.granted)} note={l.granted ? `${((l.balance / l.granted) * 100).toFixed(0)}% utilized` : ""} />
          <BoardKpi label="Paid This Month" value={pesoShort(l.paidThisMonth)} tone="good" />
          <BoardKpi label="Availed This Month" value={pesoShort(l.availedThisMonth)} />
        </div>
        <div className="col-span-2 min-h-0">
          {l.byCreditor.length ? <HBarChart data={l.byCreditor} color="hsl(var(--chart-4))" /> : <p className="text-muted-foreground">No active loans.</p>}
        </div>
      </div>
    </Slide>
  );
}