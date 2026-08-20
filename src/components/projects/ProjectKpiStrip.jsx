export default function ProjectKpiStrip({ total, approvedValue, approvedCount, active, pending }) {
  const cards = [
    { label: "Total Projects", value: total, tone: "text-slate-950 dark:text-white" },
    { label: "Approved Contract Value", value: `₱${approvedValue.toLocaleString()}`, note: `${approvedCount} contracts`, tone: "text-slate-950 dark:text-white" },
    { label: "Active Projects", value: active, tone: "text-sky-600" },
    { label: "Pending Contracts", value: pending, tone: "text-amber-500" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((card) => <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-900"><p className="text-xs font-medium text-slate-500">{card.label} —</p><p className={`mt-1 font-project-display text-2xl font-bold tracking-tight ${card.tone}`}>{card.value}</p>{card.note && <p className="mt-1 text-xs text-slate-500">{card.note}</p>}</div>)}
    </div>
  );
}