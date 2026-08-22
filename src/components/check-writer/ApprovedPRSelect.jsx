import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const netAmount = request => (request.amount || 0) - (request.withholding_tax_amount || 0) + (request.vat_amount || 0);

export default function ApprovedPRSelect({ requests, selectedIds, onToggle, loading }) {
  const selectedPayee = requests.find(request => selectedIds.includes(request.id))?.payee;

  return <div className="space-y-1.5">
    <Label>Approved Payment Requests <span className="font-normal text-muted-foreground">(optional)</span></Label>
    <div className="max-h-52 overflow-y-auto rounded-md border border-input divide-y divide-border">
      {loading ? <p className="p-3 text-sm text-muted-foreground">Loading approved PRs...</p> : requests.length === 0 ? <p className="p-3 text-sm text-muted-foreground">No approved, unlinked payment requests available.</p> : requests.map(request => {
        const checked = selectedIds.includes(request.id);
        const disabled = !!selectedPayee && request.payee !== selectedPayee;
        return <label key={request.id} className={`flex items-start gap-3 p-3 ${disabled ? "opacity-40" : "cursor-pointer hover:bg-muted/40"}`}>
          <Checkbox checked={checked} disabled={disabled} onCheckedChange={value => onToggle(request, value === true)} />
          <span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{request.request_number || request.invoice_number || `PR-${request.id.slice(-6)}`}</span><span className="block truncate text-xs text-muted-foreground">{request.payee}</span></span>
          <span className="text-xs font-mono font-semibold">₱{netAmount(request).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </label>;
      })}
    </div>
    <p className="text-xs text-muted-foreground">Select multiple PRs for the same payee to combine them in one check.</p>
  </div>;
}