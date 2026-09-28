import { useState } from "react";
import { Pencil } from "lucide-react";

export default function EditableAvailable({ value, isOverride, canEdit, onSave, money }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const start = () => { if (!canEdit) return; setDraft(String(value || 0)); setEditing(true); };
  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    onSave(trimmed === "" ? null : Number(trimmed));
  };

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        step="0.01"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") setEditing(false); }}
        placeholder="Blank = auto"
        className="w-44 border-b-2 border-chart-2 bg-transparent font-project-display text-2xl font-bold tracking-tight text-foreground outline-none"
      />
    );
  }

  return (
    <button type="button" onClick={start} disabled={!canEdit} className="group flex items-center gap-2 text-left disabled:cursor-default" title={canEdit ? "Click to edit available balance" : undefined}>
      <span className="font-project-display text-2xl font-bold tracking-tight text-foreground">{money(value)}</span>
      {canEdit && <Pencil className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />}
      {isOverride && <span className="rounded bg-chart-2/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-chart-2">manual</span>}
    </button>
  );
}