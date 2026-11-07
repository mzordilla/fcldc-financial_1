import CoverSlide from "./slides/CoverSlide";
import SummarySlide from "./slides/SummarySlide";
import IncomeSlide from "./slides/IncomeSlide";
import TrendSlide from "./slides/TrendSlide";
import ExpenseSlide from "./slides/ExpenseSlide";
import CashSlide from "./slides/CashSlide";
import ReceivablesSlide from "./slides/ReceivablesSlide";
import PayablesSlide from "./slides/PayablesSlide";
import LoansSlide from "./slides/LoansSlide";
import ProjectsSlide from "./slides/ProjectsSlide";
import HighlightsSlide from "./slides/HighlightsSlide";

export const SLIDES = [CoverSlide, SummarySlide, IncomeSlide, TrendSlide, ExpenseSlide, CashSlide, ReceivablesSlide, PayablesSlide, LoansSlide, ProjectsSlide, HighlightsSlide];

export function renderSlide(index, report) {
  const Comp = SLIDES[index];
  return <Comp key={index} report={report} number={`${index + 1} / ${SLIDES.length}`} />;
}

export default function BoardDeck({ report }) {
  return (
    <div id="board-deck" className="space-y-6">
      {SLIDES.map((_, i) => renderSlide(i, report))}
    </div>
  );
}