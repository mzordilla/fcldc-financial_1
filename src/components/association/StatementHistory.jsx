import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { peso, formatLongDate } from "@/lib/associationStatement";

export default function StatementHistory({ statements, loading, onOpen, onDelete }) {
  if (loading) return <p className="py-16 text-center text-muted-foreground">Loading statements...</p>;
  if (!statements.length) return <p className="py-16 text-center text-muted-foreground bg-card border border-border rounded-xl">No financial statements yet. Create the first one with New Statement.</p>;

  return (
    <div className="bg-card border border-border rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-3">Reporting Period</th><th className="text-left px-4 py-3">Condominium</th>
            <th className="text-right px-4 py-3">Total Income</th><th className="text-right px-4 py-3">Operating Expenses</th>
            <th className="text-right px-4 py-3">Net Surplus / (Deficit)</th><th className="text-left px-4 py-3">Prepared</th><th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {statements.map((s) => (
            <tr key={s.id} className="border-t border-border hover:bg-muted/20 cursor-pointer" onClick={() => onOpen(s)}>
              <td className="px-4 py-3 whitespace-nowrap"><span className="font-semibold">{s.period_label}</span> <Badge variant="outline" className="ml-2 capitalize">{s.period_type}</Badge></td>
              <td className="px-4 py-3">{s.condominium_name}</td>
              <td className="px-4 py-3 text-right font-mono">{peso(s.total_income)}</td>
              <td className="px-4 py-3 text-right font-mono">{peso(s.total_expenses)}</td>
              <td className={`px-4 py-3 text-right font-mono font-bold ${s.net_surplus < 0 ? "text-destructive" : "text-primary"}`}>{peso(s.net_surplus)}</td>
              <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatLongDate(s.preparation_date)}<p>{s.prepared_by}</p></td>
              <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" onClick={() => onOpen(s)}><Pencil /> Open</Button>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDelete(s)}><Trash2 /> Delete</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}