import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Building2, Pencil, Trash2, Home, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import UnitFormDialog from "@/components/realestate/UnitFormDialog";
import BulkEditDialog from "@/components/realestate/BulkEditDialog";

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
  parking: "Parking",
};

const fmt = (n) => n ? `₱${Number(n).toLocaleString()}` : "—";

export default function CondoUnits() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
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

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CondoUnit.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["condo-units"] }),
  });

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(u => u.id)));
    }
  };

  const filtered = statusFilter === "all" ? units : units.filter(u => u.status === statusFilter);

  const totalArea = filtered.reduce((s, u) => s + (u.area_sqm || 0), 0);
  const totalSellingPrice = filtered.reduce((s, u) => s + (u.selling_price || 0), 0);
  const totalMonthlyRent = filtered.reduce((s, u) => s + (u.monthly_rent || 0), 0);
  const totalParking = filtered.reduce((s, u) => s + (u.parking_slots || 0), 0);

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

      {/* Filter and Bulk Actions */}
      <div className="flex items-center justify-between gap-3">
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
          {filtered.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowBulkEdit(true)}
              disabled={selectedIds.size === 0}
            >
              <Square className="w-4 h-4 mr-2" />
              Bulk Edit {selectedIds.size > 0 && `(${selectedIds.size})`}
            </Button>
          )}
        </div>
        {selectedIds.size > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear selection
          </Button>
        )}
      </div>

      {/* List Table */}
      {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16">
          <Home className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No units found</p>
        </div>
      )}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.size === filtered.length && filtered.length > 0}
                  onCheckedChange={toggleSelectAll}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Building</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Parking</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Price/sqm</TableHead>
              <TableHead>Selling Price</TableHead>
              <TableHead>Monthly Rent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(u => (
              <TableRow
                key={u.id}
                className={`hover:bg-muted/30 ${selectedIds.has(u.id) ? "bg-primary/5" : ""}`}
              >
                <TableCell>
                  <Checkbox
                    checked={selectedIds.has(u.id)}
                    onCheckedChange={() => toggleSelect(u.id)}
                  />
                </TableCell>
                <TableCell className="font-semibold">{u.unit_number}</TableCell>
                <TableCell>
                  {u.building && (
                    <div>
                      <p className="text-sm">{u.building}</p>
                      {u.floor && <p className="text-xs text-muted-foreground">Floor {u.floor}</p>}
                    </div>
                  )}
                </TableCell>
                <TableCell>{u.unit_type ? typeLabels[u.unit_type] : "—"}</TableCell>
                <TableCell>
                  {u.parking_slots ? (
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-foreground">{u.parking_slots}</span>
                      <span className="text-xs text-muted-foreground">slot{u.parking_slots > 1 ? "s" : ""}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>{u.area_sqm ? `${u.area_sqm} sqm` : "—"}</TableCell>
                <TableCell>{u.price_per_sqm ? fmt(u.price_per_sqm) : "—"}</TableCell>
                <TableCell>
                  {u.selling_price ? (
                    <div>
                      <p className="font-semibold text-emerald-700">{fmt(u.selling_price)}</p>
                      {(u.vat_percentage > 0 || u.closing_fees_percentage > 0) && (
                        <p className="text-xs text-muted-foreground">
                          {u.vat_percentage > 0 && `+${u.vat_percentage}% VAT`}
                          {u.closing_fees_percentage > 0 && ` +${u.closing_fees_percentage}% Closing`}
                        </p>
                      )}
                    </div>
                  ) : "—"}
                </TableCell>
                <TableCell>{u.monthly_rent ? `${fmt(u.monthly_rent)}/mo` : "—"}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-xs ${statusStyles[u.status]}`}>
                    {statusLabels[u.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => { setEditing(u); setShowForm(true); }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(u.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="bg-muted/50 border-t-2 border-border font-semibold text-sm">
                <td></td>
                <td className="px-4 py-3 text-foreground">{filtered.length} units</td>
                <td></td>
                <td></td>
                <td className="px-4 py-3 text-foreground">{totalParking} slots</td>
                <td className="px-4 py-3 text-foreground">{totalArea.toLocaleString()} sqm</td>
                <td></td>
                <td className="px-4 py-3 text-emerald-700">{totalSellingPrice > 0 ? fmt(totalSellingPrice) : "—"}</td>
                <td className="px-4 py-3 text-blue-700">{totalMonthlyRent > 0 ? `${fmt(totalMonthlyRent)}/mo` : "—"}</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </Table>
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

      <BulkEditDialog
        open={showBulkEdit}
        onOpenChange={setShowBulkEdit}
        units={filtered}
        onSubmit={(update) => bulkUpdateMutation.mutateAsync(update)}
      />
    </div>
  );
}