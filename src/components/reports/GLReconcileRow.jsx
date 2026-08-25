import { useState } from "react";
import { ChevronDown, ChevronRight, ScanSearch } from "lucide-react";
import { format, parseISO } from "date-fns";

const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtSigned = (v) => (v < 0 ? `-₱${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : fmt(v));

/**
 * A balance-sheet line item showing the entity-derived figure, with an expandable
 * general-ledger overlay of the Chart of Account postings behind it plus a
 * reconciliation difference line.
 */
export default function GLReconcileRow({ label, value, accountNames, gl, isSub, colorClass, onDrilldown }) {
  const [open, setOpen] = useState(false);
  const difference = (gl?.balance || 0) - (value || 0);
  const reconciled = Math.abs(difference) < 1;
  const hasGL = !!gl?.matched;

  return (
    <>
      <div
        className={`flex justify-between items-center py-2 ${isSub ? "pl-6" : ""} border-b border-border/30 cursor-pointer hover:bg-muted/30`}
        onClick={() => setOpen(o => !o)}
      >
        <span className={`flex items-center gap-1 text-sm ${isSub ? "text-muted-foreground" : "text-foreground"}`}>
          {open ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />}
          {label}
          {hasGL && !reconciled && (
            <span className="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-chart-3/15 text-chart-3">GL Δ</span>
          )}
        </span>
        <span className={`text-sm font-medium ${colorClass || ""}`}>{fmt(value)}</span>
      </div>

      {open && (
        <div className="bg-muted/20 border-b border-border/30 px-4 py-3 space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Entity balance</span>
            <span className="font-medium">{fmt(value)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">
              General Ledger posted{" "}
              <span className="font-mono text-[10px]">
                ({Array.isArray(accountNames) ? accountNames.join(", ") : accountNames})
              </span>
            </span>
            <span className="font-medium">{hasGL ? fmtSigned(gl.balance) : "—"}</span>
          </div>
          <div className="flex justify-between text-xs pt-2 border-t border-border/40">
            <span className="font-semibold">Difference (GL − Entity)</span>
            <span className={`font-semibold ${reconciled ? "text-primary" : "text-chart-3"}`}>
              {hasGL ? fmtSigned(difference) : "No matching Chart of Account postings"}
            </span>
          </div>

          {hasGL && gl.transactions.length > 0 && (
            <>
              <table className="w-full text-xs mt-2">
                <tbody>
                  {gl.transactions.slice(0, 6).map((t, i) => (
                    <tr key={i} className="border-b border-border/20">
                      <td className="pr-3 py-1.5 text-muted-foreground whitespace-nowrap">
                        {t.date ? format(parseISO(t.date), "MMM d, yyyy") : "—"}
                      </td>
                      <td className="px-3 py-1.5 text-foreground">{t.description || "—"}</td>
                      <td className="px-3 py-1.5 text-right font-medium">{fmt(t.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                onClick={(e) => { e.stopPropagation(); onDrilldown(label, gl.transactions); }}
                className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
              >
                <ScanSearch className="w-3.5 h-3.5" />
                View all {gl.transactions.length} ledger postings
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}