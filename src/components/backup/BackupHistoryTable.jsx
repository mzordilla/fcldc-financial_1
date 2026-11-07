import { useState } from "react";
import { format } from "date-fns";
import { Download, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/backup/backupData";
import BackupStatusBadge from "./BackupStatusBadge";

export default function BackupHistoryTable({ records, onError }) {
  const [downloading, setDownloading] = useState(null);

  const download = async (r) => {
    setDownloading(r.id);
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: r.file_uri, expires_in: 300 });
      window.open(signed_url, "_blank");
    } catch (e) { onError(`Could not download ${r.file_name}: ${e.message}`); }
    setDownloading(null);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="text-left px-4 py-3">Backup Date</th><th className="text-left px-4 py-3">File Name</th>
            <th className="text-left px-4 py-3">Type</th><th className="text-right px-4 py-3">Size</th>
            <th className="text-right px-4 py-3">Records</th><th className="text-left px-4 py-3">Status</th><th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {records.map((r) => (
            <tr key={r.id} className="border-t border-border align-top">
              <td className="px-4 py-3 whitespace-nowrap">{r.backup_created_at ? format(new Date(r.backup_created_at), "MMM d, yyyy h:mm a") : "—"}<p className="text-xs text-muted-foreground">{r.created_by_name}</p></td>
              <td className="px-4 py-3 font-mono text-xs break-all">{r.file_name}{r.error_message && <p className="text-destructive font-sans mt-1">{r.error_message}</p>}{r.warnings?.map((w, i) => <p key={i} className="text-muted-foreground font-sans mt-1">{w}</p>)}</td>
              <td className="px-4 py-3 capitalize">{r.backup_type}</td>
              <td className="px-4 py-3 text-right whitespace-nowrap">{r.size_bytes ? formatBytes(r.size_bytes) : "—"}</td>
              <td className="px-4 py-3 text-right">{(r.record_count || 0).toLocaleString()}</td>
              <td className="px-4 py-3"><BackupStatusBadge status={r.status} /></td>
              <td className="px-4 py-3 text-right">
                {r.file_uri && (
                  <Button size="sm" variant="outline" onClick={() => download(r)} disabled={downloading === r.id} className="gap-1">
                    {downloading === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />} Download
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}