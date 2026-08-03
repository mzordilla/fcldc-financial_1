import { statusLabels } from "@/components/realestate/buildingMapConfig";

const statusClasses = {
  sold: "border-slate-400 bg-slate-100 text-slate-700",
  leased: "border-purple-300 bg-purple-50 text-purple-700",
  available_for_sale: "border-emerald-300 bg-emerald-50 text-emerald-700",
  available_for_lease: "border-blue-300 bg-blue-50 text-blue-700",
  reserved: "border-amber-300 bg-amber-50 text-amber-700",
  under_renovation: "border-orange-300 bg-orange-50 text-orange-700",
};

export default function BuildingMapUnit({ unit, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(unit)}
      className={`min-h-20 min-w-32 rounded-lg border p-3 text-left transition-shadow hover:shadow-md ${statusClasses[unit.status] || "border-border bg-muted text-foreground"}`}
      aria-label={`Unit ${unit.unit_number}, ${statusLabels[unit.status] || unit.status}`}
    >
      <p className="font-bold">Unit {unit.unit_number}</p>
      <p className="mt-1 text-xs font-medium">{statusLabels[unit.status] || unit.status}</p>
    </button>
  );
}