import { differenceInDays, format } from "date-fns";
import { BellRing, ShieldCheck } from "lucide-react";

export default function BackupReminderBanner({ lastBackup, isLoading }) {
  if (isLoading) return null;
  const days = lastBackup ? differenceInDays(new Date(), new Date(lastBackup.backup_created_at)) : null;
  const due = days === null || days >= 30;
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-4 ${due ? "border-chart-3/40 bg-chart-3/10" : "border-primary/30 bg-primary/5"}`}>
      {due ? <BellRing className="w-5 h-5 text-chart-3 shrink-0" /> : <ShieldCheck className="w-5 h-5 text-primary shrink-0" />}
      <div className="text-sm">
        <p className="font-semibold">
          {days === null ? "No backup has been created yet" : due ? `Monthly backup is due — last backup was ${days} days ago` : `Last backup was ${days} day${days === 1 ? "" : "s"} ago`}
        </p>
        <p className="text-muted-foreground">
          {lastBackup ? `Last successful backup: ${format(new Date(lastBackup.backup_created_at), "MMM d, yyyy h:mm a")}. ` : ""}
          Admins also receive an email reminder on the 1st of every month.
        </p>
      </div>
    </div>
  );
}