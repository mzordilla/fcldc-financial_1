import { useState } from "react";
import { base44 } from "@/api/base44Client";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Database } from "lucide-react";

const ENTITIES = [
  "Transaction", "BankAccount", "BankTransferRequest", "BankReconciliation", "Check", "PaymentRequest",
  "PurchaseOrder", "ReceivingItem", "Payable", "Receivable", "CustomerAdvance", "BillingCycle", "ChangeOrder",
  "Contract", "Project", "Client", "Payee", "SupplierAccreditation", "SupplierEvaluation", "ChartOfAccount",
  "WorkingCapitalLoan", "LoanPayment", "BankLoan", "Debt", "PPEAsset", "Employee", "PayrollPeriod", "PayrollEntry",
  "CondoUnit", "Tenant", "LeaseBillingCycle", "LeaseCollection", "PropertyListing", "CorporateDocument", "AuditLog",
];

const cell = (v) => (v !== null && typeof v === "object" ? JSON.stringify(v) : v);

async function fetchAll(name) {
  const rows = [];
  let cursor;
  do {
    const page = await base44.entities[name].list({ sort: "-created_date", limit: 500, cursor });
    rows.push(...page.items);
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return rows;
}

export default function FullDataExport() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");

  const handleExport = async () => {
    setBusy(true);
    const wb = XLSX.utils.book_new();
    for (const name of ENTITIES) {
      setProgress(name);
      const rows = await fetchAll(name).catch(() => []);
      const data = rows.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, cell(v)])));
      const ws = data.length ? XLSX.utils.json_to_sheet(data) : XLSX.utils.aoa_to_sheet([["No records"]]);
      XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
    }
    XLSX.writeFile(wb, `FCLDC_Full_Data_${new Date().toISOString().split("T")[0]}.xlsx`);
    setBusy(false);
    setProgress("");
    toast.success("Full data backup downloaded.");
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Database className="w-6 h-6 text-primary" />
        <div>
          <h3 className="font-semibold">Full Data Backup (Excel)</h3>
          <p className="text-sm text-muted-foreground">Downloads every record in the database into one Excel file, with one tab per table ({ENTITIES.length} tabs).</p>
        </div>
      </div>
      <Button onClick={handleExport} disabled={busy} className="gap-2">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
        {busy ? `Exporting ${progress}...` : "Download All Data"}
      </Button>
    </div>
  );
}