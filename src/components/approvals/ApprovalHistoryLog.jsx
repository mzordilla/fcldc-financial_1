import { format } from "date-fns";
import { CheckCircle, XCircle, Clock, Send, Banknote, Eye } from "lucide-react";

const actionConfig = {
  submitted: { icon: Send, color: "text-chart-2", bg: "bg-chart-2/10", label: "Submitted" },
  reviewed: { icon: Eye, color: "text-chart-3", bg: "bg-chart-3/10", label: "Reviewed" },
  approved: { icon: CheckCircle, color: "text-primary", bg: "bg-primary/10", label: "Approved" },
  rejected: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Rejected" },
  paid: { icon: Banknote, color: "text-chart-2", bg: "bg-chart-2/10", label: "Paid" },
  default: { icon: Clock, color: "text-muted-foreground", bg: "bg-muted", label: "Updated" },
};

export default function ApprovalHistoryLog({ history = [] }) {
  if (!history || history.length === 0) {
    return (
      <div className="text-xs text-muted-foreground italic px-1">No approval history yet.</div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((entry, idx) => {
        const cfg = actionConfig[entry.action] || actionConfig.default;
        const Icon = cfg.icon;
        const isLast = idx === history.length - 1;
        return (
          <div key={idx} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
              </div>
              {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
            </div>
            <div className="pb-3 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                {entry.step && entry.step !== entry.action && (
                  <span className="text-xs text-muted-foreground">· Step: {entry.step}</span>
                )}
              </div>
              {entry.actor && (
                <p className="text-xs text-foreground mt-0.5">by <span className="font-medium">{entry.actor}</span></p>
              )}
              {entry.notes && (
                <p className="text-xs text-muted-foreground mt-1 italic border-l-2 border-border pl-2">{entry.notes}</p>
              )}
              {entry.timestamp && (
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  {format(new Date(entry.timestamp), "MMM d, yyyy h:mm a")}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}