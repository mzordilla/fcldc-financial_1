import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function InlineCategorySelect({ value, categories, onChange }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="text-left">
        {value ? (
          <Badge variant="secondary" className="text-xs hover:opacity-80">{value.replace(/_/g, " ")}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground hover:underline">Set category</span>
        )}
      </button>
    );
  }

  return (
    <select
      autoFocus
      value={value || ""}
      onChange={(e) => { onChange(e.target.value); setEditing(false); }}
      onBlur={() => setEditing(false)}
      className="h-7 text-xs bg-transparent hover:bg-muted rounded px-2 border border-input focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer max-w-[150px]"
    >
      <option value="">— None —</option>
      {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
    </select>
  );
}