import { Fragment, forwardRef } from "react";
import { computeTotals, peso, periodHeading, formatLongDate } from "@/lib/associationStatement";

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV"];
const SIGNATORIES = [["prepared_by", "Prepared by:"], ["checked_by", "Checked by:"], ["approved_by", "Approved by:"]];
const amountCell = "text-right w-36 tabular-nums whitespace-nowrap";

const StatementDocument = forwardRef(function StatementDocument({ statement }, ref) {
  const t = computeTotals(statement.sections);
  const income = t.sections.filter((s) => s.type === "income");
  const expenses = t.sections.filter((s) => s.type === "expense");
  const n = t.sections.length;

  return (
    <div ref={ref} className="print-doc bg-paper text-ink font-serif w-[794px] shrink-0 p-12 border border-border shadow-sm text-[13px] leading-relaxed">
      <header className="text-center">
        <h1 className="text-xl font-bold uppercase tracking-wide">{statement.condominium_name || "Condominium Name"}</h1>
        <p className="font-bold uppercase tracking-wide mt-1">Statement of Financial Operations</p>
        <p>{periodHeading(statement)}</p>
        <p className="italic text-xs">(Amounts in Philippine Peso)</p>
      </header>
      <div className="flex justify-between text-xs mt-5 pb-2 border-b-2 border-ink">
        <span>Date Prepared: {formatLongDate(statement.preparation_date) || "—"}</span>
        <span>Prepared by: {statement.prepared_by || "—"}</span>
      </div>

      <table className="w-full border-collapse">
        <tbody>
          {t.sections.map((s, i) => (
            <Fragment key={i}>
              <tr><td colSpan={3} className="pt-5 pb-1 font-bold uppercase">{ROMAN[i]}. {s.title || "Untitled Category"}</td></tr>
              {s.lines.map((l, j) => (
                <tr key={j}><td className="pl-6 py-0.5">{l.description || "—"}</td><td className={amountCell}>{peso(l.amount)}</td><td className="w-36" /></tr>
              ))}
              <tr className="font-semibold">
                <td className="pl-3 py-1">Total {s.title}</td><td className="border-t border-ink" /><td className={`${amountCell} border-t border-ink`}>{peso(s.total)}</td>
              </tr>
            </Fragment>
          ))}

          <tr><td colSpan={3} className="pt-6 pb-1 font-bold uppercase border-t-2 border-ink">{ROMAN[n]}. Summary of Financial Operations</td></tr>
          {income.map((s, i) => (
            <tr key={i}><td className="pl-6 py-0.5">{s.title}</td><td /><td className={amountCell}>{peso(s.total)}</td></tr>
          ))}
          <tr><td className="pl-6 py-0.5 italic">Less: Operating Expenses</td><td /><td /></tr>
          {expenses.map((s, i) => (
            <tr key={i}><td className="pl-10 py-0.5">{s.title}</td><td className={amountCell}>{peso(s.total)}</td><td /></tr>
          ))}
          <tr className="font-semibold">
            <td className="pl-6 py-1">Total Operating Expenses</td><td className="border-t border-ink" /><td className={`${amountCell} border-t border-ink`}>{peso(t.totalExpenses)}</td>
          </tr>
          <tr className="font-bold uppercase">
            <td className="pt-4 pb-1">{ROMAN[n + 1]}. Net Operating {t.net < 0 ? "Deficit" : "Surplus"}</td><td />
            <td className={`${amountCell} pt-4 pb-1 border-b-4 border-double border-ink`}>{peso(t.net)}</td>
          </tr>
        </tbody>
      </table>

      {statement.notes && <p className="mt-6 text-xs whitespace-pre-wrap"><span className="font-bold">Notes: </span>{statement.notes}</p>}

      <div className="avoid-break grid grid-cols-3 gap-8 mt-14 text-xs">
        {SIGNATORIES.map(([field, label]) => (
          <div key={field}>
            <p>{label}</p>
            <div className="h-12 border-b border-ink" />
            <p className="font-bold uppercase text-center mt-1">{statement[field] || "\u00A0"}</p>
            <p className="text-center">{statement[`${field}_position`] || "\u00A0"}</p>
          </div>
        ))}
      </div>
    </div>
  );
});

export default StatementDocument;