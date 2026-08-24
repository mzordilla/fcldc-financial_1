import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Label } from "@/components/ui/label";
import { Paperclip, Trash2, Loader2 } from "lucide-react";

export default function POAttachmentsField({ attachments = [], onChange }) {
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploading(true);
    const uploaded = [];
    for (const file of files) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      uploaded.push({ name: file.name, url: file_url });
    }
    onChange([...attachments, ...uploaded]);
    setUploading(false);
    event.target.value = "";
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-slate-700">Supporting Documents (PDF, images, others)</Label>
      <div className="rounded-sm border border-slate-300 p-3">
        {attachments.length > 0 && (
          <ul className="mb-2 space-y-1">
            {attachments.map((doc, index) => (
              <li key={index} className="flex items-center justify-between gap-2 text-xs">
                <a href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 truncate text-primary underline underline-offset-2">
                  <Paperclip className="h-3.5 w-3.5 shrink-0" /> {doc.name || "Attachment"}
                </a>
                <button type="button" onClick={() => onChange(attachments.filter((_, i) => i !== index))} className="text-destructive hover:text-destructive/80">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <input type="file" multiple onChange={handleFiles} disabled={uploading} className="block w-full text-xs" />
        {uploading && <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...</p>}
      </div>
    </div>
  );
}