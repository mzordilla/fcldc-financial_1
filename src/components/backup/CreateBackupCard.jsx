import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { DatabaseBackup, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { createBackup } from "@/lib/backup/createBackup";
import { formatBytes } from "@/lib/backup/backupData";
import ResultMessage from "./ResultMessage";

export default function CreateBackupCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      const b = await createBackup({ type: "manual", user, onProgress: setProgress });
      setResult({
        type: b.warnings.length ? "warning" : "success",
        title: b.warnings.length ? "Backup created with warnings" : "Backup created successfully",
        lines: [`${b.file_name} · ${formatBytes(b.size_bytes)} · ${b.record_count.toLocaleString()} records in ${b.table_count} tables · ${b.file_count} uploaded files`, ...b.warnings],
      });
    } catch (e) {
      setResult({ type: "error", title: "Backup failed", lines: [e.message] });
    }
    setBusy(false);
    setProgress("");
    queryClient.invalidateQueries({ queryKey: ["backup-records"] });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <DatabaseBackup className="w-6 h-6 text-primary shrink-0" />
        <div>
          <h3 className="font-semibold">Create New Backup</h3>
          <p className="text-sm text-muted-foreground">Exports every table and record (JSON + CSV) and all available uploaded files into one ZIP. A copy downloads to your computer and another is kept in secure private storage, separate from the live database. No records are changed or deleted.</p>
        </div>
      </div>
      <Button onClick={run} disabled={busy} className="gap-2">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <DatabaseBackup className="w-4 h-4" />}
        {busy ? progress || "Starting..." : "Create New Backup"}
      </Button>
      {busy && <p className="text-xs text-muted-foreground">Keep this page open until the backup finishes. Large databases may take several minutes.</p>}
      <ResultMessage result={result} />
    </div>
  );
}