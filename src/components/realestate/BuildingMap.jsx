import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import BuildingMapSummary from "@/components/realestate/BuildingMapSummary";
import BuildingFloorSection from "@/components/realestate/BuildingFloorSection";
import BuildingMapDetailsDialog from "@/components/realestate/BuildingMapDetailsDialog";

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
    <div className="mx-auto max-w-5xl space-y-7 pb-4">
      <BuildingMapSummary units={units} />
      {buildings.map(([building, floors]) => {
        const floorEntries = Object.entries(floors).sort(([a], [b]) => floorRank(b) - floorRank(a));
        const unitCount = floorEntries.reduce((sum, [, floorUnits]) => sum + floorUnits.length, 0);
        return <section key={building}>
          <div className="mb-3 flex items-end justify-between gap-4 px-1"><h2 className="text-2xl font-bold tracking-tight text-teal-900 dark:text-teal-300">{building}</h2><p className="shrink-0 text-sm text-muted-foreground">{unitCount} unit{unitCount !== 1 ? "s" : ""}</p></div>
          <div>{floorEntries.map(([floor, floorUnits]) => <BuildingFloorSection key={floor} floor={floor} label={floorLabel(floor)} units={floorUnits} onSelect={setSelectedUnit} />)}</div>
        </section>;
      })}
      <BuildingMapDetailsDialog unit={selectedUnit} onClose={() => setSelectedUnit(null)} />
    </div>
  );
}