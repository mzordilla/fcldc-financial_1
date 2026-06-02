import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Building2, Pencil, Trash2, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import UnitFormDialog from "@/components/realestate/UnitFormDialog";

const statusStyles = {
  available_for_sale: "bg-emerald-50 text-emerald-700 border-emerald-200",
  available_for_lease: "bg-blue-50 text-blue-700 border-blue-200",
  sold: "bg-slate-100 text-slate-500 border-slate-200",
  leased: "bg-purple-50 text-purple-700 border-purple-200",
  reserved: "bg-amber-50 text-amber-700 border-amber-200",
  under_renovation: "bg-orange-50 text-orange-700 border-orange-200",
};

const statusLabels = {
  available_for_sale: "For Sale",
  available_for_lease: "For Lease",
  sold: "Sold",
  leased: "Leased",
  reserved: "Reserved",
  under_renovation: "Renovation",
};

const typeLabels = {
  studio: "Studio",
  "1br": "1 Bedroom",
  "2br": "2 Bedrooms",
  "3br": "3 Bedrooms",
  penthouse: "Penthouse",
  commercial: "Commercial",
};

const fmt = (n) => n ? `₱${Number(n).toLocaleString()}` : "—";

export default function CondoUnits() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: units = [], isLoading } = useQuery({
    queryKey: ["condo-units"],
    queryFn: () => base44.entities.CondoUnit.list("-created_date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CondoUnit.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["condo-units"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CondoUnit.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["condo-units"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CondoUnit.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["condo-units"] }),
  });

  const filtered = statusFilter === "all" ? units : units.filter(u => u.status === statusFilter);

  const forSale = units.filter(u => u.status === "available_for_sale").length;
  const forLease = units.filter(u => u.status === "available_for_lease").length;
  const sold = units.filter(u => u.status === "sold").length;
  const leased = units.filter(u => u.status === "leased").length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Condo Units</h1>
          <p className="text-muted-foreground mt-1">{units.length} total units</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Unit
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "For Sale", value: forSale, color: "text-emerald-600" },
          { label: "For Lease", value: forLease, color: "text-blue-600" },
          { label: "Sold", value: sold, color: "text-slate-500" },
          { label: "Leased", value: leased, color: "text-purple-600" },
        ].map(k => (
          <div key={k.label} className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground mb-1">{k.label}</p>
            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available_for_sale">For Sale</SelectItem>
            <SelectItem value="available_for_lease">For Lease</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="leased">Leased</SelectItem>
            <SelectItem value="under_renovation">Renovation</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16">
          <Home className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No units found</p>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(u => (
          <div key={u.id} className="bg-card border border-border rounded-2xl p-5 hover:shadow-md transition-shadow space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold text-foreground text-lg">Unit {u.unit_number}</p>
                {u.building && <p className="text-sm text-muted-foreground">{u.building}{u.floor ? ` · Floor ${u.floor}` : ""}</p>}
              </div>
              <Badge variant="outline" className={`text-xs ${statusStyles[u.status]}`}>
                {statusLabels[u.status]}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {u.unit_type && <span className="bg-muted rounded px-2 py-0.5">{typeLabels[u.unit_type]}</span>}
              {u.area_sqm && <span className="bg-muted rounded px-2 py-0.5">{u.area_sqm} sqm</span>}
              {u.parking_slots > 0 && <span className="bg-muted rounded px-2 py-0.5">{u.parking_slots} parking</span>}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {u.selling_price && (
                <div className="bg-emerald-50 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Selling Price</p>
                  <p className="font-semibold text-emerald-700 text-sm">{fmt(u.selling_price)}</p>
                </div>
              )}
              {u.monthly_rent && (
                <div className="bg-blue-50 rounded-lg p-2">
                  <p className="text-xs text-muted-foreground">Monthly Rent</p>
                  <p className="font-semibold text-blue-700 text-sm">{fmt(u.monthly_rent)}/mo</p>
                </div>
              )}
            </div>

            {u.description && <p className="text-xs text-muted-foreground line-clamp-2">{u.description}</p>}

            <div className="flex justify-end gap-1 pt-1 border-t border-border">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => { setEditing(u); setShowForm(true); }}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(u.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <UnitFormDialog
        open={showForm}
        onOpenChange={(v) => { setShowForm(v); if (!v) setEditing(null); }}
        initialData={editing}
        onSubmit={(data) => editing
          ? updateMutation.mutateAsync({ id: editing.id, data })
          : createMutation.mutateAsync(data)
        }
      />
    </div>
  );
}