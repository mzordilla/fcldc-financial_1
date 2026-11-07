import { useState } from "react";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { RotateCcw, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { createBackup } from "@/lib/backup/createBackup";
import { inspectBackup, restoreBackup } from "@/lib/backup/restoreBackup";
import RestoreConfirmDialog from "./RestoreConfirmDialog";
import ResultMessage from "./ResultMessage";

export default function RestoreBackupCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [loaded, setLoaded] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState(null);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setResult(null);
    try { setLoaded(await inspectBackup(file)); }
    catch (err) { setLoaded(null); setResult({ type: "error", title: "Could not read backup file", lines: [err.message] }); }
  };

  const run = async () => {
    setConfirmOpen(false);
    setBusy(true);
    setResult(null);
    let safety;
    try {
      safety = await createBackup({ type: "safety", user, onProgress: (p) => setProgress(`Safety backup: ${p}`), downloadLocal: false });
    } catch (err) {
      setResult({ type: "error", title: "Restore cancelled — safety backup failed", lines: [err.message, "Your database was not changed."] });
      setBusy(false); setProgress("");
      return;
    }
    try {
      const summary = await restoreBackup({ ...loaded, onProgress: setProgress });
      const total = summary.reduce((s, t) => s + t.restored, 0);
      setResult({ type: "success", title: "Database restored successfully", lines: [`${total.toLocaleString()} records restored across ${summary.length} tables.`, `Safety backup saved as ${safety.file_name}.`] });
      setLoaded(null);
    } catch (err) {
      setResult({ type: "error", title: "Restore failed partway", lines: [err.message, `Restore again from the safety backup "${safety.file_name}" in Backup History to return to the pre-restore state.`] });
    }
    setBusy(false); setProgress("");
    queryClient.invalidateQueries();
  };

  const m = loaded?.manifest;
  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <RotateCcw className="w-6 h-6 text-destructive shrink-0" />
        <div>
          <h3 className="font-semibold">Restore Backup</h3>
          <p className="text-sm text-muted-foreground">Upload a backup ZIP created by this module to restore the database to that point in time.</p>
        </div>
      </div>
      <label className={`inline-flex items-center gap-2 h-9 px-4 rounded-md border border-input text-sm font-medium cursor-pointer hover:bg-accent ${busy ? "pointer-events-none opacity-50" : ""}`}>
        <Upload className="w-4 h-4" /> Choose backup file
        <input type="file" accept=".zip" className="hidden" onChange={pick} />
      </label>
      {m && !busy && (
        <div className="rounded-lg border border-border p-3 text-sm space-y-2">
          <p><span className="text-muted-foreground">Backup date:</span> <span className="font-semibold">{format(new Date(m.backup_created_at), "MMM d, yyyy h:mm a")}</span></p>
          <p><span className="text-muted-foreground">Contents:</span> {m.record_count.toLocaleString()} records · {Object.keys(m.tables).length} tables · {m.files.length} files</p>
          <Button variant="destructive" onClick={() => setConfirmOpen(true)} className="gap-2"><RotateCcw className="w-4 h-4" /> Restore this backup</Button>
        </div>
      )}
      {busy && <p className="flex items-center gap-2 text-sm"><Loader2 className="w-4 h-4 animate-spin" /> {progress || "Starting..."} — keep this page open.</p>}
      <ResultMessage result={result} />
      <RestoreConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} manifest={m} onConfirm={run} />
    </div>
  );
}