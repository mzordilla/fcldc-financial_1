import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X, Download } from "lucide-react";

const VALID_CATEGORIES = ["materials", "equipment", "subcontractor", "services", "utilities", "other"];
const VALID_PRIORITIES = ["low", "normal", "high", "urgent"];

function normalizeCategory(val) {
  if (!val) return "other";
  const v = String(val).toLowerCase().trim();
  return VALID_CATEGORIES.find(c => c === v) || "other";
}

function normalizePriority(val) {
  if (!val) return "normal";
  const v = String(val).toLowerCase().trim();
  return VALID_PRIORITIES.find(p => p === v) || "normal";
}

function normalizeDate(val) {
  if (!val) return "";
  if (typeof val === "number") {
    const date = XLSX.SSF.parse_date_code(val);
    if (date) return `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`;
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().split("T")[0];
  return "";
}

function parseRows(sheet) {
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  if (raw.length < 2) return { rows: [], errors: ["File is empty or has no data rows."] };

  const headers = raw[0].map(h => String(h).toLowerCase().trim());
  const col = (name) => headers.indexOf(name);

  const errors = [];
  const rows = [];

  for (let i = 1; i < raw.length; i++) {
    const r = raw[i];
    if (r.every(c => !c)) continue;

    const supplier_name = String(r[col("supplier_name")] || r[col("supplier")] || "").trim();
    const amount = parseFloat(r[col("amount")] || 0);
    const description = String(r[col("description")] || "").trim();

    if (!supplier_name) { errors.push(`Row ${i + 1}: Missing supplier_name`); continue; }
    if (!amount || isNaN(amount)) { errors.push(`Row ${i + 1}: Missing or invalid amount`); continue; }
    if (!description) { errors.push(`Row ${i + 1}: Missing description`); continue; }

    rows.push({
      supplier_name,
      description,
      amount,
      po_number: String(r[col("po_number")] || "").trim(),
      project_name: String(r[col("project_name")] || r[col("project")] || "").trim(),
      category: normalizeCategory(r[col("category")]),
      priority: normalizePriority(r[col("priority")]),
      requested_by: String(r[col("requested_by")] || "").trim(),
      requested_date: normalizeDate(r[col("requested_date")] || r[col("date")] || ""),
      required_date: normalizeDate(r[col("required_date")] || ""),
      items: String(r[col("items")] || "").trim(),
      approval_status: "pending",
    });
  }

  return { rows, errors };
}

function downloadSampleFile() {
  const wb = XLSX.utils.book_new();
  const rows = [
    ["po_number", "supplier_name", "description", "amount", "category", "priority", "project_name", "requested_by", "requested_date", "required_date", "items"],
    ["PO-001", "ABC Construction Supplies", "Cement bags and steel bars for foundation", 185000, "materials", "high", "Building A", "Juan Santos", "2026-05-01", "2026-05-10", "50 bags cement, 20 pcs rebar"],
    ["PO-002", "XYZ Equipment Rentals", "Concrete mixer rental for 2 weeks", 45000, "equipment", "normal", "Building A", "Maria Reyes", "2026-05-03", "2026-05-07", "1 unit concrete mixer"],
    ["PO-003", "FastBuild Subcontractors", "Electrical rough-in works for floors 1-3", 220000, "subcontractor", "high", "Office Renovation", "Carlos Lim", "2026-05-05", "2026-05-20", "Labor and materials included"],
    ["PO-004", "City Hardware Store", "Plumbing fixtures and pipes", 38500, "materials", "normal", "Office Renovation", "Ana Cruz", "2026-05-06", "2026-05-12", "Various plumbing supplies"],
    ["PO-005", "SafeGuard Insurance Co.", "Site liability insurance premium", 15000, "services", "low", "", "Juan Santos", "2026-05-08", "2026-05-15", ""],
    ["PO-006", "PowerUp Utilities", "Temporary power connection for construction site", 12000, "utilities", "urgent", "Building A", "Maria Reyes", "2026-05-09", "2026-05-11", ""],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [
    { wch: 10 }, { wch: 28 }, { wch: 42 }, { wch: 12 }, { wch: 14 },
    { wch: 10 }, { wch: 20 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 36 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, "Purchase Orders");
  XLSX.writeFile(wb, "sample_purchase_orders.xlsx");
}

export default function POExcelImportDialog({ open, onOpenChange, onImport }) {
  const [parsed, setParsed] = useState(null);
  const [errors, setErrors] = useState([]);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef();

  const reset = () => { setParsed(null); setErrors([]); setDone(false); };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const { rows, errors } = parseRows(sheet);
      setParsed(rows);
      setErrors(errors);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleImport = async () => {
    if (!parsed?.length) return;
    setImporting(true);
    await onImport(parsed);
    setImporting(false);
    setDone(true);
  };

  const handleClose = (v) => {
    if (!v) reset();
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Purchase Orders from Excel</DialogTitle>
        </DialogHeader>

        {/* Template hint */}
        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="font-medium text-foreground mb-1">Required columns:</p>
              <p>
                <span className="font-mono bg-muted px-1 rounded">supplier_name</span> ·{" "}
                <span className="font-mono bg-muted px-1 rounded">description</span> ·{" "}
                <span className="font-mono bg-muted px-1 rounded">amount</span> · optional: po_number, category, priority, project_name, requested_by, requested_date, required_date, items
              </p>
            </div>
            <button
              type="button"
              onClick={downloadSampleFile}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline whitespace-nowrap font-medium"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Download Sample
            </button>
          </div>
        </div>

        {/* File picker */}
        {!parsed && !done && (
          <div
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium text-foreground">Click to select an Excel file</p>
            <p className="text-xs text-muted-foreground mt-1">.xlsx or .xls</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 space-y-1">
            <p className="text-xs font-semibold text-destructive flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {errors.length} row{errors.length > 1 ? "s" : ""} skipped:</p>
            {errors.map((e, i) => <p key={i} className="text-xs text-destructive pl-4">{e}</p>)}
          </div>
        )}

        {/* Preview */}
        {parsed && parsed.length > 0 && !done && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">{parsed.length} purchase order{parsed.length > 1 ? "s" : ""} ready to import</p>
            <div className="border border-border rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Supplier</th>
                    <th className="px-3 py-2 text-left font-medium">Description</th>
                    <th className="px-3 py-2 text-left font-medium">Category</th>
                    <th className="px-3 py-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.map((row, i) => (
                    <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                      <td className="px-3 py-2 font-medium">{row.supplier_name}</td>
                      <td className="px-3 py-2 text-muted-foreground truncate max-w-[180px]">{row.description}</td>
                      <td className="px-3 py-2 text-muted-foreground">{row.category}</td>
                      <td className="px-3 py-2 text-right font-semibold">₱{(row.amount || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Done */}
        {done && (
          <div className="flex items-center gap-2 text-primary bg-primary/5 border border-primary/20 rounded-lg p-4">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{parsed.length} purchase order{parsed.length > 1 ? "s" : ""} imported successfully!</p>
          </div>
        )}

        <DialogFooter className="gap-2">
          {!done && parsed?.length > 0 && (
            <Button onClick={handleImport} disabled={importing}>
              {importing ? "Importing..." : `Import ${parsed.length} PO${parsed.length > 1 ? "s" : ""}`}
            </Button>
          )}
          {!done && !parsed && (
            <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
          )}
          {done && <Button onClick={() => handleClose(false)}>Done</Button>}
          {parsed && !done && (
            <Button variant="ghost" size="icon" onClick={reset} title="Clear">
              <X className="w-4 h-4" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}