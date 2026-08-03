import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import BuildingMapUnit from "@/components/realestate/BuildingMapUnit";
import BuildingMapDetailsDialog from "@/components/realestate/BuildingMapDetailsDialog";
import { mapLegend } from "@/components/realestate/buildingMapConfig";

const groupUnits = (units) => Object.entries(units.reduce((buildings, unit) => {
  const building = unit.building?.trim() || "No Building";
  const floor = unit.floor?.trim() || "Unassigned";
  buildings[building] ||= {};
  (buildings[building][floor] ||= []).push(unit);
  return buildings;
}, {})).sort(([a], [b]) => a.localeCompare(b));

const floorRank = (floor) => {
  const value = floor.toLowerCase().trim();
  const words = { first: 1, one: 1, second: 2, two: 2, third: 3, three: 3, fourth: 4, four: 4, fifth: 5, five: 5, sixth: 6, six: 6, seventh: 7, seven: 7, eighth: 8, eight: 8 };
  const wordNumber = Object.entries(words).find(([word]) => value.includes(word))?.[1];
  const number = Number(value.match(/\d+/)?.[0]) || wordNumber || 1;
  if (value === "unassigned") return 10000;
  if (value.includes("penthouse")) return 1000;
  if (value.includes("basement") || /^b\d+/.test(value)) return 4 - number;
  if (value.includes("ground")) return 4;
  return 4 + number;
};

const floorLabel = (floor) => /floor/i.test(floor) || floor === "Unassigned" ? floor : `Floor ${floor}`;

export default function BuildingMap() {
  const [selectedUnit, setSelectedUnit] = useState(null);
  const { data: units = [], isLoading } = useQuery({ queryKey: ["condo-units"], queryFn: () => base44.entities.CondoUnit.list("building", 200) });
  const buildings = groupUnits(units);

  if (isLoading) return <p className="py-12 text-center text-muted-foreground">Loading building map...</p>;
  if (!units.length) return <p className="py-12 text-center text-muted-foreground">No units available to map.</p>;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-3">{mapLegend.map((item) => <div key={item.status} className="flex items-center gap-2 text-xs"><span className={`h-3 w-3 rounded-sm border ${item.className}`} />{item.label}</div>)}</div>
      {buildings.map(([building, floors]) => (
        <section key={building} className="overflow-x-auto rounded-xl border bg-card">
          <div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-3"><Building2 className="h-5 w-5 text-primary" /><h2 className="font-semibold">{building}</h2></div>
          <div className="divide-y">{Object.entries(floors).sort(([a], [b]) => floorRank(a) - floorRank(b)).map(([floor, floorUnits]) => (
            <div key={floor} className="flex min-w-max gap-3 p-4"><p className="w-28 shrink-0 pt-3 text-sm font-semibold text-muted-foreground">{floorLabel(floor)}</p><div className="flex flex-nowrap gap-3">{floorUnits.sort((a, b) => String(a.unit_number).localeCompare(String(b.unit_number), undefined, { numeric: true })).map((unit) => <BuildingMapUnit key={unit.id} unit={unit} onSelect={setSelectedUnit} />)}</div></div>
          ))}</div>
        </section>
      ))}
      <BuildingMapDetailsDialog unit={selectedUnit} onClose={() => setSelectedUnit(null)} />
    </div>
  );
}