import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Package, AlertCircle } from "lucide-react";

export default function ReceiveItemsDialog({ open, onOpenChange, po }) {
  const queryClient = useQueryClient();
  const [receivedDate, setReceivedDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [receivedBy, setReceivedBy] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState(
    po?.line_items?.map(li => ({
      ...li,
      quantity_received: li.quantity,
    })) || []
  );

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ReceivingItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receiving_items"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
      resetForm();
      onOpenChange(false);
    },
  });

  const resetForm = () => {
    setReceivedDate(format(new Date(), "yyyy-MM-dd"));
    setReceivedBy("");
    setReceiptUrl("");
    setNotes("");
    setLineItems([]);
  };

  const handleQuantityChange = (index, value) => {
    const updated = [...lineItems];
    const max = updated[index].quantity;
    updated[index].quantity_received = Math.min(Math.max(0, Number(value)), max);
    setLineItems(updated);
  };

  const isPartial = lineItems.some(li => li.quantity_received < li.quantity);

  const handleSubmit = () => {
    const totalAmount = lineItems.reduce(
      (sum, li) => sum + (li.cost_per_item * li.quantity_received),
      0
    );

    createMutation.mutate({
      po_id: po.id,
      po_number: po.po_number,
      supplier_name: po.supplier_name,
      project_name: po.project_name,
      received_date: receivedDate,
      received_by: receivedBy,
      line_items: lineItems.map(li => ({
        description: li.description,
        quantity_ordered: li.quantity,
        quantity_received: li.quantity_received,
        cost_per_item: li.cost_per_item,
        total: li.cost_per_item * li.quantity_received,
      })),
      total_amount: totalAmount,
      receipt_url: receiptUrl,
      notes: notes || (isPartial ? "Partial delivery received" : ""),
      status: isPartial ? "partial" : "complete",
    });
  };

  if (!po) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Receive Items - PO {po.po_number}
          </DialogTitle>
          <DialogDescription>
            Record received quantities. You can receive partial quantities if needed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
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
                  <th className="px-3 py-2 text-right font-semibold">Receive</th>
                  <th className="px-3 py-2 text-right font-semibold">Remaining</th>
                  <th className="px-3 py-2 text-right font-semibold">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {lineItems.map((li, idx) => {
                  const remaining = li.quantity - li.quantity_received;
                  const subtotal = li.cost_per_item * li.quantity_received;
                  return (
                    <tr key={idx} className="hover:bg-muted/20">
                      <td className="px-3 py-3">{li.description}</td>
                      <td className="px-3 py-3 text-right font-medium">{li.quantity}</td>
                      <td className="px-3 py-3 text-right">
                        <Input
                          type="number"
                          min="0"
                          max={li.quantity}
                          value={li.quantity_received}
                          onChange={(e) => handleQuantityChange(idx, e.target.value)}
                          className="w-24 text-right"
                        />
                      </td>
                      <td className="px-3 py-3 text-right text-muted-foreground">{remaining}</td>
                      <td className="px-3 py-3 text-right font-semibold">
                        ₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {isPartial && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <p className="text-sm text-amber-700">
                Partial delivery: Some items will remain pending for future receipt.
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? "Recording..." : isPartial ? "Record Partial Receipt" : "Record Complete Receipt"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}