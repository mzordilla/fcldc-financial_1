import { useState } from "react";
import { format, subMonths } from "date-fns";
import { Presentation, Printer, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useBoardReportData from "@/hooks/useBoardReportData";
import BoardDeck from "@/components/board/BoardDeck";
import PresentMode from "@/components/board/PresentMode";

const MONTHS = Array.from({ length: 24 }, (_, i) => subMonths(new Date(), i)).map((d) => ({ key: format(d, "yyyy-MM"), label: format(d, "MMMM yyyy") }));

export default function BoardReport() {
  const [monthKey, setMonthKey] = useState(MONTHS[1].key);
  const [presenting, setPresenting] = useState(false);
  const { report, isLoading } = useBoardReportData(monthKey);

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      <div className="board-toolbar flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Board of Directors Report</h1>
          <p className="text-sm text-muted-foreground">Monthly presentation built from live financial data.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={monthKey} onValueChange={setMonthKey}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTHS.map((m) => <SelectItem key={m.key} value={m.key}>{m.label}</SelectItem>)}</SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" disabled={!report} onClick={() => window.print()}><Printer className="w-4 h-4" /> Print / PDF</Button>
          <Button className="gap-2" disabled={!report} onClick={() => setPresenting(true)}><Presentation className="w-4 h-4" /> Present</Button>
        </div>
      </div>
      {isLoading || !report ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin" /> Preparing the board report...</div>
      ) : (
        <BoardDeck report={report} />
      )}
      {presenting && report && <PresentMode report={report} onClose={() => setPresenting(false)} />}
    </div>
  );
}