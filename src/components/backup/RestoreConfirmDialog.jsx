import { useState } from "react";
import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RestoreConfirmDialog({ open, onOpenChange, manifest, onConfirm }) {
  const [text, setText] = useState("");
  if (!manifest) return null;
  return (
    <Dialog open={open} onOpenChange={(v) => { setText(""); onOpenChange(v); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive"><AlertTriangle className="w-5 h-5" /> Restore database?</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <p>All tables will be returned to how they were on <span className="font-semibold">{format(new Date(manifest.backup_created_at), "MMM d, yyyy h:mm a")}</span>. Records created after that time will be removed and edited records will be reverted.</p>
          <p className="text-muted-foreground">A safety backup of the current database is created automatically first, so this can be undone. User accounts and backup history are not changed.</p>
          <p>Type <span className="font-mono font-bold">RESTORE</span> to confirm.</p>
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="RESTORE" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="destructive" disabled={text !== "RESTORE"} onClick={() => { setText(""); onConfirm(); }}>Restore Backup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}