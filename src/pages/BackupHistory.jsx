import { useState } from "react";
import { Link } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArrowLeft, History, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import AdminOnly from "@/components/backup/AdminOnly";
import BackupHistoryTable from "@/components/backup/BackupHistoryTable";
import ResultMessage from "@/components/backup/ResultMessage";

export default function BackupHistory() {
  const [error, setError] = useState(null);
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["backup-records", "history"],
    queryFn: ({ pageParam }) => base44.entities.BackupRecord.list({ sort: "-backup_created_at", limit: 50, cursor: pageParam }),
    getNextPageParam: (last) => (last.has_more ? last.next_cursor : undefined),
  });
  const records = data?.pages.flatMap((p) => p.items) || [];

  return (
    <AdminOnly>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <History className="w-7 h-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Backup History</h1>
              <p className="text-sm text-muted-foreground">All backups with their date, file name, size and status.</p>
            </div>
          </div>
          <Button asChild variant="outline" className="gap-2"><Link to="/system-backup"><ArrowLeft className="w-4 h-4" /> Backup & Recovery</Link></Button>
        </div>
        <ResultMessage result={error && { type: "error", title: "Download failed", lines: [error] }} />
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : records.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">No backups yet. Create your first backup from System Backup & Recovery.</div>
        ) : (
          <>
            <BackupHistoryTable records={records} onError={setError} />
            {hasNextPage && (
              <div className="flex justify-center">
                <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>{isFetchingNextPage ? "Loading..." : "Load more"}</Button>
              </div>
            )}
          </>
        )}
      </div>
    </AdminOnly>
  );
}