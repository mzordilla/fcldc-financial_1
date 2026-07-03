import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function InlineChartOfAccountSelect({ value, accounts, onChange }) {
  const activeAccounts = accounts.filter(a => a.is_active !== false);
  const selected = activeAccounts.find(a => a.account_name === value);
  return (
    <Select
      value={selected?.id || "none"}
      onValueChange={(v) => {
        if (v === "none") { onChange(""); return; }
        const account = activeAccounts.find(a => a.id === v);
        onChange(account?.account_name || "");
      }}
    >
      <SelectTrigger className="h-7 w-auto min-w-[130px] text-xs border-none shadow-none bg-transparent hover:bg-muted px-2 gap-1">
        <SelectValue placeholder="Set account" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">— None —</SelectItem>
        {activeAccounts.map(a => (
          <SelectItem key={a.id} value={a.id}>
            {a.account_code ? `${a.account_code} — ` : ""}{a.account_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}