import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ApprovedPRSelect({ requests, selectedId, onSelect, loading }) {
  const handleChange = value => onSelect(value === "independent" ? null : requests.find(request => request.id === value));

  return <div className="space-y-1.5">
    <Label>Approved Payment Request</Label>
    <Select value={selectedId || "independent"} onValueChange={handleChange}>
      <SelectTrigger><SelectValue placeholder={loading ? "Loading approved PRs..." : "Select PR number"} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="independent">Independent check</SelectItem>
        {requests.map(request => <SelectItem key={request.id} value={request.id}>
          {request.request_number || request.invoice_number || `PR-${request.id.slice(-6)}`} — {request.payee}
        </SelectItem>)}
      </SelectContent>
    </Select>
    {!loading && requests.length === 0 && <p className="text-xs text-muted-foreground">No approved, unlinked payment requests available.</p>}
  </div>;
}