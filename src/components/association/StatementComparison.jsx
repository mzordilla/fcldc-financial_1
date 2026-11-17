import { Fragment, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildComparison, peso } from "@/lib/associationStatement";
import { printElement } from "@/lib/printDocument";

const MAX = 4;
const cell = "text-right px-2 tabular-nums whitespace-nowrap";

export default function StatementComparison({ statements }) {
  const docRef = useRef(null);
  const [picked, setPicked] = useState(null);
  const ids = (picked ?? statements.slice(0, 2).map((s) => s.id)).filter((id) => statements.some((s) => s.id === id));
  const list = statements.filter((s) => ids.includes(s.id)).sort((a, b) => (a.period_end || "").localeCompare(b.period_end || ""));
  const c = buildComparison(list);
  const showVariance = list.length === 2;
  const toggle = (id) => setPicked(ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < MAX ? [...ids, id] : ids);

  const Row = ({ label, values, className = "", indent = "pl-6" }) => {
    const diff = values[1] - values[0];
    return (
      <tr className={className}>
        <td className={`${indent} py-0.5`}>{label}</td>
        {values.map((v, i) => <td key={i} className={cell}>{peso(v)}</td>)}
        {showVariance && <td className={cell}>{peso(diff)}</td>}
        {showVariance && <td className={cell}>{values[0] ? `${((diff / Math.abs(values[0])) * 100).toFixed(1)}%` : "—"}</td>}
      </tr>
    );
  };

  if (!statements.length) return <p className="py-16 text-center text-muted-foreground bg-card border border-border rounded-xl">Save at least one statement to compare reporting periods.</p>;

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">Select up to {MAX} reporting periods to compare. With two selected, the variance is shown.</p>
          <Button variant="outline" size="sm" disabled={!list.length} onClick={() => printElement(docRef.current, "Comparative Statement of Financial Operations")}><Printer /> Print</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {statements.map((s) => (
            <button key={s.id} type="button" onClick={() => toggle(s.id)}
              className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-colors ${ids.includes(s.id) ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted"}`}>
              {s.period_label}
            </button>
          ))}
        </div>
      </div>

      {list.length > 0 && (
        <div className="overflow-x-auto"><div className="flex justify-center min-w-max">
          <div ref={docRef} className="print-doc bg-paper text-ink font-serif w-[900px] shrink-0 p-10 border border-border shadow-sm text-[12px] leading-relaxed">
            <header className="text-center mb-4">
              <h1 className="text-lg font-bold uppercase tracking-wide">{list[list.length - 1].condominium_name}</h1>
              <p className="font-bold uppercase tracking-wide">Comparative Statement of Financial Operations</p>
              <p className="italic text-xs">(Amounts in Philippine Peso)</p>
            </header>
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-y-2 border-ink font-bold">
                  <th className="text-left py-1.5">Particulars</th>
                  {list.map((s) => <th key={s.id} className={cell}>{s.period_label}</th>)}
                  {showVariance && <th className={cell}>Variance</th>}
                  {showVariance && <th className={cell}>%</th>}
                </tr>
              </thead>
              <tbody>
                {c.sections.map((s, i) => (
                  <Fragment key={i}>
                    <tr><td colSpan={99} className="pt-4 pb-1 font-bold uppercase">{s.title}</td></tr>
                    {s.lines.map((l, j) => <Row key={j} label={l.description || "—"} values={l.amounts} />)}
                    <Row label={`Total ${s.title}`} values={s.totals} indent="pl-3" className="font-semibold border-t border-ink" />
                  </Fragment>
                ))}
                <tr><td colSpan={99} className="pt-5 pb-1 font-bold uppercase border-t-2 border-ink">Summary of Financial Operations</td></tr>
                <Row label="Total Income" values={c.totalIncome} />
                <Row label="Total Operating Expenses" values={c.totalExpenses} />
                <Row label="Net Operating Surplus / (Deficit)" values={c.net} indent="pl-0" className="font-bold uppercase border-t border-ink border-b-4 border-double" />
              </tbody>
            </table>
          </div>
        </div></div>
      )}
    </div>
  );
}