import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { peso } from "@/lib/associationStatement";

export default function SectionEditor({ section, total, onChange, onRemove }) {
  const setLine = (i, patch) => onChange({ ...section, lines: section.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });

  return (
    <div className="border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Input value={section.title} onChange={(e) => onChange({ ...section, title: e.target.value })} placeholder="Category name" className="font-semibold" />
        <Badge variant="outline" className="capitalize shrink-0">{section.type}</Badge>
        {onRemove && (
          <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive shrink-0" title="Remove category" onClick={onRemove}><Trash2 /></Button>
        )}
      </div>
      {section.lines.map((line, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input value={line.description} onChange={(e) => setLine(i, { description: e.target.value })} placeholder="Description" />
          <Input
            type="number" step="0.01" placeholder="0.00" className="w-40 shrink-0 text-right font-mono"
            value={line.amount ?? ""}
            onChange={(e) => setLine(i, { amount: e.target.value === "" ? "" : Number(e.target.value) })}
          />
          <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground" title="Remove line" onClick={() => onChange({ ...section, lines: section.lines.filter((_, j) => j !== i) })}><X /></Button>
        </div>
      ))}
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={() => onChange({ ...section, lines: [...section.lines, { description: "", amount: "" }] })}><Plus /> Add line</Button>
        <p className="text-sm font-semibold">Subtotal <span className="font-mono ml-2">{peso(total)}</span></p>
      </div>
    </div>
  );
}