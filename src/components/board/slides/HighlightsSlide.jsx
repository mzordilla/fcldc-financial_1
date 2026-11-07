import Slide from "../Slide";
import BoardKpi from "../BoardKpi";
import { pesoShort } from "@/lib/boardReport";

export default function HighlightsSlide({ report: r, number }) {
  const h = r.highlights;
  const current = r.cash.total + r.receivables.total;
  const obligations = r.payables.total + r.loans.balance;
  return (
    <Slide title="Other Highlights & Liquidity" subtitle="Procurement, customer advances and coverage ratios" number={number} monthLabel={r.month.label}>
      <div className="grid grid-cols-3 gap-3">
        <BoardKpi label="Purchase Orders Raised" value={pesoShort(h.poAmount)} note={`${h.poCount} POs in ${r.month.label}`} />
        <BoardKpi label="Purchase Orders Approved" value={pesoShort(h.poApproved)} note={`${h.poPending} POs pending approval`} />
        <BoardKpi label="Customer Advances Held" value={pesoShort(h.advancesAvailable)} note={`${h.advanceCount} unapplied advances`} />
        <BoardKpi label="Cash + Receivables" value={pesoShort(current)} note="Liquid and near-liquid resources" />
        <BoardKpi label="Payables + Loans" value={pesoShort(obligations)} note="Total obligations" />
        <BoardKpi label="Coverage Ratio" value={obligations ? `${(current / obligations).toFixed(2)}x` : "—"} tone={obligations && current / obligations < 1 ? "bad" : "good"} note="Cash + receivables ÷ obligations" />
      </div>
      <div className="mt-5 grid grid-cols-2 gap-6 text-sm">
        <div className="rounded-xl border border-border p-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Cash vs Payables</p><p className="font-project-display text-xl font-bold">{r.payables.total ? `${(r.cash.total / r.payables.total).toFixed(2)}x` : "—"}</p><p className="text-muted-foreground">Ability to settle all supplier bills from cash on hand.</p></div>
        <div className="rounded-xl border border-border p-4"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Year-to-Date Revenue</p><p className="font-project-display text-xl font-bold">{pesoShort(r.ytd.totalRevenue)}</p><p className="text-muted-foreground">Net income YTD {pesoShort(r.ytd.incomeBeforeTax)}.</p></div>
      </div>
    </Slide>
  );
}