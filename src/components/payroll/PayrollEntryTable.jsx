import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Check, X, Trash2, History } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ApprovalHistoryLog from "@/components/approvals/ApprovalHistoryLog";

const statusColors = {
  pending: "bg-chart-3/10 text-chart-3",
  approved: "bg-chart-2/10 text-chart-2",
  rejected: "bg-destructive/10 text-destructive",
  processed: "bg-primary/10 text-primary",
};

const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function PayrollEntryTable({ entries, onApprove, onReject, onDelete }) {
  const [historyEntry, setHistoryEntry] = useState(null);

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Employee</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Project</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Gross</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Deductions</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Net Pay</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
              <th className="w-32"></th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-sm text-muted-foreground">No payroll entries yet.</td></tr>
            )}
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-foreground">{entry.employee_name}</p>
                  {entry.department && <p className="text-xs text-muted-foreground">{entry.department}</p>}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">
                  {entry.project_name || entry.project_code || "—"}
                  {entry.chart_of_account && <span className="block text-xs text-muted-foreground/70">{entry.chart_of_account}</span>}
                </td>
                <td className="px-4 py-3 text-sm text-foreground">{fmt(entry.gross_pay)}</td>
                <td className="px-4 py-3 text-sm text-destructive">{fmt(entry.total_deductions)}</td>
                <td className="px-4 py-3 text-sm font-semibold text-primary">{fmt(entry.net_pay)}</td>
                <td className="px-4 py-3"><Badge variant="outline" className={`text-xs capitalize ${statusColors[entry.approval_status] || ""}`}>{entry.approval_status}</Badge></td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {entry.approval_status === "pending" && (
                      <>
                        <button onClick={() => onApprove(entry)} className="text-muted-foreground hover:text-primary transition-colors" title="Approve"><Check className="w-4 h-4" /></button>
                        <button onClick={() => onReject(entry)} className="text-muted-foreground hover:text-destructive transition-colors" title="Reject"><X className="w-4 h-4" /></button>
                        <button onClick={() => onDelete(entry)} className="text-muted-foreground hover:text-destructive transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                      </>
                    )}
                    {entry.approval_history?.length > 0 && (
                      <button onClick={() => setHistoryEntry(entry)} className="text-muted-foreground hover:text-foreground transition-colors" title="History"><History className="w-4 h-4" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={!!historyEntry} onOpenChange={(v) => !v && setHistoryEntry(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Approval History — {historyEntry?.employee_name}</DialogTitle></DialogHeader>
          <ApprovalHistoryLog history={historyEntry?.approval_history || []} />
        </DialogContent>
      </Dialog>
    </div>
  );
}