import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Users, ChevronDown, ChevronRight, Paperclip, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

function ClientForm({ initial = {}, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    client_name: initial.client_name || "",
    client_code: initial.client_code || "",
    contact_person: initial.contact_person || "",
    email: initial.email || "",
    phone: initial.phone || "",
    address: initial.address || "",
    notes: initial.notes || "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Client Name *</label>
          <Input value={form.client_name} onChange={e => set("client_name", e.target.value)} placeholder="e.g. Juan dela Cruz" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Client Code</label>
          <Input value={form.client_code} onChange={e => set("client_code", e.target.value)} placeholder="e.g. JDC" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Contact Person</label>
          <Input value={form.contact_person} onChange={e => set("contact_person", e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
          <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+63 9xx xxx xxxx" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Email</label>
          <Input value={form.email} onChange={e => set("email", e.target.value)} placeholder="contact@client.com" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Address</label>
          <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Home / business address" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
          <Input value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Optional notes" />
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSubmit(form)} disabled={!form.client_name || loading}>
          {loading ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}

export default function RealEstateClients() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [expanded, setExpanded] = useState({});

  const { data: allClients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("client_name", 200),
  });
  const clients = allClients.filter(c => c.client_category === "real_estate");

  const { data: listings = [] } = useQuery({
    queryKey: ["property_listings"],
    queryFn: () => base44.entities.PropertyListing.list("-date_listed", 500),
  });

  const listingsByClient = {};
  listings.forEach(l => {
    if (!l.client_id) return;
    if (!listingsByClient[l.client_id]) listingsByClient[l.client_id] = [];
    listingsByClient[l.client_id].push(l);
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create({ ...data, client_category: "real_estate" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); setShowAdd(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Client.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); setEditingClient(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Client.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["clients"] }),
  });

  const toggle = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Real Estate Clients</h2>
          <p className="text-muted-foreground text-sm mt-0.5">{clients.length} clients · buyers & tenants with linked contracts</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Client
        </Button>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
        {!isLoading && clients.length === 0 && (
          <div className="text-center py-16">
            <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No real estate clients yet. Add your first client.</p>
          </div>
        )}
        {!isLoading && clients.map(client => {
          const clientListings = listingsByClient[client.id] || [];
          const isExpanded = !!expanded[client.id];
          return (
            <div key={client.id} className="border-t border-border first:border-t-0">
              <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                onClick={() => toggle(client.id)}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  <div>
                    <p className="font-semibold text-sm text-foreground">{client.client_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {client.client_code ? `${client.client_code} · ` : ""}{client.contact_person || client.email || client.phone || "No contact info"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs">
                    <FileText className="w-3 h-3 mr-1" /> {clientListings.filter(l => l.contract_attachment_url).length} contract(s)
                  </Badge>
                  <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setEditingClient(client)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(client.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
              {isExpanded && (
                <div className="px-4 pb-4 pl-10 space-y-2">
                  {clientListings.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">No listings linked to this client.</p>
                  )}
                  {clientListings.map(listing => (
                    <div key={listing.id} className="flex items-center justify-between bg-muted/20 rounded-lg px-3 py-2">
                      <div className="text-sm">
                        <p className="font-medium text-foreground">
                          {(listing.units || []).map(u => u.unit_number).filter(Boolean).join(", ") || "Unit N/A"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {listing.listing_type === "for_sale" ? "For Sale" : "For Lease"} · {listing.status}
                        </p>
                      </div>
                      {listing.contract_attachment_url ? (
                        <a
                          href={listing.contract_attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                        >
                          <Paperclip className="w-3.5 h-3.5" /> View Contract
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground">No contract uploaded</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Real Estate Client</DialogTitle></DialogHeader>
          <ClientForm onSubmit={(data) => createMutation.mutateAsync(data)} onCancel={() => setShowAdd(false)} loading={createMutation.isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingClient} onOpenChange={(v) => { if (!v) setEditingClient(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Client</DialogTitle></DialogHeader>
          {editingClient && (
            <ClientForm initial={editingClient} onSubmit={(data) => updateMutation.mutateAsync({ id: editingClient.id, data })} onCancel={() => setEditingClient(null)} loading={updateMutation.isPending} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}