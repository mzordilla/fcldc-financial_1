import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { FileCheck2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-600",
  approved: "bg-blue-500/10 text-blue-600",
  paid: "bg-primary/10 text-primary",
  rejected: "bg-destructive/10 text-destructive",
};

const fmt = (v) =>
  `₱${(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CheckMonitoring() {
  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["payment_requests_checks"],
    queryFn: () => base44.entities.PaymentRequest.list("-check_date", 1000),
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankaccounts"],
    queryFn: () => base44.entities.BankAccount.list("-created_date", 100),
  });

  const bankLabel = (id) => {
    const acc = bankAccounts.find((a) => a.id === id);
    return acc ? `${acc.account_name} — ${acc.bank_name}` : "—";
  };

  const checks = requests
    .filter((r) => r.payment_method === "check")
    .sort((a, b) => {
      const bankCompare = bankLabel(a.bank_account_id).localeCompare(bankLabel(b.bank_account_id));
      if (bankCompare !== 0) return bankCompare;
      return new Date(b.check_date || b.created_date || 0) - new Date(a.check_date || a.created_date || 0);
    });

  const totalAmount = checks.reduce((s, c) => s + (c.amount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-primary/10">
            <FileCheck2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Checks Issued</p>
            <p className="text-3xl font-bold text-foreground">{checks.length}</p>
          </div>
        </div>
        <div className="bg-card rounded-2xl border border-border p-5 flex items-center gap-4">
          <div className="p-3 rounded-xl bg-chart-2/10">
            <FileCheck2 className="w-5 h-5 text-chart-2" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Amount</p>
            <p className="text-3xl font-bold text-foreground">{fmt(totalAmount)}</p>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Loading...</div>
        ) : checks.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileCheck2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No checks issued yet</p>
            <p className="text-sm mt-1">Checks will appear here once payment requests are paid by check</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="text-left px-4 py-2.5">Request #</th>
                  <th className="text-left px-4 py-2.5">Check No.</th>
                  <th className="text-left px-4 py-2.5">Bank</th>
                  <th className="text-left px-4 py-2.5">Date</th>
                  <th className="text-left px-4 py-2.5">Payee</th>
                  <th className="text-left px-4 py-2.5">Description</th>
                  <th className="text-right px-4 py-2.5">Amount</th>
                  <th className="text-right px-4 py-2.5">Net Disbursed</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                  <th className="text-left px-4 py-2.5">Disbursed By</th>
                  <th className="text-left px-4 py-2.5">Notes</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((c) => (
                  <tr key={c.id} className="border-b border-border/50 last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">{c.request_number || "—"}</td>
                    <td className="px-4 py-2.5 font-semibold text-foreground">{c.check_number || "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{bankLabel(c.bank_account_id)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {c.check_date ? format(new Date(c.check_date), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-foreground">{c.payee}</td>
                    <td className="px-4 py-2.5 text-muted-foreground truncate max-w-xs">{c.description || "—"}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-foreground">{fmt(c.amount)}</td>
                    <td className="px-4 py-2.5 text-right font-medium text-foreground">
                      {fmt((c.amount || 0) - (c.withholding_tax_amount || 0) + (c.vat_amount || 0))}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge className={`text-xs capitalize ${statusColors[c.approval_status] || "bg-muted text-muted-foreground"}`}>
                        {c.approval_status || "pending"}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap">{c.approved_by || "—"}</td>
                    <td className="px-4 py-2.5 text-muted-foreground truncate max-w-xs">{c.approval_notes || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}