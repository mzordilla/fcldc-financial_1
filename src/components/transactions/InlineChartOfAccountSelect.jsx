import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function InlineChartOfAccountSelect({ value, accounts, onChange }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");

  if (!editing) {
    return (
      <button type="button" onClick={() => { setText(value || ""); setEditing(true); }} className="text-left">
        {value ? (
          <Badge variant="secondary" className="text-xs hover:opacity-80">{value}</Badge>
        ) : (
          <span className="text-xs text-muted-foreground hover:underline">Set account</span>
        )}
      </button>
    );
  }

  const activeAccounts = accounts.filter(a => a.is_active !== false);

  const commit = (raw) => {
    const q = (raw || "").trim().toLowerCase();
    if (!q) { onChange(""); setEditing(false); return; }
    const match = activeAccounts.find(a => a.account_name.toLowerCase() === q || (a.account_code && `${a.account_code} — ${a.account_name}`.toLowerCase() === q));
    if (match) onChange(match.account_name);
    setEditing(false);
  };

  return (
    <>
      <input
        list="inline-coa-options"
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(text); } if (e.key === "Escape") setEditing(false); }}
        className="h-7 text-xs bg-transparent hover:bg-muted rounded px-2 border border-input focus:outline-none focus:ring-1 focus:ring-ring max-w-[170px]"
      />
      <datalist id="inline-coa-options">
        {activeAccounts.map(a => (
          <option key={a.id} value={a.account_code ? `${a.account_code} — ${a.account_name}` : a.account_name} />
        ))}
      </datalist>
    </>
  );
}