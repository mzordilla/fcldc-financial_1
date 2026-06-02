import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function LineItemAdd({ onAdd, suggestions = [] }) {
  const [item, setItem] = useState({ description: "", quantity: "", cost_per_item: "" });
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
        cost_per_item: cost,
        total: qty * cost
      });
      setItem({ description: "", quantity: "", cost_per_item: "" });
    }
  };

  return (
    <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
      <div className="grid grid-cols-3 gap-2">
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
          placeholder="Quantity"
          type="number"
          step="0.01"
          value={item.quantity}
          onChange={(e) => setItem({ ...item, quantity: e.target.value })}
          className="text-xs h-8" />
        
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