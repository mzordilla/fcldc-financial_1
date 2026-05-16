import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Upload } from "lucide-react";

const emptyRow = () => ({ name: "", category: "", contact: "", terms_of_payment: "", vat_status: "", bank_account_name: "", bank_account_number: "" });

const categories = ["supplier", "subcontractor", "employee", "government", "utility", "other"];

export default function BatchPayeeDialog({ open, onOpenChange, onImport }) {
  const [rows, setRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);

  const set = (idx, key, value) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: value } : r));
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);

  const removeRow = (idx) => setRows(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    const valid = rows.filter(r => r.name.trim());
    if (!valid.length) return;
    setSaving(true);
    await onImport(valid);
    setSaving(false);
    setRows([emptyRow()]);
    onOpenChange(false);
  };

  const handleClose = (v) => {
    if (!v) setRows([emptyRow()]);
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl w-full">
        <DialogHeader>
          <DialogTitle>Batch Add Payees</DialogTitle>
        </DialogHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground">#</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground">Name *</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground">Category</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground">Contact</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground">Terms</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground">VAT</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground">Bank Acct Name</th>
                <th className="px-2 py-2 text-left text-xs font-semibold text-muted-foreground">Bank Acct No.</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={idx} className="border-b border-border/50">
                  <td className="px-2 py-1.5 text-xs text-muted-foreground">{idx + 1}</td>
                  <td className="px-2 py-1.5">
                    <Input value={row.name} onChange={e => set(idx, "name", e.target.value)} placeholder="Payee name" className="h-8 text-sm min-w-[140px]" />
                  </td>
                  <td className="px-2 py-1.5">
                    <Select value={row.category} onValueChange={v => set(idx, "category", v)}>
                      <SelectTrigger className="h-8 text-sm min-w-[130px]"><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>
                        {categories.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-1.5">
                    <Input value={row.contact} onChange={e => set(idx, "contact", e.target.value)} placeholder="Phone/email" className="h-8 text-sm min-w-[120px]" />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input value={row.terms_of_payment} onChange={e => set(idx, "terms_of_payment", e.target.value)} placeholder="Net 30, COD..." className="h-8 text-sm min-w-[100px]" />
                  </td>
                  <td className="px-2 py-1.5">
                    <Select value={row.vat_status} onValueChange={v => set(idx, "vat_status", v)}>
                      <SelectTrigger className="h-8 text-sm min-w-[100px]"><SelectValue placeholder="VAT" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vat">VAT</SelectItem>
                        <SelectItem value="non_vat">Non-VAT</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-2 py-1.5">
                    <Input value={row.bank_account_name} onChange={e => set(idx, "bank_account_name", e.target.value)} placeholder="Account holder" className="h-8 text-sm min-w-[130px]" />
                  </td>
                  <td className="px-2 py-1.5">
                    <Input value={row.bank_account_number} onChange={e => set(idx, "bank_account_number", e.target.value)} placeholder="Account number" className="h-8 text-sm min-w-[120px]" />
                  </td>
                  <td className="px-2 py-1.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeRow(idx)} disabled={rows.length === 1}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button variant="outline" size="sm" onClick={addRow} className="mt-2 w-fit">
          <Plus className="w-4 h-4 mr-1" /> Add Row
        </Button>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            <Upload className="w-4 h-4 mr-1.5" />
            {saving ? "Saving..." : `Import ${rows.filter(r => r.name.trim()).length} Payee(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}