import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, List, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import ListingFormDialog from "@/components/realestate/ListingFormDialog";

const statusStyles = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  under_negotiation: "bg-amber-50 text-amber-700 border-amber-200",
  sold: "bg-slate-100 text-slate-500 border-slate-200",
  leased: "bg-purple-50 text-purple-700 border-purple-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  online: "bg-cyan-50 text-cyan-700 border-cyan-200",
  inquiry: "bg-indigo-50 text-indigo-700 border-indigo-200",
  rejected: "bg-red-50 text-red-700 border-red-200",
  declined: "bg-orange-50 text-orange-700 border-orange-200",
  impasse: "bg-yellow-50 text-yellow-700 border-yellow-200",
};

const fmt = (n) => n ? `₱${Number(n).toLocaleString()}` : "—";

export default function Listings() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["property-listings"],
    queryFn: () => base44.entities.PropertyListing.list("-created_date", 200),
  });

  const { data: units = [] } = useQuery({
    queryKey: ["condo-units"],
    queryFn: () => base44.entities.CondoUnit.list("-created_date", 200),
  });

  // When a listing is marked sold/leased, auto-update all linked CondoUnit statuses
  const cascadeUnitStatus = async (data) => {
    if (!data.units?.length) return;
    if (data.status === "sold" || data.status === "leased") {
      await Promise.all(data.units.map(u => base44.entities.CondoUnit.update(u.unit_id, { status: data.status })));
      queryClient.invalidateQueries({ queryKey: ["condo-units"] });
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const listing = await base44.entities.PropertyListing.create(data);
      await cascadeUnitStatus(data);
      return listing;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["property-listings"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const listing = await base44.entities.PropertyListing.update(id, data);
      await cascadeUnitStatus(data);
      return listing;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["property-listings"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PropertyListing.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["property-listings"] }),
  });

  const filtered = listings.filter(l => {
    const matchType = typeFilter === "all" || l.listing_type === typeFilter;
    const matchStatus = statusFilter === "all" || l.status === statusFilter;
    return matchType && matchStatus;
  });

  const activeForSale = listings.filter(l => l.listing_type === "for_sale" && l.status === "active").length;
  const activeForLease = listings.filter(l => l.listing_type === "for_lease" && l.status === "active").length;
  const closed = listings.filter(l => ["sold", "leased"].includes(l.status)).length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Listings</h1>
          <p className="text-muted-foreground mt-1">{listings.length} total listings</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> New Listing
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-emerald-200 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Active For Sale</p>
          <p className="text-2xl font-bold text-emerald-600">{activeForSale}</p>
        </div>
        <div className="bg-card border border-blue-200 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Active For Lease</p>
          <p className="text-2xl font-bold text-blue-600">{activeForLease}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Closed Deals</p>
          <p className="text-2xl font-bold text-foreground">{closed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="for_sale">For Sale</SelectItem>
            <SelectItem value="for_lease">For Lease</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="under_negotiation">Under Negotiation</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="leased">Leased</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="inquiry">Inquiry</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="declined">Declined</SelectItem>
            <SelectItem value="impasse">Impasse</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-16">
          <List className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No listings found</p>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                {["Unit", "Type", "Asking Price", "Buyer/Tenant", "Agent", "Date Listed", "Status", "Final Price", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(l => (
                <tr key={l.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    {l.units?.length ? (
                      <>
                        <p className="font-medium">{l.units.map(u => `Unit ${u.unit_number}`).join(", ")}</p>
                        {l.units[0]?.building && <p className="text-xs text-muted-foreground">{l.units[0].building}</p>}
                      </>
                    ) : (
                      <p className="font-medium">—</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs ${l.listing_type === "for_sale" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                      {l.listing_type === "for_sale" ? "For Sale" : "For Lease"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-semibold">{fmt(l.asking_price)}</td>
                  <td className="px-4 py-3">
                    {l.buyer_tenant_name && <p>{l.buyer_tenant_name}</p>}
                    {l.buyer_tenant_contact && <p className="text-xs text-muted-foreground">{l.buyer_tenant_contact}</p>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{l.agent || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{l.date_listed ? format(new Date(l.date_listed), "MMM d, yyyy") : "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs ${statusStyles[l.status]}`}>
                      {l.status?.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-semibold text-primary">
                    {l.final_price ? fmt(l.final_price) : "—"}
                    {l.contract_attachment_url && (
                      <a href={l.contract_attachment_url} target="_blank" rel="noreferrer" className="block text-xs text-primary hover:underline mt-0.5 font-normal">View contract</a>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8" onClick={() => { setEditing(l); setShowForm(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8" onClick={() => deleteMutation.mutate(l.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ListingFormDialog
        open={showForm}
        onOpenChange={(v) => { setShowForm(v); if (!v) setEditing(null); }}
        initialData={editing}
        units={units}
        onSubmit={(data) => editing
          ? updateMutation.mutateAsync({ id: editing.id, data })
          : createMutation.mutateAsync(data)
        }
      />
    </div>
  );
}