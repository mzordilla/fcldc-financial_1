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
    <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
      <div className="grid grid-cols-[1fr_80px_100px_120px] gap-2">
        {/* Description with autocomplete */}
        <div className="relative" ref={wrapperRef}>
          <Input
            placeholder="Item description"
            value={item.description}
            onChange={(e) => {setItem({ ...item, description: e.target.value });setShowSuggestions(true);}}
            onFocus={() => setShowSuggestions(true)}
            className="text-xs h-8 pt-1 pr-3 pb-1 pl-2"
            autoComplete="off" />
          
          {showSuggestions && filteredSuggestions.length > 0 &&
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-52 overflow-y-auto">
              {filteredSuggestions.map((s, i) =>
            <button
              key={i}
              type="button"
              className="w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors border-b border-border/50 last:border-0"
              onMouseDown={() => handleSelect(s)}>
              
                  <div className="font-medium text-foreground truncate">{s.description}</div>
                  <div className="text-muted-foreground">
                    Last cost: ₱{(s.cost_per_item || 0).toLocaleString()} · {s.supplier_name}
                  </div>
                </button>
            )}
            </div>
          }
        </div>
        <Input
          placeholder="Qty"
          type="number"
          step="0.01"
          value={item.quantity}
          onChange={(e) => setItem({ ...item, quantity: e.target.value })}
          className="text-xs h-8" />
        
        <Select value={item.unit_of_measure} onValueChange={(v) => setItem({ ...item, unit_of_measure: v })}>
          <SelectTrigger className="text-xs h-8">
            <SelectValue placeholder="Unit" />
          </SelectTrigger>
          <SelectContent className="max-h-60">
            {UNIT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Input
          placeholder="Cost per item"
          type="number"
          step="0.01"
          value={item.cost_per_item}
          onChange={(e) => setItem({ ...item, cost_per_item: e.target.value })}
          className="text-xs h-8" />
        
      </div>
      <Button
        type="button"
        size="sm"
        onClick={handleAdd}
        className="w-full text-xs h-8">
        
        <Plus className="w-3 h-3 mr-1" /> Add Item
      </Button>
    </div>);

}