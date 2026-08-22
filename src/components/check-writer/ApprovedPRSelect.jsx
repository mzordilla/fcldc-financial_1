import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

const netAmount = request => (request.amount || 0) - (request.withholding_tax_amount || 0) + (request.vat_amount || 0);

export default function ApprovedPRSelect({ requests, selectedIds, onToggle, loading }) {
  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();
  const filteredRequests = requests.filter(request => !term || [request.request_number, request.invoice_number, request.payee].some(value => value?.toLowerCase().includes(term)));

  return <div className="space-y-1">
    <Label className="text-xs">Approved Payment Requests <span className="font-normal text-muted-foreground">(optional)</span></Label>
    <Input className="h-8 text-xs" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search PR number, invoice, or supplier..." />
    <div className="max-h-40 overflow-y-auto rounded-md border border-input divide-y divide-border">
      {loading ? <p className="p-3 text-sm text-muted-foreground">Loading approved PRs...</p> : requests.length === 0 ? <p className="p-3 text-sm text-muted-foreground">No approved, unlinked payment requests available.</p> : filteredRequests.length === 0 ? <p className="p-3 text-sm text-muted-foreground">No matching payment requests.</p> : filteredRequests.map(request => {
        const checked = selectedIds.includes(request.id);
        return <label key={request.id} className="flex items-start gap-1.5 px-2 py-1.5 cursor-pointer hover:bg-muted/40">
          <Checkbox className="h-3 w-3" checked={checked} onCheckedChange={value => onToggle(request, value === true)} />
          <span className="min-w-0 flex-1"><span className="block text-[8px] leading-tight font-semibold">{request.request_number || request.invoice_number || `PR-${request.id.slice(-6)}`}</span><span className="block truncate text-[7px] leading-tight text-muted-foreground">{request.payee}</span></span>
          <span className="text-[8px] leading-tight font-mono font-semibold">₱{netAmount(request).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
        </label>;
      })}
    </div>
    <p className="text-[9px] leading-tight text-muted-foreground">Mixed-supplier selections are combined into one check payable to CASH.</p>
  </div>;
}