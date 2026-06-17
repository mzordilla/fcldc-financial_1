import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { FileSpreadsheet, ExternalLink, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function WithholdingTaxSync() {
  const currentMonth = format(new Date(), "yyyy-MM");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [monthYear, setMonthYear] = useState("");
  const [lastResult, setLastResult] = useState(null);

  const { data: payables = [] } = useQuery({
    queryKey: ["payables"],
    queryFn: () => base44.entities.Payable.list("-created_date", 500),
  });

  const { data: paymentRequests = [] } = useQuery({
    queryKey: ["paymentrequests"],
    queryFn: () => base44.entities.PaymentRequest.list("-created_date", 500),
  });

  const syncMutation = useMutation({
    mutationFn: () =>
      base44.functions.invoke("syncWithholdingTaxToSheets", {
        spreadsheetId: spreadsheetId.trim(),
        monthYear: monthYear || null,
      }),
    onSuccess: (res) => {
      setLastResult(res.data);
    },
  });

  // Calculate previews
  const whtPayables = payables.filter(p => (p.withholding_tax_amount || 0) > 0 && p.status !== "paid");
  const whtRequests = paymentRequests.filter(r => (r.withholding_tax_amount || 0) > 0);

  const filteredPayables = monthYear
    ? whtPayables.filter(p => (p.due_date || p.payment_date || "").startsWith(monthYear))
    : whtPayables;
  const filteredRequests = monthYear
    ? whtRequests.filter(r => (r.due_date || r.invoice_date || "").startsWith(monthYear))
    : whtRequests;

  const totalWht = filteredPayables.reduce((s, p) => s + (p.withholding_tax_amount || 0), 0);
  const totalPaidWht = filteredRequests.filter(r => r.approval_status === "paid" || r.approval_step === "paid")
    .reduce((s, r) => s + (r.withholding_tax_amount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Withholding Tax — Google Sheets Sync</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Push withholding tax records to Google Sheets for monthly BIR filing.
        </p>
      </div>

      {/* Preview cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Unpaid WHT Outstanding</p>
          <p className="text-2xl font-bold text-destructive">{fmt(totalWht)}</p>
          <p className="text-xs text-muted-foreground mt-1">{filteredPayables.length} invoices</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">WHT on Paid Requests</p>
          <p className="text-2xl font-bold text-primary">{fmt(totalPaidWht)}</p>
          <p className="text-xs text-muted-foreground mt-1">{filteredRequests.filter(r => r.approval_status === "paid" || r.approval_step === "paid").length} paid</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Payables</p>
          <p className="text-2xl font-bold text-foreground">{payables.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Payment Requests</p>
          <p className="text-2xl font-bold text-foreground">{paymentRequests.length}</p>
        </div>
      </div>

      {/* Configuration */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="text-base font-semibold text-foreground">Sync Configuration</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Google Sheets Spreadsheet ID</Label>
            <Input
              placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              value={spreadsheetId}
              onChange={e => setSpreadsheetId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Paste the ID from your Google Sheets URL: docs.google.com/spreadsheets/d/<strong>ID</strong>/edit
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Filter by Month (optional)</Label>
            <Input
              type="month"
              value={monthYear}
              onChange={e => setMonthYear(e.target.value)}
              max={currentMonth}
            />
            <p className="text-xs text-muted-foreground">
              Leave empty to sync all records
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={!spreadsheetId.trim() || syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 mr-2" />
            )}
            {syncMutation.isPending ? "Syncing..." : "Sync to Google Sheets"}
          </Button>
          {!spreadsheetId.trim() && (
            <span className="text-xs text-muted-foreground">Enter a spreadsheet ID to enable sync</span>
          )}
        </div>

        {/* Error display */}
        {syncMutation.isError && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
            <p className="text-sm text-destructive">
              {syncMutation.error?.response?.data?.error || syncMutation.error?.message || "Sync failed. Check the spreadsheet ID and ensure the sheet is shared with the connected Google account."}
            </p>
          </div>
        )}
      </div>

      {/* Last Result */}
      {lastResult && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <h3 className="text-base font-semibold text-foreground">Sync Complete</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Cells Updated</p>
              <p className="text-lg font-bold text-foreground">{lastResult.updatedCells}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">WHT Outstanding</p>
              <p className="text-lg font-bold text-destructive">{fmt(lastResult.summary?.totalWhtPayable)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Unpaid Invoices</p>
              <p className="text-lg font-bold text-foreground">{lastResult.summary?.unpaidCount}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Payment Requests</p>
              <p className="text-lg font-bold text-foreground">{lastResult.summary?.requestCount}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={lastResult.sheetUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" /> Open in Google Sheets
            </a>
          </Button>
        </div>
      )}

      {/* Preview Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">
            Unpaid WHT Records Preview {monthYear && `— ${monthYear}`}
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase">Supplier</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase hidden sm:table-cell">Invoice #</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase hidden md:table-cell">Project</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase">Gross</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold uppercase">WHT %</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold uppercase">WHT Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPayables.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                    No WHT records found
                  </td>
                </tr>
              )}
              {filteredPayables.map(p => (
                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-2.5 font-medium">{p.supplier_name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden sm:table-cell">{p.invoice_number || "—"}</td>
                  <td className="px-4 py-2.5 text-muted-foreground hidden md:table-cell">{p.project_name || "—"}</td>
                  <td className="px-4 py-2.5 text-right">{fmt(p.amount)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <Badge variant="outline">{p.withholding_tax_percentage || 0}%</Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-destructive">{fmt(p.withholding_tax_amount)}</td>
                </tr>
              ))}
              {filteredPayables.length > 0 && (
                <tr className="bg-muted/30 font-semibold">
                  <td className="px-4 py-2.5">Total</td>
                  <td className="hidden sm:table-cell" />
                  <td className="hidden md:table-cell" />
                  <td className="px-4 py-2.5 text-right">{fmt(filteredPayables.reduce((s, p) => s + (p.amount || 0), 0))}</td>
                  <td className="text-center" />
                  <td className="px-4 py-2.5 text-right text-destructive">{fmt(totalWht)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}