import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { statusLabels } from "@/components/realestate/buildingMapConfig";

const fmt = (value) => value ? `₱${Number(value).toLocaleString()}` : "—";

export default function BuildingMapDetailsDialog({ unit, onClose }) {
  return (
    <Dialog open={Boolean(unit)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Unit {unit?.unit_number}</DialogTitle></DialogHeader>
        {unit && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-muted-foreground">Building</p><p className="font-medium">{unit.building || "—"}</p></div>
            <div><p className="text-muted-foreground">Floor</p><p className="font-medium">{unit.floor || "—"}</p></div>
            <div><p className="text-muted-foreground">Type</p><p className="font-medium uppercase">{unit.unit_type || "—"}</p></div>
            <div><p className="text-muted-foreground">Area</p><p className="font-medium">{unit.area_sqm ? `${unit.area_sqm} sqm` : "—"}</p></div>
            <div><p className="text-muted-foreground">Selling Price</p><p className="font-medium">{fmt(unit.selling_price)}</p></div>
            <div><p className="text-muted-foreground">Monthly Rent</p><p className="font-medium">{fmt(unit.monthly_rent)}</p></div>
            <div className="col-span-2"><p className="mb-1 text-muted-foreground">Status</p><Badge variant="outline">{statusLabels[unit.status] || unit.status}</Badge></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}