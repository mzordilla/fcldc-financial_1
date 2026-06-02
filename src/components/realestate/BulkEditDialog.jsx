import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

const statusLabels = {
  available_for_sale: "For Sale",
  available_for_lease: "For Lease",
  sold: "Sold",
  leased: "Leased",
  reserved: "Reserved",
  under_renovation: "Renovation",
};

export default function BulkEditDialog({ open, onOpenChange, units, onSubmit }) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editMode, setEditMode] = useState("status"); // "status" or "price"
  const [newStatus, setNewStatus] = useState("");
  const [newPricePerSqm, setNewPricePerSqm] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (open) {
      setSelectedIds(new Set());
      setEditMode("status");
      setNewStatus("");
      setNewPricePerSqm("");
    }
  }, [open]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === units.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(units.map(u => u.id)));
    }
  };

  const handleSubmit = async () => {
    if (selectedIds.size === 0) return;
    
    setUpdating(true);
    const updates = [];
    
    if (editMode === "status" && newStatus) {
      updates.push(...Array.from(selectedIds).map(id => ({
        id,
        data: { status: newStatus }
      })));
    } else if (editMode === "price" && newPricePerSqm) {
      updates.push(...Array.from(selectedIds).map(id => ({
        id,
        data: { 
          price_per_sqm: Number(newPricePerSqm),
          selling_price: units.find(u => u.id === id)?.area_sqm * Number(newPricePerSqm)
        }
      })));
    }

    await Promise.all(updates.map(update => onSubmit(update)));
    setUpdating(false);
    onOpenChange(false);
  };

  const selectedCount = selectedIds.size;
  const canSubmit = (editMode === "status" && newStatus) || (editMode === "price" && newPricePerSqm);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Edit Units</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Selection */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedIds.size === units.length && units.length > 0}
                  onCheckedChange={toggleSelectAll}
                  id="select-all-bulk"
                />
                <label htmlFor="select-all-bulk" className="text-sm font-medium cursor-pointer">
                  Select all {units.length} units
                </label>
              </div>
              <span className="text-sm text-muted-foreground">
                {selectedCount} selected
              </span>
            </div>
            
            {selectedCount > 0 && (
              <div className="flex flex-wrap gap-1">
                {Array.from(selectedIds).slice(0, 8).map(id => {
                  const unit = units.find(u => u.id === id);
                  return unit ? (
                    <Badge key={id} variant="secondary" className="text-xs">
                      {unit.unit_number}
                    </Badge>
                  ) : null;
                })}
                {selectedCount > 8 && (
                  <Badge variant="secondary" className="text-xs">+{selectedCount - 8} more</Badge>
                )}
              </div>
            )}
          </div>

          {/* Edit Mode Selection */}
          <div className="space-y-3">
            <Label>What would you like to update?</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setEditMode("status")}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  editMode === "status"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <p className="font-semibold text-foreground">Update Status</p>
                <p className="text-sm text-muted-foreground">Change status for selected units</p>
              </button>
              <button
                onClick={() => setEditMode("price")}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  editMode === "price"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <p className="font-semibold text-foreground">Update Price/sqm</p>
                <p className="text-sm text-muted-foreground">Set new price per square meter</p>
              </button>
            </div>
          </div>

          {/* Edit Fields */}
          {editMode === "status" ? (
            <div className="space-y-2">
              <Label>New Status *</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available_for_sale">Available for Sale</SelectItem>
                  <SelectItem value="available_for_lease">Available for Lease</SelectItem>
                  <SelectItem value="reserved">Reserved</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="leased">Leased</SelectItem>
                  <SelectItem value="under_renovation">Under Renovation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Price per sqm (₱) *</Label>
              <Input
                type="number"
                value={newPricePerSqm}
                onChange={e => setNewPricePerSqm(e.target.value)}
                placeholder="Enter price per square meter"
              />
              <p className="text-xs text-muted-foreground">
                This will also auto-calculate the selling price (area × price/sqm)
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!canSubmit || selectedCount === 0 || updating}
          >
            {updating ? "Updating..." : `Update ${selectedCount} Unit${selectedCount !== 1 ? "s" : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}