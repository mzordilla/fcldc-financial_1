import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

const UNIT_OPTIONS = [
  { value: "pcs", label: "Pieces (pcs)" },
  { value: "kg", label: "Kilograms (kg)" },
  { value: "g", label: "Grams (g)" },
  { value: "lb", label: "Pounds (lb)" },
  { value: "oz", label: "Ounces (oz)" },
  { value: "m", label: "Meters (m)" },
  { value: "cm", label: "Centimeters (cm)" },
  { value: "ft", label: "Feet (ft)" },
  { value: "in", label: "Inches (in)" },
  { value: "L", label: "Liters (L)" },
  { value: "mL", label: "Milliliters (mL)" },
  { value: "gal", label: "Gallons (gal)" },
  { value: "box", label: "Box" },
  { value: "set", label: "Set" },
  { value: "pair", label: "Pair" },
  { value: "dozen", label: "Dozen" },
  { value: "roll", label: "Roll" },
  { value: "sheet", label: "Sheet" },
  { value: "bag", label: "Bag" },
  { value: "sack", label: "Sack" },
  { value: "pail", label: "Pail" },
  { value: "drum", label: "Drum" },
  { value: "bundle", label: "Bundle" },
  { value: "carton", label: "Carton" },
  { value: "crate", label: "Crate" },
  { value: "pallet", label: "Pallet" },
  { value: "lot", label: "Lot" },
  { value: "hr", label: "Hours (hr)" },
  { value: "day", label: "Days" },
  { value: "month", label: "Months" },
  { value: "sqm", label: "Square Meters (sqm)" },
  { value: "sqft", label: "Square Feet (sqft)" },
  { value: "cu.m", label: "Cubic Meters (cu.m)" },
  { value: "cu.ft", label: "Cubic Feet (cu.ft)" },
  { value: "unit", label: "Unit" },
  { value: "pack", label: "Pack" },
  { value: "can", label: "Can" },
  { value: "quart", label: "Quart" },
  { value: "bottle", label: "Bottle" },
  { value: "tube", label: "Tube" },
  { value: "linear_meter", label: "Linear Meter" },
  { value: "cylinder", label: "Cylinder" },
  { value: "ream", label: "Ream" },
  { value: "other", label: "Other" },
];

export default function LineItemAdd({ onAdd, suggestions = [] }) {
  const [item, setItem] = useState({ description: "", quantity: "", cost_per_item: "", unit_of_measure: "pcs" });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filteredSuggestions = item.description.trim() ?
  suggestions.filter((s) =>
  s.description.toLowerCase().includes(item.description.toLowerCase())
  ).slice(0, 8) :
  suggestions.slice(0, 8);

  const handleSelect = (suggestion) => {
    setItem({
      description: suggestion.description,
      quantity: item.quantity || "",
      cost_per_item: suggestion.cost_per_item ? String(suggestion.cost_per_item) : ""
    });
    setShowSuggestions(false);
  };

  const handleAdd = () => {
    if (item.description && item.quantity && item.cost_per_item) {
      const qty = parseFloat(item.quantity) || 0;
      const cost = parseFloat(item.cost_per_item) || 0;
      onAdd({
        description: item.description,
        quantity: qty,
        unit_of_measure: item.unit_of_measure,
        cost_per_item: cost,
        total: qty * cost
      });
      setItem({ description: "", quantity: "", cost_per_item: "", unit_of_measure: "pcs" });
    }
  };

  return (
    <div className="border-t border-slate-300 bg-white p-2">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_64px_80px_112px_36px]">
        <div className="relative" ref={wrapperRef}>
          <Input
            placeholder="Search previous purchases or enter an item"
            value={item.description}
            onChange={(e) => {setItem({ ...item, description: e.target.value });setShowSuggestions(true);}}
            onFocus={() => setShowSuggestions(true)}
            className="h-8 rounded-sm border-slate-300 px-2 text-xs shadow-none"
            autoComplete="off" />
          {showSuggestions &&
          <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-sm border border-slate-300 bg-popover shadow-lg">
              <div className="border-b border-border bg-muted/60 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Previous purchases</div>
              {filteredSuggestions.length > 0 ? filteredSuggestions.map((s, i) =>
            <button key={i} type="button" className="w-full border-b border-border/50 px-3 py-2 text-left text-xs transition-colors last:border-0 hover:bg-muted" onMouseDown={() => handleSelect(s)}>
                  <div className="truncate font-medium text-foreground">{s.description}</div>
                  <div className="text-muted-foreground">Last cost: ₱{(s.cost_per_item || 0).toLocaleString()} · {s.supplier_name}</div>
                </button>
            ) : <div className="px-3 py-2 text-xs text-muted-foreground">No matching previous purchases. Continue typing to add a new item.</div>}
            </div>
          }
        </div>
        <Input placeholder="Qty" type="number" step="0.01" value={item.quantity} onChange={(e) => setItem({ ...item, quantity: e.target.value })} className="h-8 rounded-sm border-slate-300 text-xs shadow-none" />
        <Select value={item.unit_of_measure} onValueChange={(v) => setItem({ ...item, unit_of_measure: v })}>
          <SelectTrigger className="h-8 rounded-sm border-slate-300 text-xs shadow-none"><SelectValue placeholder="Unit" /></SelectTrigger>
          <SelectContent className="max-h-60">{UNIT_OPTIONS.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
        </Select>
        <Input placeholder="Cost/Item" type="number" step="0.01" value={item.cost_per_item} onChange={(e) => setItem({ ...item, cost_per_item: e.target.value })} className="h-8 rounded-sm border-slate-300 text-xs shadow-none" />
        <Button type="button" size="icon" onClick={handleAdd} className="h-8 w-8 rounded-sm" title="Add item" aria-label="Add item"><Plus className="h-3.5 w-3.5" /></Button>
      </div>
    </div>);

}