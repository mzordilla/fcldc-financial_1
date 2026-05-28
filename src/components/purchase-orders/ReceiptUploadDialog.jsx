import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileCheck, PackageCheck, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function ReceiptUploadDialog({ open, onOpenChange, po, onSuccess }) {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [deliveryDate, setDeliveryDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [receivedQtys, setReceivedQtys] = useState({});
  const [uploading, setUploading] = useState(false);

  // Reset state when PO changes
  useEffect(() => {
    if (po) {
      setFile(null);
      setFileName("");
      setDeliveryDate(format(new Date(), "yyyy-MM-dd"));
      setDeliveryNotes("");
      // Default received qty = ordered qty
      const qtys = {};
      (po.line_items || []).forEach((item, idx) => {
        qtys[idx] = item.quantity ?? 0;
      });
      setReceivedQtys(qtys);
    }
  }, [po?.id]);

  if (!po) return null;

  const hasLineItems = po.line_items && po.line_items.length > 0;

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFileName(selectedFile.name);
    }
  };

  const isPartial = hasLineItems && po.line_items.some(
    (item, idx) => Number(receivedQtys[idx] ?? item.quantity) < Number(item.quantity)
  );

  const totalReceived = hasLineItems
    ? po.line_items.reduce((sum, item, idx) => {
        const qty = Number(receivedQtys[idx] ?? item.quantity);
        return sum + qty * (item.cost_per_item || 0);
      }, 0)
    : po.amount || 0;

  const handleSubmit = async () => {
    setUploading(true);

    let receiptUrl = po.receipt_url || "";
    if (file) {
      const uploaded = await base44.integrations.Core.UploadFile({ file });
      receiptUrl = uploaded.file_url;
    }

    await base44.entities.PurchaseOrder.update(po.id, {
      receipt_url: receiptUrl,
      delivery_date: deliveryDate,
      delivery_notes: deliveryNotes,
    });

    // Build line items with actual quantities received
    const lineItems = hasLineItems
      ? po.line_items.map((item, idx) => {
          const qtyReceived = Number(receivedQtys[idx] ?? item.quantity);
          return {
            description: item.description,
            quantity_ordered: item.quantity,
            quantity_received: qtyReceived,
            cost_per_item: item.cost_per_item || 0,
            total: qtyReceived * (item.cost_per_item || 0),
          };
        })
      : [];

    await base44.entities.ReceivingItem.create({
      po_id: po.id,
      po_number: po.po_number || "",
      supplier_name: po.supplier_name,
      project_name: po.project_name || "",
      received_date: deliveryDate,
      line_items: lineItems,
      total_amount: totalReceived,
      receipt_url: receiptUrl,
      notes: deliveryNotes || "",
      status: isPartial ? "partial" : "complete",
    });

    setUploading(false);
    onOpenChange(false);
    onSuccess?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="w-5 h-5 text-primary" />
            Receive Items
          </DialogTitle>
        </DialogHeader>

        {/* PO Summary */}
        <div className="bg-muted/40 rounded-lg px-4 py-3 text-sm space-y-0.5">
          <p className="font-semibold text-foreground">{po.supplier_name}</p>
          {po.po_number && <p className="text-muted-foreground font-mono text-xs">PO: {po.po_number}</p>}
          {po.project_name && <p className="text-xs text-muted-foreground">Project: {po.project_name}</p>}
          <p className="text-primary font-bold">₱{(po.amount || 0).toLocaleString()}</p>
        </div>

        {/* Item Count Table */}
        {hasLineItems && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Items Received</Label>
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="px-3 py-2 text-left font-semibold">Item</th>
                    <th className="px-3 py-2 text-right font-semibold">Ordered</th>
                    <th className="px-3 py-2 text-right font-semibold w-24">Received</th>
                    <th className="px-3 py-2 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {po.line_items.map((item, idx) => {
                    const qty = Number(receivedQtys[idx] ?? item.quantity);
                    const isShort = qty < Number(item.quantity);
                    return (
                      <tr key={idx} className="border-b border-border/50 last:border-0">
                        <td className="px-3 py-2">{item.description}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">
                          <Input
                            type="number"
                            min={0}
                            max={item.quantity}
                            value={receivedQtys[idx] ?? item.quantity}
                            onChange={e => setReceivedQtys(q => ({ ...q, [idx]: e.target.value }))}
                            className={`h-7 w-20 text-right text-xs ml-auto ${isShort ? "border-chart-3 text-chart-3" : ""}`}
                          />
                        </td>
                        <td className="px-3 py-2 text-right font-semibold">
                          ₱{(qty * (item.cost_per_item || 0)).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 border-t border-border">
                    <td colSpan={3} className="px-3 py-2 text-right font-semibold text-xs">Total Received Value:</td>
                    <td className="px-3 py-2 text-right font-bold text-sm">₱{totalReceived.toLocaleString()}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {isPartial && (
              <div className="flex items-center gap-2 text-xs text-chart-3 bg-chart-3/10 border border-chart-3/20 rounded-lg px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                Partial delivery — some items are under the ordered quantity
              </div>
            )}
          </div>
        )}

        {/* Receipt Upload */}
        <div className="space-y-1.5">
          <Label>Receipt / Delivery Document</Label>
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
                {fileName || "Click to upload receipt"}
              </span>
              <span className="text-xs text-muted-foreground">PDF, images, or documents</span>
            </label>
          </div>
          {po.receipt_url && !file && (
            <div className="flex items-center gap-2 text-xs text-primary">
              <FileCheck className="w-4 h-4" />
              Receipt already uploaded —{" "}
              <a href={po.receipt_url} target="_blank" rel="noopener noreferrer" className="underline">
                view existing
              </a>
            </div>
          )}
        </div>

        {/* Delivery Date */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Delivery Date</Label>
            <Input
              type="date"
              value={deliveryDate}
              onChange={e => setDeliveryDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              value={deliveryNotes}
              onChange={e => setDeliveryNotes(e.target.value)}
              placeholder="Condition, remarks…"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={uploading || (!file && !po.receipt_url)}
            className="gap-2"
          >
            <PackageCheck className="w-4 h-4" />
            {uploading ? "Saving..." : isPartial ? "Confirm Partial Delivery" : "Confirm Full Delivery"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}