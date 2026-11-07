import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Download, Loader2, FolderArchive } from "lucide-react";

const safe = (s) => (s || "").replace(/[\\/:*?"<>|]/g, "_").trim();

async function downloadFile(doc) {
  const res = await fetch(doc.file_url);
  const blob = await res.blob();
  const ext = (doc.file_name || doc.file_url).split(".").pop().split("?")[0];
  const base = safe(doc.file_name?.replace(/\.[^.]+$/, "") || doc.name);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${safe(doc.category || "other").toUpperCase()} - ${base}.${ext}`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function CorporateDocumentsBackup() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");

  const handleBackup = async () => {
    setBusy(true);
    const docs = [];
    let cursor;
    do {
      const page = await base44.entities.CorporateDocument.list({ sort: "category", limit: 500, cursor });
      docs.push(...page.items);
      cursor = page.has_more ? page.next_cursor : null;
    } while (cursor);
    const withFiles = docs.filter((d) => d.file_url);
    let failed = 0;
    for (let i = 0; i < withFiles.length; i++) {
      setProgress(`${i + 1} of ${withFiles.length}`);
      await downloadFile(withFiles[i]).catch(() => { failed++; });
      await new Promise((r) => setTimeout(r, 400));
    }
    setBusy(false);
    setProgress("");
    if (!withFiles.length) toast.info("No corporate document files to back up.");
    else toast.success(`Downloaded ${withFiles.length - failed} of ${withFiles.length} corporate documents.`);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <FolderArchive className="w-6 h-6 text-primary" />
        <div>
          <h3 className="font-semibold">Corporate Documents Backup (Files)</h3>
          <p className="text-sm text-muted-foreground">Downloads the actual files of every corporate document (permits, licenses, contracts, etc.), named by category. If your browser asks, allow multiple downloads.</p>
        </div>
      </div>
      <Button onClick={handleBackup} disabled={busy} className="gap-2">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {busy ? `Downloading ${progress}...` : "Download All Corporate Documents"}
      </Button>
    </div>
  );
}