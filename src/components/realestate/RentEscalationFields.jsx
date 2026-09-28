import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { differenceInMonths, parseISO } from "date-fns";

export function termMonths(start, end) {
  if (!start || !end) return 0;
  return Math.max(1, differenceInMonths(parseISO(end), parseISO(start)) + 1);
}

export function buildSchedule(baseRent, rate, interval, term) {
  const rows = [];
  let rent = Number(baseRent) || 0;
  const step = Math.max(1, Number(interval) || 12);
  for (let from = 1; from <= term; from += step) {
    rows.push({ from_month: from, to_month: Math.min(term, from + step - 1), monthly_rent: Math.round(rent * 100) / 100 });
    rent = rent * (1 + (Number(rate) || 0) / 100);
  }
  return rows;
}

export default function RentEscalationFields({ form, set }) {
  const term = Number(form.lease_term_months) || termMonths(form.lease_start, form.lease_end);
  const schedule = form.rent_schedule || [];
  const regenerate = () => set("rent_schedule", buildSchedule(form.monthly_rent, form.escalation_rate, form.escalation_interval_months, term));
  const editRent = (i, v) => set("rent_schedule", schedule.map((r, idx) => idx === i ? { ...r, monthly_rent: Number(v) } : r));

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <p className="text-sm font-semibold">Lease Escalation</p>
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label>Contract Term (months)</Label>
          <Input type="number" min="1" max="600" value={form.lease_term_months || ""} placeholder={term ? `${term} (from dates)` : "e.g. 60"} onChange={e => set("lease_term_months", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Escalation Rate (%)</Label>
          <Input type="number" step="0.01" value={form.escalation_rate} onChange={e => set("escalation_rate", e.target.value)} placeholder="e.g. 5" />
        </div>
        <div className="space-y-1">
          <Label>Escalate Every (months)</Label>
          <Input type="number" min="1" value={form.escalation_interval_months} onChange={e => set("escalation_interval_months", e.target.value)} placeholder="12" />
        </div>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={regenerate} disabled={!term || !form.monthly_rent}>
        <RefreshCw /> Generate Rent Schedule{term ? ` (Months 1–${term})` : ""}
      </Button>
      {schedule.length > 0 && (
        <div className="max-h-56 overflow-y-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-xs text-muted-foreground"><tr><th className="p-2 text-left">Months</th><th className="p-2 text-right">Monthly Rent (₱)</th></tr></thead>
            <tbody>
              {schedule.map((r, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2">Month {r.from_month}{r.to_month !== r.from_month ? ` – ${r.to_month}` : ""}</td>
                  <td className="p-1 text-right"><Input type="number" className="h-8 text-right" value={r.monthly_rent} onChange={e => editRent(i, e.target.value)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}