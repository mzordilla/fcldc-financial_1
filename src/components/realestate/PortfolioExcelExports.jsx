import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { exportLeaseReceivables, exportCondoSalesReceivables, exportListings } from "@/lib/portfolioExcelExport";

const REPORTS = [
  { key: "lease", label: "Lease Receivables", run: async () => exportLeaseReceivables(await base44.entities.LeaseCollection.list("-month", 5000)) },
  { key: "condo", label: "Condo Sales Receivables", run: async () => exportCondoSalesReceivables(await base44.entities.Receivable.list("-due_date", 5000)) },
  { key: "listings", label: "Listings Report", run: async () => exportListings(await base44.entities.PropertyListing.list("-created_date", 5000)) },
];

export default function PortfolioExcelExports() {
  const [busy, setBusy] = useState(null);
  const handle = async (r) => {
    setBusy(r.key);
    await r.run().finally(() => setBusy(null));
  };
  return (
    <div className="flex flex-wrap gap-2">
      {REPORTS.map(r => (
        <Button key={r.key} variant="outline" size="sm" className="gap-2" disabled={!!busy} onClick={() => handle(r)}>
          {busy === r.key ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
          {r.label}
        </Button>
      ))}
    </div>
  );
}