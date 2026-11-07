import Slide from "../Slide";
import BoardKpi from "../BoardKpi";
import HBarChart from "../HBarChart";
import { pesoShort } from "@/lib/boardReport";

export default function CashSlide({ report: r, number }) {
  const { cash } = r;
  return (
    <Slide title="Cash Position" subtitle="Current bank balances and this month's bank cash flow" number={number} monthLabel={r.month.label}>
      <div className="grid grid-cols-3 gap-6 h-full">
        <div className="flex flex-col gap-3">
          <BoardKpi label="Total Cash in Banks" value={pesoShort(cash.total)} note="Current balance" />
          <BoardKpi label="Cash Inflows" value={pesoShort(cash.cashIn)} tone="good" note={r.month.label} />
          <BoardKpi label="Cash Outflows" value={pesoShort(cash.cashOut)} tone="bad" note={r.month.label} />
          <BoardKpi label="Net Cash Flow" value={pesoShort(cash.cashIn - cash.cashOut)} tone={cash.cashIn - cash.cashOut < 0 ? "bad" : "good"} />
        </div>
        <div className="col-span-2 min-h-0"><HBarChart data={cash.banks.slice(0, 10)} color="hsl(var(--chart-2))" /></div>
      </div>
    </Slide>
  );
}