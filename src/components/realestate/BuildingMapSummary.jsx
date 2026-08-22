import { Building2 } from "lucide-react";
import { mapLegend } from "@/components/realestate/buildingMapConfig";

const valueClasses = {
  sold: "text-emerald-600", leased: "text-violet-600", available_for_sale: "text-emerald-600",
  available_for_lease: "text-blue-600", reserved: "text-amber-500", under_renovation: "text-orange-600",
};

export default function BuildingMapSummary({ units }) {
  const counts = units.reduce((result, unit) => ({ ...result, [unit.status]: (result[unit.status] || 0) + 1 }), {});
  return <section className="rounded-2xl bg-slate-200/80 p-4 sm:p-6">
    <div className="grid grid-cols-[108px_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-5">
      <div className="flex min-h-32 items-center justify-center border-b border-sky-700/30"><Building2 className="h-20 w-20 stroke-[1.1] text-sky-700 sm:h-24 sm:w-24" /></div>
      <div><h2 className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl">Building Map</h2><p className="mb-3 text-xs text-slate-600 sm:mb-4 sm:text-sm">Unit availability by building and floor</p>
        <div className="grid grid-cols-3 gap-x-2 gap-y-3 sm:gap-x-4">{mapLegend.map((item) => <div key={item.status}><p className="text-xs text-slate-700">{item.label}</p><p className={`text-xl font-bold leading-none sm:text-2xl ${valueClasses[item.status]}`}>{counts[item.status] || 0}</p></div>)}</div>
      </div>
    </div>
  </section>;
}