import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import PayeeSelector from "@/components/payment/PayeeSelector";

export default function ChangeRequestDialog({ open, onOpenChange, po, onSubmit }) {
  const [field, setField] = useState("price");
  const [lineItemDesc, setLineItemDesc] = useState("");
  const [newValue, setNewValue] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const hasLineItems = po?.line_items?.length > 0;

  const currentValue = field === "price" ? `₱${(po?.amount || 0).toLocaleString()}` :
    field === "supplier" ? po?.supplier_name :
    hasLineItems ? (po.line_items.find(li => li.description === lineItemDesc)?.quantity ?? "") : "";

  const reset = () => { setField("price"); setLineItemDesc(""); setNewValue(""); setReason(""); };

  const handleSubmit = async () => {
    if (!newValue.trim() || !reason.trim()) return;
    if (field === "quantity" && hasLineItems && !lineItemDesc) return;
    setSaving(true);
    await onSubmit({
      field,
      line_item_description: field === "quantity" ? lineItemDesc : "",
      current_value: String(currentValue ?? ""),
      requested_value: newValue.trim(),
      reason: reason.trim(),
    });
    setSaving(false);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Change — {po?.po_number || po?.supplier_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>What needs to change?</Label>
            <Select value={field} onValueChange={(v) => { setField(v); setLineItemDesc(""); setNewValue(""); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="price">Price</SelectItem>
                <SelectItem value="quantity">Quantity</SelectItem>
                <SelectItem value="supplier">Supplier</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {field === "quantity" && hasLineItems && (
            <div>
              <Label>Line Item</Label>
              <Select value={lineItemDesc} onValueChange={setLineItemDesc}>
                <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>
                  {po.line_items.map((li, i) => (
                    <SelectItem key={i} value={li.description}>{li.description} (qty {li.quantity})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Current Value</Label>
            <p className="text-sm text-muted-foreground py-1.5">{currentValue || "—"}</p>
          </div>

          <div>
            <Label>Requested New Value</Label>
            {field === "supplier" ? (
              <PayeeSelector value={newValue} onChange={setNewValue} />
            ) : (
              <Input value={newValue} onChange={(e) => setNewValue(e.target.value)} placeholder={field === "price" ? "New total amount" : "New quantity"} />
            )}
          </div>

          <div>
            <Label>Reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this change needed?" />
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={saving}>
            {saving ? "Submitting..." : "Submit Change Request"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}