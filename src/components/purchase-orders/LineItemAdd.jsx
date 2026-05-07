import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function LineItemAdd({ onAdd }) {
  const [item, setItem] = useState({ description: "", quantity: "", cost_per_item: "" });

  const handleAdd = () => {
    if (item.description && item.quantity && item.cost_per_item) {
      const qty = parseFloat(item.quantity) || 0;
      const cost = parseFloat(item.cost_per_item) || 0;
      onAdd({
        description: item.description,
        quantity: qty,
        cost_per_item: cost,
        total: qty * cost,
      });
      setItem({ description: "", quantity: "", cost_per_item: "" });
    }
  };

  return (
    <div className="space-y-2 p-3 bg-muted/30 rounded-lg">
      <div className="grid grid-cols-3 gap-2">
        <Input
          placeholder="Item description"
          value={item.description}
          onChange={(e) => setItem({ ...item, description: e.target.value })}
          className="text-xs h-8"
        />
        <Input
          placeholder="Quantity"
          type="number"
          step="0.01"
          value={item.quantity}
          onChange={(e) => setItem({ ...item, quantity: e.target.value })}
          className="text-xs h-8"
        />
        <Input
          placeholder="Cost per item"
          type="number"
          step="0.01"
          value={item.cost_per_item}
          onChange={(e) => setItem({ ...item, cost_per_item: e.target.value })}
          className="text-xs h-8"
        />
      </div>
      <Button
        type="button"
        size="sm"
        onClick={handleAdd}
        className="w-full text-xs h-8"
      >
        <Plus className="w-3 h-3 mr-1" /> Add Item
      </Button>
    </div>
  );
}