export default function InlineCategorySelect({ value, categories, onChange }) {
  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 text-xs bg-transparent hover:bg-muted rounded px-2 border-none focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer max-w-[150px]"
    >
      <option value="">— None —</option>
      {categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
    </select>
  );
}