import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Banknote, Paperclip, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function MarkPaidDialog({ pr, open, onOpenChange, onConfirm }) {
  const [checkNumber, setCheckNumber] = useState("");
  const [checkDate, setCheckDate] = useState("");
  const [checkFile, setCheckFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    let checkAttachment = pr?.check_attachment || "";

    if (checkFile) {
      setUploading(true);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: checkFile });
      checkAttachment = file_url;
      setUploading(false);
    }

    await onConfirm({
      approval_status: "paid",
      check_number: checkNumber,
      check_date: checkDate,
      check_attachment: checkAttachment,
    });

    setSaving(false);
    setCheckNumber("");
    setCheckDate("");
    setCheckFile(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Banknote className="w-5 h-5 text-chart-2" /> Mark as Paid
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/50 rounded-xl p-4 space-y-1">
            <p className="font-semibold">{pr?.payee}</p>
            <p className="text-sm text-muted-foreground">{pr?.description}</p>
            <p className="text-xl font-bold text-foreground mt-1">₱{(pr?.amount || 0).toLocaleString()}</p>
          </div>

          <div className="space-y-1.5">
            <Label>Check / Voucher Number</Label>
            <Input
              placeholder="e.g. CHK-0012345"
              value={checkNumber}
              onChange={e => setCheckNumber(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Check Date</Label>
            <Input
              type="date"
              value={checkDate}
              onChange={e => setCheckDate(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Check Attachment (optional)</Label>
            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center gap-2 px-3 py-2 border border-input rounded-lg text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 transition-colors">
                <Paperclip className="w-4 h-4" />
                {checkFile ? checkFile.name : "Upload check image or PDF"}
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => setCheckFile(e.target.files[0])} />
              </label>
              {checkFile && (
                <Button variant="ghost" size="sm" onClick={() => setCheckFile(null)} className="text-muted-foreground">
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={saving || uploading} className="bg-chart-2 hover:bg-chart-2/90 text-white">
            {(saving || uploading) ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Banknote className="w-4 h-4 mr-1" />}
            {uploading ? "Uploading..." : saving ? "Saving..." : "Confirm Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}