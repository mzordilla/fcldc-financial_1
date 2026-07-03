import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Users, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays } from "date-fns";
import TenantFormDialog from "@/components/realestate/TenantFormDialog";

const statusStyles = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  expired: "bg-red-50 text-red-700 border-red-200",
  terminated: "bg-slate-100 text-slate-500 border-slate-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
};

const fmt = (n) => n ? `₱${Number(n).toLocaleString()}` : "—";

export default function Tenants() {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: tenants = [], isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => base44.entities.Tenant.list("-created_date", 200),
  });

  const { data: units = [] } = useQuery({
    queryKey: ["condo-units"],
    queryFn: () => base44.entities.CondoUnit.list("-created_date", 200),
  });

  const { data: listings = [] } = useQuery({
    queryKey: ["property-listings"],
    queryFn: () => base44.entities.PropertyListing.list("-created_date", 200),
  });

  // When a tenant is active, auto-mark the linked for_lease listing as "leased"
  // and the linked CondoUnit as "leased"
  const cascadeLeaseStatus = async (data) => {
    if (data.status !== "active" || !data.unit_id) return;
    const listing = listings.find(l => l.unit_id === data.unit_id && l.listing_type === "for_lease" && l.status !== "leased");
    if (listing) {
      await base44.entities.PropertyListing.update(listing.id, { status: "leased" });
      queryClient.invalidateQueries({ queryKey: ["property-listings"] });
    }
    await base44.entities.CondoUnit.update(data.unit_id, { status: "leased" });
    queryClient.invalidateQueries({ queryKey: ["condo-units"] });
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const tenant = await base44.entities.Tenant.create(data);
      await cascadeLeaseStatus(data);
      return tenant;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenants"] }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const tenant = await base44.entities.Tenant.update(id, data);
      await cascadeLeaseStatus(data);
      return tenant;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenants"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Tenant.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tenants"] }),
  });

  const active = tenants.filter(t => t.status === "active").length;
  const expiringSoon = tenants.filter(t => {
    if (t.status !== "active" || !t.lease_end) return false;
    return differenceInDays(new Date(t.lease_end), new Date()) <= 30;
  }).length;
  const totalMonthlyRent = tenants.filter(t => t.status === "active").reduce((s, t) => s + (t.monthly_rent || 0) + (t.association_dues || 0), 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Tenants</h1>
          <p className="text-muted-foreground mt-1">{tenants.length} total tenants</p>
        </div>
        <Button onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Tenant
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-emerald-200 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Active Leases</p>
          <p className="text-2xl font-bold text-emerald-600">{active}</p>
        </div>
        <div className="bg-card border border-amber-200 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Expiring in 30 days</p>
          <p className="text-2xl font-bold text-amber-600">{expiringSoon}</p>
        </div>
        <div className="bg-card border border-primary/20 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Monthly Rental Income</p>
          <p className="text-2xl font-bold text-primary">{fmt(totalMonthlyRent)}</p>
        </div>
      </div>

      {/* Table */}
      {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
      {!isLoading && tenants.length === 0 && (
        <div className="text-center py-16">
          <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No tenants found</p>
        </div>
      )}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                {["Tenant", "Unit", "Lease Period", "Monthly Rent", "Deposit", "Status", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tenants.map(t => {
                const daysLeft = t.lease_end ? differenceInDays(new Date(t.lease_end), new Date()) : null;
                return (
                  <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{t.full_name}</p>
                      {t.contact_number && <p className="text-xs text-muted-foreground">{t.contact_number}</p>}
                      {t.email && <p className="text-xs text-muted-foreground">{t.email}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">Unit {t.unit_number || "—"}</p>
                      {t.building && <p className="text-xs text-muted-foreground">{t.building}</p>}
                    </td>
                    <td className="px-4 py-3">
                      {t.lease_start && <p className="text-xs">{format(new Date(t.lease_start), "MMM d, yyyy")}</p>}
                      {t.lease_end && <p className="text-xs">{format(new Date(t.lease_end), "MMM d, yyyy")}</p>}
                      {daysLeft !== null && t.status === "active" && (
                        <p className={`text-xs font-medium mt-0.5 ${daysLeft <= 30 ? "text-amber-600" : "text-muted-foreground"}`}>
                          {daysLeft > 0 ? `${daysLeft}d left` : "Expired"}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary">{fmt(t.monthly_rent)}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {fmt(t.deposit_amount)}
                      {t.contract_attachment_url && (
                        <a href={t.contract_attachment_url} target="_blank" rel="noreferrer" className="block text-xs text-primary hover:underline mt-0.5">View contract</a>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs ${statusStyles[t.status]}`}>
                        {t.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8" onClick={() => { setEditing(t); setShowForm(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8" onClick={() => deleteMutation.mutate(t.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <TenantFormDialog
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