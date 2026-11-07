import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { History, ShieldCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import AdminOnly from "@/components/backup/AdminOnly";
import BackupReminderBanner from "@/components/backup/BackupReminderBanner";
import CreateBackupCard from "@/components/backup/CreateBackupCard";
import RestoreBackupCard from "@/components/backup/RestoreBackupCard";

export default function SystemBackup() {
  const { data: lastBackup, isLoading } = useQuery({
    queryKey: ["backup-records", "last"],
    queryFn: async () => {
      const page = await base44.entities.BackupRecord.filter({ status: { $in: ["completed", "completed_with_warnings"] } }, { sort: "-backup_created_at", limit: 1 });
      return page.items[0] || null;
    },
  });

  return (
    <AdminOnly>
      <div className="p-6 lg:p-8 space-y-6 max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-7 h-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">System Backup & Recovery</h1>
              <p className="text-sm text-muted-foreground">Create full backups and restore the database. Administrators only.</p>
            </div>
          </div>
          <Button asChild variant="outline" className="gap-2"><Link to="/system-backup/history"><History className="w-4 h-4" /> Backup History</Link></Button>
        </div>
        <BackupReminderBanner lastBackup={lastBackup} isLoading={isLoading} />
        <div className="grid lg:grid-cols-2 gap-6">
          <CreateBackupCard />
          <RestoreBackupCard />
        </div>
      </div>
    </AdminOnly>
  );
}