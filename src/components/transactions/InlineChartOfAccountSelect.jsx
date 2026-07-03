export default function InlineChartOfAccountSelect({ value, accounts, onChange }) {
  const activeAccounts = accounts.filter(a => a.is_active !== false);
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 text-xs bg-transparent hover:bg-muted rounded px-2 border-none focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer max-w-[170px]"
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