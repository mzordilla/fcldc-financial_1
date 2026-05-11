import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle2, X } from "lucide-react";

const CATEGORY_VALUES = [
  "project_payment","material_cost","labor","equipment",
  "subcontractor","overhead","permits","insurance","bank_reconciliation","other"
];

const CATEGORY_LABELS = {
  project_payment: "Project Payment", material_cost: "Material Cost", labor: "Labor",
  equipment: "Equipment", subcontractor: "Subcontractor", overhead: "Overhead",
  permits: "Permits", insurance: "Insurance", bank_reconciliation: "Bank Reconciliation", other: "Other",
};

function normalizeCategory(raw) {
  if (!raw) return "other";
  const val = String(raw).toLowerCase().replace(/[\s\-]/g, "_");
  if (CATEGORY_VALUES.includes(val)) return val;
  // fuzzy match
  return CATEGORY_VALUES.find(c => val.includes(c.replace(/_/g, "")) || c.replace(/_/g, "").includes(val)) || "other";
}

function normalizeType(raw) {
  if (!raw) return null;
  const v = String(raw).toLowerCase();
  if (v.includes("income") || v.includes("credit") || v.includes("in")) return "income";
  if (v.includes("expense") || v.includes("debit") || v.includes("out")) return "expense";
  return null;
}

function normalizeDate(raw) {
  if (!raw) return "";
  // Excel serial number
  if (typeof raw === "number") {
    const d = XLSX.SSF.parse_date_code(raw);
    if (d) return `${d.y}-${String(d.m).padStart(2,"0")}-${String(d.d).padStart(2,"0")}`;
  }
  const s = String(raw).trim();
  // already yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().split("T")[0];
  return "";
}

function parseRows(sheetData) {
  if (!sheetData || sheetData.length < 2) return [];
  const [headerRow, ...dataRows] = sheetData;
  const headers = headerRow.map(h => String(h || "").toLowerCase().trim());

  const col = (name) => headers.findIndex(h => h.includes(name));

  const iDesc   = col("desc") !== -1 ? col("desc") : col("name") !== -1 ? col("name") : col("detail");
  const iAmount = col("amount") !== -1 ? col("amount") : col("value");
  const iType   = col("type");
  const iCat    = col("categ");
  const iDate   = col("date");
  const iProject = col("project");

  return dataRows
    .filter(row => row && row.some(c => c !== null && c !== undefined && c !== ""))
    .map((row, i) => {
      const description = iDesc >= 0 ? String(row[iDesc] || "") : "";
      const rawAmount = iAmount >= 0 ? row[iAmount] : null;
      const amount = parseFloat(String(rawAmount).replace(/[^0-9.\-]/g, "")) || 0;
      const type = iType >= 0 ? normalizeType(row[iType]) : (amount < 0 ? "expense" : null);
      const category = iCat >= 0 ? normalizeCategory(row[iCat]) : "other";
      const date = iDate >= 0 ? normalizeDate(row[iDate]) : "";
      const project_name = iProject >= 0 ? String(row[iProject] || "") : "";

      const errors = [];
      if (!description) errors.push("Missing description");
      if (!amount || amount === 0) errors.push("Missing/invalid amount");
      if (!type) errors.push("Missing type (income/expense)");
      if (!date) errors.push("Missing/invalid date");

      return {
        _rowNum: i + 2,
        description,
        amount: Math.abs(amount),
        type: type || "expense",
        category,
        date,
        project_name,
        _errors: errors,
        _valid: errors.length === 0,
      };
    });
}

export default function ExcelImportDialog({ open, onOpenChange, onImport }) {
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const fileRef = useRef();

  const reset = () => { setRows([]); setFileName(""); setDone(false); };

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
      setRows(parseRows(data));
      setDone(false);
    };
    reader.readAsArrayBuffer(file);
  };

  const validRows = rows.filter(r => r._valid);
  const invalidRows = rows.filter(r => !r._valid);

  const handleImport = async () => {
    setImporting(true);
    const clean = validRows.map(({ _rowNum, _errors, _valid, ...r }) => r);
    await onImport(clean);
    setImporting(false);
    setDone(true);
  };

  const handleClose = () => { reset(); onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Transactions from Excel</DialogTitle>
        </DialogHeader>

        {/* Template hint */}
        <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Expected columns (row 1 = headers):</p>
          <p><span className="font-mono bg-muted px-1 rounded">Description</span> · <span className="font-mono bg-muted px-1 rounded">Amount</span> · <span className="font-mono bg-muted px-1 rounded">Type</span> (income/expense) · <span className="font-mono bg-muted px-1 rounded">Category</span> · <span className="font-mono bg-muted px-1 rounded">Date</span> (YYYY-MM-DD) · <span className="font-mono bg-muted px-1 rounded">Project</span> (optional)</p>
        </div>

        {/* File picker */}
        {!fileName ? (
          <button
            type="button"
            onClick={() => fileRef.current.click()}
            className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-muted/30 transition-colors w-full"
          >
            <Upload className="w-8 h-8 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Click to select .xlsx or .xls file</span>
            <span className="text-xs text-muted-foreground">Supports Excel 97-2007+ formats</span>
          </button>
        ) : (
          <div className="flex items-center gap-3 bg-muted/40 rounded-lg p-3">
            <FileSpreadsheet className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="text-sm font-medium flex-1 truncate">{fileName}</span>
            <button type="button" onClick={reset} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />

        {/* Preview */}
        {rows.length > 0 && !done && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1.5 text-primary"><CheckCircle2 className="w-4 h-4" />{validRows.length} valid</span>
              {invalidRows.length > 0 && (
                <span className="flex items-center gap-1.5 text-destructive"><AlertCircle className="w-4 h-4" />{invalidRows.length} with errors (will be skipped)</span>
              )}
            </div>

            <div className="border border-border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">#</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">Description</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">Amount</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">Type</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">Category</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">Date</th>
                    <th className="text-left px-3 py-2 text-muted-foreground font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r._rowNum} className={`border-t border-border ${r._valid ? "hover:bg-muted/30" : "bg-destructive/5"}`}>
                      <td className="px-3 py-2 text-muted-foreground">{r._rowNum}</td>
                      <td className="px-3 py-2 max-w-[160px] truncate">{r.description || "—"}</td>
                      <td className="px-3 py-2">₱{(r.amount || 0).toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className={`text-xs ${r.type === "income" ? "text-primary border-primary/30" : "text-destructive border-destructive/30"}`}>
                          {r.type}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{CATEGORY_LABELS[r.category] || r.category}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.date || "—"}</td>
                      <td className="px-3 py-2">
                        {r._valid
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                          : <span className="text-destructive text-xs">{r._errors.join(", ")}</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {done && (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-primary" />
            <p className="font-semibold text-foreground">{validRows.length} transactions imported!</p>
            <Button variant="outline" size="sm" onClick={handleClose}>Close</Button>
          </div>
        )}

        {!done && (
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
            <Button
              type="button"
              disabled={validRows.length === 0 || importing}
              onClick={handleImport}
            >
              {importing ? "Importing..." : `Import ${validRows.length} Transactions`}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}