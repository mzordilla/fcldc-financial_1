import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function InlineChartOfAccountSelect({ value, accounts, onChange }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button type="button" onClick={() => setEditing(true)} className="text-left">
        {value ? (
          <Badge variant="secondary" className="text-xs hover:opacity-80">{value}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground hover:underline">Set account</span>
        )}
      </button>
    );
  }

  const activeAccounts = accounts.filter(a => a.is_active !== false);
  return (
    <select
      autoFocus
      value={value || ""}
      onChange={(e) => { onChange(e.target.value); setEditing(false); }}
      onBlur={() => setEditing(false)}
      className="h-7 text-xs bg-transparent hover:bg-muted rounded px-2 border border-input focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer max-w-[170px]"
    >
      <option value="">— None —</option>
      {activeAccounts.map(a => (
        <option key={a.id} value={a.account_name}>
          {a.account_code ? `${a.account_code} — ` : ""}{a.account_name}
        </option>
      ))}
    </select>
  );
}