import { statusLabels } from "@/components/realestate/buildingMapConfig";

const statusClasses = {
  sold: "text-slate-600", leased: "text-violet-600", available_for_sale: "text-emerald-600",
  available_for_lease: "text-blue-600", reserved: "text-amber-600", under_renovation: "text-orange-600",
};

export default function BuildingMapUnit({ unit, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(unit)}
      className="grid min-h-16 min-w-0 grid-cols-2 items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
      aria-label={`Unit ${unit.unit_number}, ${statusLabels[unit.status] || unit.status}`}
    >
      <span className="min-w-0 border-r border-slate-200 pr-2 dark:border-slate-700"><span className="block text-[10px] text-muted-foreground">Unit number</span><span className="block truncate text-base font-medium text-foreground">{unit.unit_number}</span></span>
      <span className="min-w-0 pl-2"><span className="block text-[10px] text-muted-foreground">Unit status</span><span className={`block text-[11px] font-semibold leading-tight sm:text-sm ${statusClasses[unit.status] || "text-foreground"}`}>{statusLabels[unit.status] || unit.status}</span></span>
    </button>
  );
}