import { CheckCircle2 } from "lucide-react";
import Slide from "../Slide";
import BoardKpi from "../BoardKpi";
import { pesoShort } from "@/lib/boardReport";

export default function SummarySlide({ report: r, number }) {
  const { cur, prior } = r;
  return (
    <Slide title="Executive Summary" subtitle={`Key results for ${r.month.label}`} number={number} monthLabel={r.month.label}>
      <div className="grid grid-cols-4 gap-3">
        <BoardKpi label="Revenue" value={pesoShort(cur.totalRevenue)} change={r.change(cur.totalRevenue, prior.totalRevenue)} />
        <BoardKpi label="Gross Profit" value={pesoShort(cur.grossProfit)} change={r.change(cur.grossProfit, prior.grossProfit)} />
        <BoardKpi label="Net Income" value={pesoShort(cur.incomeBeforeTax)} change={r.change(cur.incomeBeforeTax, prior.incomeBeforeTax)} tone={cur.incomeBeforeTax < 0 ? "bad" : "good"} />
        <BoardKpi label="Net Margin" value={`${r.netMargin.toFixed(1)}%`} note={`YTD net income ${pesoShort(r.ytd.incomeBeforeTax)}`} />
        <BoardKpi label="Cash in Banks" value={pesoShort(r.cash.total)} note={`${r.cash.banks.length} accounts`} />
        <BoardKpi label="Receivables" value={pesoShort(r.receivables.total)} note={`${pesoShort(r.receivables.overdueAmount)} overdue`} />
        <BoardKpi label="Payables" value={pesoShort(r.payables.total)} note={`${pesoShort(r.payables.overdueAmount)} overdue`} />
        <BoardKpi label="Loans Outstanding" value={pesoShort(r.loans.balance)} note={`${r.loans.count} active facilities`} />
      </div>
      <div className="mt-4 rounded-xl bg-primary/5 border border-primary/20 p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Key Takeaways</p>
        <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          {r.takeaways.map((t) => <li key={t} className="flex gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />{t}</li>)}
        </ul>
      </div>
    </Slide>
  );
}