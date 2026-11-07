const MAP = {
  completed: ["Completed", "bg-primary/15 text-primary"],
  completed_with_warnings: ["Completed with warnings", "bg-chart-3/20 text-foreground"],
  failed: ["Failed", "bg-destructive/15 text-destructive"],
  in_progress: ["In progress", "bg-chart-2/15 text-chart-2"],
};

export default function BackupStatusBadge({ status }) {
  const [label, cls] = MAP[status] || [status, "bg-muted text-muted-foreground"];
  return <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-semibold ${cls}`}>{label}</span>;
}