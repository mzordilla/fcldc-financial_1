import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Package, AlertCircle, CheckCircle, History } from "lucide-react";

export default function ReceiveItemsDialog({ open, onOpenChange, po }) {
  const queryClient = useQueryClient();
  const [receivedDate, setReceivedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [receivedBy, setReceivedBy] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [notes, setNotes] = useState("");

  // Fetch existing receiving history for this PO
  const { data: existingReceipts = [] } = useQuery({
    queryKey: ["receiving_items_for_po", po?.id],
    queryFn: () => base44.entities.ReceivingItem.filter({ po_id: po.id }, "-received_date", 100),
    enabled: !!po?.id && open,
  });

  // Compute total already-received qty per line item description
  const alreadyReceivedMap = {};
  for (const receipt of existingReceipts) {
    for (const li of receipt.line_items || []) {
      alreadyReceivedMap[li.description] = (alreadyReceivedMap[li.description] || 0) + (li.quantity_received || 0);
    }
  }

  // Build line items with remaining quantities as default
  const buildLineItems = () =>
    (po?.line_items || []).map(li => {
      const alreadyReceived = alreadyReceivedMap[li.description] || 0;
      const remaining = Math.max(0, li.quantity - alreadyReceived);
      return {
        ...li,
        already_received: alreadyReceived,
        quantity_received: remaining,
        remaining_before: remaining,
      };
    });

  const [lineItems, setLineItems] = useState([]);

  // Reset line items when dialog opens or existing receipts load
  const [initialized, setInitialized] = useState(false);
  if (open && po && !initialized && existingReceipts !== undefined) {
    setLineItems(buildLineItems());
    setInitialized(true);
  }
  if (!open && initialized) {
    setInitialized(false);
    setLineItems([]);
    setReceivedDate(format(new Date(), "yyyy-MM-dd"));
    setReceivedBy("");
    setReceiptUrl("");
    setNotes("");
  }

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ReceivingItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receiving_items"] });
      queryClient.invalidateQueries({ queryKey: ["receiving_items_for_po", po?.id] });
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
      onOpenChange(false);
    },
  });

  const handleQuantityChange = (index, value) => {
    const updated = [...lineItems];
    const max = updated[index].remaining_before;
    updated[index].quantity_received = Math.min(Math.max(0, Number(value)), max);
    setLineItems(updated);
  };

  const totalOrdered = (po?.line_items || []).reduce((s, li) => s + (li.quantity || 0), 0);
  const totalAlreadyReceived = Object.values(alreadyReceivedMap).reduce((s, v) => s + v, 0);
  const isFullyReceived = lineItems.every(li => li.remaining_before === 0);
  const isPartialThisReceipt = lineItems.some(li => li.quantity_received < li.remaining_before);
  const hasItemsToReceive = lineItems.some(li => li.quantity_received > 0);

  const handleSubmit = () => {
    const itemsToRecord = lineItems.filter(li => li.quantity_received > 0);
    const totalAmount = itemsToRecord.reduce(
      (sum, li) => sum + ((li.cost_per_item || 0) * li.quantity_received),
      0
    );

    // Determine if after this receipt the PO will be fully received
    const totalAfterThis = lineItems.reduce((s, li) => s + li.already_received + li.quantity_received, 0);
    const willBeComplete = totalAfterThis >= totalOrdered;

    createMutation.mutate({
      po_id: po.id,
      po_number: po.po_number,
      supplier_name: po.supplier_name,
      project_name: po.project_name,
      received_date: receivedDate,
      received_by: receivedBy,
      line_items: itemsToRecord.map(li => ({
        description: li.description,
        quantity_ordered: li.quantity,
        quantity_received: li.quantity_received,
        cost_per_item: li.cost_per_item || 0,
        total: (li.cost_per_item || 0) * li.quantity_received,
      })),
      total_amount: totalAmount,
      receipt_url: receiptUrl,
      notes: notes || (isPartialThisReceipt ? "Partial delivery received" : "Complete delivery received"),
      status: willBeComplete ? "complete" : "partial",
    });
  };

  if (!po) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Receive Items — PO {po.po_number}
          </DialogTitle>
          <DialogDescription>
            All receipts are linked to the original PO. Quantities shown are the <strong>remaining</strong> balance yet to be received.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Previous receipts summary */}
          {existingReceipts.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <History className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">
                  {existingReceipts.length} previous receipt transaction{existingReceipts.length !== 1 ? "s" : ""} on this PO
                </span>
              </div>
              <div className="space-y-1">
                {existingReceipts.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {r.received_date ? format(new Date(r.received_date), "MMM d, yyyy") : "—"}
                      {r.received_by ? ` · by ${r.received_by}` : ""}
                      <Badge className={`ml-2 text-xs ${r.status === "complete" ? "bg-primary/10 text-primary border-primary/20" : "bg-amber-500/10 text-amber-700 border-amber-200"}`} variant="outline">
                        {r.status === "complete" ? "Complete" : "Partial"}
                      </Badge>
                    </span>
                    <span className="font-medium text-foreground">₱{(r.total_amount || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isFullyReceived ? (
            <div className="flex items-center gap-2 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <CheckCircle className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-semibold text-primary">All items have been fully received for this PO.</p>
                <p className="text-xs text-muted-foreground">No remaining quantities to record.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Received Date</Label>
                  <Input
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Received By</Label>
                  <Input
                    placeholder="Name of receiver"
                    value={receivedBy}
                    onChange={(e) => setReceivedBy(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label>Delivery Document / Receipt URL (optional)</Label>
                <Input
                  placeholder="https://..."
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                />
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Item</th>
                      <th className="px-3 py-2 text-right font-semibold">Ordered</th>
                      <th className="px-3 py-2 text-right font-semibold">Previously Received</th>
                      <th className="px-3 py-2 text-right font-semibold">Receive Now</th>
                      <th className="px-3 py-2 text-right font-semibold">After This</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lineItems.map((li, idx) => {
                      const afterThis = li.already_received + li.quantity_received;
                      const isFulfilled = afterThis >= li.quantity;
                      return (
                        <tr key={idx} className={`hover:bg-muted/20 ${li.remaining_before === 0 ? "opacity-50" : ""}`}>
                          <td className="px-3 py-3">{li.description}</td>
                          <td className="px-3 py-3 text-right font-medium">{li.quantity}</td>
                          <td className="px-3 py-3 text-right text-muted-foreground">{li.already_received}</td>
                          <td className="px-3 py-3 text-right">
                            {li.remaining_before === 0 ? (
                              <span className="text-xs text-primary font-medium">✓ Done</span>
                            ) : (
                              <Input
                                type="number"
                                min="0"
                                max={li.remaining_before}
                                value={li.quantity_received}
                                onChange={(e) => handleQuantityChange(idx, e.target.value)}
                                className="w-24 text-right"
                              />
                            )}
                          </td>
                          <td className="px-3 py-3 text-right">
                            <span className={`font-semibold text-xs ${isFulfilled ? "text-primary" : "text-chart-3"}`}>
                              {afterThis}/{li.quantity}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {isPartialThisReceipt && (
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-700">
                    Partial delivery — remaining items can be received in future transactions under the same PO.
                  </p>
                </div>
              )}

              <div>
                <Label>Notes (optional)</Label>
                <Input
                  placeholder="Delivery condition, inspection notes, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {!isFullyReceived && (
            <Button onClick={handleSubmit} disabled={createMutation.isPending || !hasItemsToReceive}>
              {createMutation.isPending
                ? "Recording..."
                : isPartialThisReceipt
                  ? "Record Partial Receipt"
                  : "Record Complete Receipt"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}