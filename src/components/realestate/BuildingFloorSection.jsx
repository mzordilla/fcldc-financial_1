import BuildingMapUnit from "@/components/realestate/BuildingMapUnit";

export default function BuildingFloorSection({ floor, label, units, onSelect }) {
  const sortedUnits = [...units].sort((a, b) => String(a.unit_number).localeCompare(String(b.unit_number), undefined, { numeric: true }));
  return <div className="relative">
    <span className="absolute bottom-0 left-2 top-8 border-l-2 border-orange-600" />
    <span className="absolute left-2 top-12 w-3 border-t-2 border-orange-600" />
    <div className="mb-2 flex h-8 items-center justify-between bg-slate-200/80 px-4 text-slate-950">
      <h3 className="text-base font-semibold">{label}</h3><span className="flex items-center gap-2 text-xs"><span className="h-px w-12 bg-slate-300" />{units.length}</span>
    </div>
    <div className="grid grid-cols-2 gap-2 pb-4 pl-8 sm:pl-9 lg:grid-cols-3 xl:grid-cols-4">{sortedUnits.map((unit) => <BuildingMapUnit key={unit.id} unit={unit} onSelect={onSelect} />)}</div>
  </div>;
}