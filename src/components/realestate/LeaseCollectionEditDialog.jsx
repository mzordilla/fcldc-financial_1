import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export default function LeaseCollectionEditDialog({ record, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ rent_amount: 0, association_dues: 0, notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) setForm({ rent_amount: record.rent_amount || 0, association_dues: record.association_dues || 0, notes: record.notes || "" });
  }, [record]);

  const total = Number(form.rent_amount || 0) + Number(form.association_dues || 0);

  const save = async () => {
    setSaving(true);
    await base44.entities.LeaseCollection.update(record.id, {
      rent_amount: Number(form.rent_amount || 0), association_dues: Number(form.association_dues || 0), amount: total, notes: form.notes,
    });
    if (record.receivable_id) await base44.entities.Receivable.update(record.receivable_id, { amount: total });
    queryClient.invalidateQueries({ queryKey: ["lease-collections"] });
    queryClient.invalidateQueries({ queryKey: ["receivables"] });
    setSaving(false);
    onClose(true);
  };

  return (
    <Dialog open={!!record} onOpenChange={(o) => !o && onClose(false)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Edit Lease Receivable</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">{record?.tenant_name} · {record?.unit_number} · {record?.month}</p>
        <div className="space-y-3">
          <div><Label className="text-xs">Rent</Label><Input type="number" value={form.rent_amount} onChange={(e) => setForm({ ...form, rent_amount: e.target.value })} /></div>
          <div><Label className="text-xs">Association Dues</Label><Input type="number" value={form.association_dues} onChange={(e) => setForm({ ...form, association_dues: e.target.value })} /></div>
          <div className="flex justify-between text-sm font-semibold"><span>Total</span><span className="text-primary">₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>
          <div><Label className="text-xs">Notes</Label><Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin" />}Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}