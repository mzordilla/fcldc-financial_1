import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PERIOD_TYPES, MONTHS, computeTotals, peso } from "@/lib/associationStatement";
import SectionEditor from "./SectionEditor";

const SIGNATORIES = [["prepared_by", "Prepared By"], ["checked_by", "Checked By"], ["approved_by", "Approved By"]];

export default function StatementEditor({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const totals = computeTotals(value.sections);
  const setSection = (i, section) => set({ sections: value.sections.map((s, j) => (j === i ? section : s)) });
  const periodOptions = value.period_type === "monthly" ? MONTHS : ["1st Quarter", "2nd Quarter", "3rd Quarter", "4th Quarter"];

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-xl p-4 grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Condominium Name</Label>
          <Input value={value.condominium_name} onChange={(e) => set({ condominium_name: e.target.value })} placeholder="Condominium / association name" />
        </div>
        <div className="space-y-1.5">
          <Label>Reporting Period</Label>
          <Select value={value.period_type} onValueChange={(v) => set({ period_type: v, period_number: 1 })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{PERIOD_TYPES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Year</Label>
          <Input type="number" value={value.year} onChange={(e) => set({ year: e.target.value })} />
        </div>
        {value.period_type !== "annual" && (
          <div className="space-y-1.5">
            <Label>{value.period_type === "monthly" ? "Month" : "Quarter"}</Label>
            <Select value={String(value.period_number || 1)} onValueChange={(v) => set({ period_number: Number(v) })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{periodOptions.map((label, i) => <SelectItem key={label} value={String(i + 1)}>{label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Preparation Date</Label>
          <Input type="date" value={value.preparation_date || ""} onChange={(e) => set({ preparation_date: e.target.value })} />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        {value.sections.map((section, i) => (
          <SectionEditor
            key={i} section={section} total={totals.sections[i].total}
            onChange={(s) => setSection(i, s)}
            onRemove={section.type === "expense" ? () => set({ sections: value.sections.filter((_, j) => j !== i) }) : undefined}
          />
        ))}
        <Button variant="outline" onClick={() => set({ sections: [...value.sections, { title: "", type: "expense", lines: [{ description: "", amount: "" }] }] })}><Plus /> Add Expense Category</Button>
        <div className="rounded-lg bg-muted/50 p-4 text-sm space-y-1.5">
          <p className="flex justify-between"><span>Total Income</span><span className="font-mono">{peso(totals.totalIncome)}</span></p>
          <p className="flex justify-between"><span>Total Operating Expenses</span><span className="font-mono">{peso(totals.totalExpenses)}</span></p>
          <p className={`flex justify-between font-bold border-t border-border pt-1.5 ${totals.net < 0 ? "text-destructive" : "text-primary"}`}>
            <span>Net Operating {totals.net < 0 ? "Deficit" : "Surplus"}</span><span className="font-mono">{peso(totals.net)}</span>
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="grid sm:grid-cols-3 gap-4">
          {SIGNATORIES.map(([field, label]) => (
            <div key={field} className="space-y-1.5">
              <Label>{label}</Label>
              <Input value={value[field] || ""} onChange={(e) => set({ [field]: e.target.value })} placeholder="Name" />
              <Input value={value[`${field}_position`] || ""} onChange={(e) => set({ [`${field}_position`]: e.target.value })} placeholder="Position / designation" />
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label>Notes (optional)</Label>
          <Textarea value={value.notes || ""} onChange={(e) => set({ notes: e.target.value })} placeholder="Notes printed at the bottom of the statement" />
        </div>
      </div>
    </div>
  );
}