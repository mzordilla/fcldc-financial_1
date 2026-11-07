import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

const STYLES = {
  success: { icon: CheckCircle2, cls: "border-primary/30 bg-primary/10 text-foreground", iconCls: "text-primary" },
  warning: { icon: AlertTriangle, cls: "border-chart-3/40 bg-chart-3/10 text-foreground", iconCls: "text-chart-3" },
  error: { icon: XCircle, cls: "border-destructive/30 bg-destructive/10 text-foreground", iconCls: "text-destructive" },
};

export default function ResultMessage({ result }) {
  if (!result) return null;
  const s = STYLES[result.type];
  const Icon = s.icon;
  return (
    <div className={`flex gap-3 rounded-lg border p-3 text-sm ${s.cls}`}>
      <Icon className={`w-5 h-5 shrink-0 ${s.iconCls}`} />
      <div className="space-y-1">
        <p className="font-semibold">{result.title}</p>
        {result.lines?.map((l, i) => <p key={i} className="text-muted-foreground">{l}</p>)}
      </div>
    </div>
  );
}