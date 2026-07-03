import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function InlineCategorySelect({ value, categories, onChange }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");

  if (!editing) {
    return (
      <button type="button" onClick={() => { setText(value || ""); setEditing(true); }} className="text-left">
        {value ? (
          <Badge variant="secondary" className="text-xs hover:opacity-80">{value.replace(/_/g, " ")}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground hover:underline">Set category</span>
        )}
      </button>
    );
  }

  const commit = (raw) => {
    const q = (raw || "").trim().toLowerCase();
    if (!q) { onChange(""); setEditing(false); return; }
    const match = categories.find(c => c.value.toLowerCase() === q || c.label.toLowerCase() === q);
    if (match) onChange(match.value);
    setEditing(false);
  };

  return (
    <>
      <input
        list="inline-category-options"
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(text); } if (e.key === "Escape") setEditing(false); }}
        className="h-7 text-xs bg-transparent hover:bg-muted rounded px-2 border border-input focus:outline-none focus:ring-1 focus:ring-ring max-w-[150px]"
      />
      <datalist id="inline-category-options">
        {categories.map(c => <option key={c.value} value={c.label} />)}
      </datalist>
    </>
  );
}