import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AssignCondoBuyerDialog({ open, onOpenChange, clients, onAssign }) {
  const [clientId, setClientId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { if (open) { setClientId(""); setError(""); } }, [open]);

  const assign = async () => {
    const client = clients.find((item) => item.id === clientId);
    if (!client) return;
    setSaving(true);
    setError("");
    try {
      await onAssign(client);
      onOpenChange(false);
    } catch (err) {
      setError(err?.message || "Buyer could not be assigned.");
    } finally {
      setSaving(false);
    }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader><DialogTitle>Assign Buyer</DialogTitle></DialogHeader>
      <div className="space-y-2">
        <Label>Real Estate Client</Label>
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger><SelectValue placeholder="Select buyer" /></SelectTrigger>
          <SelectContent>{clients.map((client) => <SelectItem key={client.id} value={client.id}>{client.client_name}</SelectItem>)}</SelectContent>
        </Select>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={assign} disabled={!clientId || saving}>{saving ? "Assigning..." : "Assign Buyer"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}