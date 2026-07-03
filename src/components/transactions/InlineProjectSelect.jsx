import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function InlineProjectSelect({ value, projects, onChange }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="text-left">
        {value ? (
          <Badge variant="secondary" className="text-xs hover:opacity-80">{value}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground hover:underline">Set project</span>
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
      className="h-7 text-xs bg-transparent hover:bg-muted rounded px-2 border border-input focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer max-w-[170px]"
    >
      <option value="">— None —</option>
      {projects.map(p => (
        <option key={p.id} value={p.project_code}>{p.project_code}</option>
      ))}
    </select>
  );
}