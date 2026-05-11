import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

const EMPTY_ROW = () => ({
  description: "",
  amount: "",
  type: "expense",
  category: "",
  project_name: "",
  date: new Date().toISOString().split("T")[0],
  bank_account_id: "",
  status: "completed",
});

const CATEGORIES = [
  { value: "project_payment", label: "Project Payment" },
  { value: "material_cost", label: "Material Cost" },
  { value: "labor", label: "Labor" },
  { value: "equipment", label: "Equipment" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "overhead", label: "Overhead" },
  { value: "permits", label: "Permits" },
  { value: "insurance", label: "Insurance" },
  { value: "bank_reconciliation", label: "Bank Reconciliation" },
  { value: "other", label: "Other" },
];

export default function BatchTransactionDialog({ open, onOpenChange, bankAccounts = [], onSubmit }) {
  const [rows, setRows] = useState([EMPTY_ROW()]);
  const [saving, setSaving] = useState(false);

  const update = (i, field, value) => {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const addRow = () => setRows(prev => [...prev, EMPTY_ROW()]);
  const removeRow = (i) => setRows(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    const valid = rows.filter(r => r.description && r.amount && r.date);
    if (valid.length === 0) return;
    setSaving(true);
    const cleaned = valid.map(r => ({
      ...r,
      amount: parseFloat(r.amount) || 0,
      bank_account_id: r.bank_account_id || undefined,
      category: r.category || undefined,
      project_name: r.project_name || undefined,
    }));
    await onSubmit(cleaned);
    setRows([EMPTY_ROW()]);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { setRows([EMPTY_ROW()]); } onOpenChange(v); }}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Batch Enter Transactions</DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left pb-2 pr-2 font-medium">Description *</th>
                <th className="text-left pb-2 pr-2 font-medium">Type *</th>
                <th className="text-left pb-2 pr-2 font-medium">Amount *</th>
                <th className="text-left pb-2 pr-2 font-medium">Date *</th>
                <th className="text-left pb-2 pr-2 font-medium">Category</th>
                <th className="text-left pb-2 pr-2 font-medium">Project</th>
                <th className="text-left pb-2 pr-2 font-medium">Bank Account</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody className="space-y-2">
              {rows.map((row, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="pr-2 py-2">
                    <Input
                      value={row.description}
                      onChange={e => update(i, "description", e.target.value)}
                      placeholder="Description"
                      className="min-w-[140px]"
                    />
                  </td>
                  <td className="pr-2 py-2">
                    <Select value={row.type} onValueChange={v => update(i, "type", v)}>
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="pr-2 py-2">
                    <Input
                      type="number"
                      value={row.amount}
                      onChange={e => update(i, "amount", e.target.value)}
                      placeholder="0.00"
                      className="w-28"
                    />
                  </td>
                  <td className="pr-2 py-2">
                    <Input
                      type="date"
                      value={row.date}
                      onChange={e => update(i, "date", e.target.value)}
                      className="w-36"
                    />
                  </td>
                  <td className="pr-2 py-2">
                    <Select value={row.category} onValueChange={v => update(i, "category", v)}>
                      <SelectTrigger className="w-36"><SelectValue placeholder="Category" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="pr-2 py-2">
                    <Input
                      value={row.project_name}
                      onChange={e => update(i, "project_name", e.target.value)}
                      placeholder="Project"
                      className="w-32"
                    />
                  </td>
                  <td className="pr-2 py-2">
                    <Select value={row.bank_account_id} onValueChange={v => update(i, "bank_account_id", v)}>
                      <SelectTrigger className="w-36"><SelectValue placeholder="Account" /></SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map(a => (
                          <SelectItem key={a.id} value={a.id}>{a.account_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="py-2">
                    {rows.length > 1 && (
                      <button onClick={() => removeRow(i)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button variant="outline" size="sm" onClick={addRow} className="mt-2">
          <Plus className="w-4 h-4 mr-1" /> Add Row
        </Button>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : `Save ${rows.filter(r => r.description && r.amount).length} Transaction(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}