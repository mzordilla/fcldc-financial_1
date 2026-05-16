import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Upload, FileSpreadsheet, Download, AlertCircle } from "lucide-react";

const emptyRow = () => ({ name: "", category: "", contact: "", terms_of_payment: "", vat_status: "", bank_account_name: "", bank_account_number: "" });

const categories = ["supplier", "subcontractor", "employee", "government", "utility", "other"];

const normalizeCategory = (val) => {
  if (!val) return "";
  const v = String(val).toLowerCase().trim();
  if (v.includes("sub")) return "subcontractor";
  if (v.includes("emp")) return "employee";
  if (v.includes("gov")) return "government";
  if (v.includes("util")) return "utility";
  if (v.includes("sup")) return "supplier";
  return "other";
};

const normalizeVat = (val) => {
  if (!val) return "";
  const v = String(val).toLowerCase().trim();
  if (v.includes("non")) return "non_vat";
  if (v.includes("vat")) return "vat";
  return "";
};

const downloadTemplate = () => {
  const ws = XLSX.utils.aoa_to_sheet([
    ["name", "category", "contact", "terms_of_payment", "vat_status", "bank_account_name", "bank_account_number"],
    ["Sample Supplier Co.", "supplier", "09XX-XXX-XXXX", "Net 30", "vat", "Sample Supplier Co.", "1234567890"],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Payees");
  XLSX.writeFile(wb, "payee_masterlist_template.xlsx");
};

export default function BatchPayeeDialog({ open, onOpenChange, onImport }) {
  const [rows, setRows] = useState([emptyRow()]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);
  const fileRef = useRef();

  const set = (idx, key, value) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [key]: value } : r));
  };

  const addRow = () => setRows(prev => [...prev, emptyRow()]);
  const removeRow = (idx) => setRows(prev => prev.filter((_, i) => i !== idx));

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const errs = [];
      const parsed = raw.map((r, i) => {
        const name = String(r.name || r.Name || r.NAME || "").trim();
        if (!name) errs.push(`Row ${i + 2}: missing name`);
        return {
          name,
          category: normalizeCategory(r.category || r.Category),
          contact: String(r.contact || r.Contact || "").trim(),
          terms_of_payment: String(r.terms_of_payment || r["Terms of Payment"] || r.terms || "").trim(),
          vat_status: normalizeVat(r.vat_status || r["VAT Status"] || r.vat || ""),
          bank_account_name: String(r.bank_account_name || r["Bank Account Name"] || "").trim(),
          bank_account_number: String(r.bank_account_number || r["Bank Account Number"] || "").trim(),
        };
      });
      setErrors(errs);
      if (parsed.length) setRows(parsed);
    };
    reader.readAsArrayBuffer(file);
    e.target.value = "";
  };

  const handleSubmit = async () => {
    const valid = rows.filter(r => r.name.trim());
    if (!valid.length) return;
    setSaving(true);
    await onImport(valid);
    setSaving(false);
    setRows([emptyRow()]);
    setErrors([]);
    onOpenChange(false);
  };

  const handleClose = (v) => {
    if (!v) { setRows([emptyRow()]); setErrors([]); }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl w-full">
        <DialogHeader>
          <DialogTitle>Batch Add Payees</DialogTitle>
        </DialogHeader>

        {/* Excel import bar */}
        <div className="flex items-center gap-3 p-3 bg-muted/40 rounded-lg border border-border">
          <FileSpreadsheet className="w-5 h-5 text-primary flex-shrink-0" />
          <div className="flex-1 text-sm text-muted-foreground">Import from Excel — columns: <span className="font-mono text-xs">name, category, contact, terms_of_payment, vat_status, bank_account_name, bank_account_number</span></div>
          <Button variant="outline" size="sm" onClick={downloadTemplate}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Template
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileRef.current.click()}>
            <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload Excel
          </Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
        </div>

        {errors.length > 0 && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-1">
            {errors.map((e, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-destructive">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {e}
              </div>
            ))}
          </div>
        )}

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-border bg-muted/60">
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

        <Button variant="outline" size="sm" onClick={addRow} className="w-fit">
          <Plus className="w-4 h-4 mr-1" /> Add Row
        </Button>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={saving || !rows.filter(r => r.name.trim()).length}>
            <Upload className="w-4 h-4 mr-1.5" />
            {saving ? "Saving..." : `Import ${rows.filter(r => r.name.trim()).length} Payee(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}