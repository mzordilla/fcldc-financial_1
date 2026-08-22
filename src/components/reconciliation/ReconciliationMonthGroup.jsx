import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export default function ReconciliationMonthGroup({ month, records, children }) {
  const [open, setOpen] = useState(false);
  const reconciled = records.filter((record) => record.status === "reconciled").length;
  const discrepancies = records.filter((record) => record.status === "discrepancy").length;

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-4 bg-muted/40 px-5 py-4 text-left hover:bg-muted/60">
        <div className="flex items-center gap-3">
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          <div><h2 className="font-semibold text-foreground">{month}</h2><p className="text-xs text-muted-foreground">{records.length} reconciliation{records.length !== 1 ? "s" : ""}</p></div>
        </div>
        <div className="flex gap-3 text-xs"><span className="text-primary">{reconciled} reconciled</span>{discrepancies > 0 && <span className="text-destructive">{discrepancies} discrepanc{discrepancies === 1 ? "y" : "ies"}</span>}</div>
      </button>
      {open && <div className="grid grid-cols-1 gap-4 border-t border-border p-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>}
    </section>
  );
}