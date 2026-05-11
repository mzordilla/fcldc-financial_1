import { useState } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileCheck } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ReceiptUploadDialog({ open, onOpenChange, po, onSuccess }) {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [form, setForm] = useState({
    delivery_date: format(new Date(), "yyyy-MM-dd"),
    delivery_notes: "",
  });
  const [uploading, setSending] = useState(false);

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const handleSubmit = async () => {
    setSending(true);
    let receiptUrl = po.receipt_url;
    if (file) {
      const uploaded = await base44.integrations.Core.UploadFile({ file });
      receiptUrl = uploaded.file_url;
    }
    await base44.entities.PurchaseOrder.update(po.id, {
      receipt_url: receiptUrl,
      delivery_date: form.delivery_date,
      delivery_notes: form.delivery_notes,
    });
    setSending(false);
    onOpenChange(false);
    onSuccess?.();
  };

  if (!po) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Receipt/Delivery</DialogTitle>
        </DialogHeader>

        <div className="space-y-1 bg-muted/40 rounded-lg px-4 py-3 text-sm">
          <p className="font-semibold text-foreground">{po.supplier_name}</p>
          {po.po_number && <p className="text-muted-foreground">PO: {po.po_number}</p>}
          <p className="text-primary font-bold">₱{(po.amount || 0).toLocaleString()}</p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Receipt/Delivery Document</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:bg-muted/50 transition-colors">
              <input
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                id="receipt-file"
                accept="image/*,.pdf,.doc,.docx"
              />
              <label htmlFor="receipt-file" className="cursor-pointer flex flex-col items-center gap-2">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">
                  {fileName || "Click to upload or drag and drop"}
                </span>
                <span className="text-xs text-muted-foreground">PDF, images, or documents</span>
              </label>
            </div>
            {po.receipt_url && !file && (
              <div className="flex items-center gap-2 text-xs text-primary">
                <FileCheck className="w-4 h-4" />
                Receipt already uploaded
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Delivery Date</Label>
            <Input
              type="date"
              value={form.delivery_date}
              onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Delivery Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              value={form.delivery_notes}
              onChange={e => setForm(f => ({ ...f, delivery_notes: e.target.value }))}
              placeholder="e.g. All items received in good condition"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={uploading || !file}>
            {uploading ? "Uploading..." : "Confirm Delivery"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}