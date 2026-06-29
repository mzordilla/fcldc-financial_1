import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Building2, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const clientTypeLabels = {
  government: "Government",
  private_corporation: "Private Corporation",
  individual: "Individual",
  ngo: "NGO",
  other: "Other",
};

const statusStyles = {
  active: "bg-primary/10 text-primary border-primary/20",
  inactive: "bg-muted text-muted-foreground border-border",
};

function ClientForm({ initial = {}, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    client_name: initial.client_name || "",
    client_code: initial.client_code || "",
    contact_person: initial.contact_person || "",
    email: initial.email || "",
    phone: initial.phone || "",
    address: initial.address || "",
    client_type: initial.client_type || "",
    status: initial.status || "active",
    notes: initial.notes || "",
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Client Name *</label>
          <Input value={form.client_name} onChange={e => set("client_name", e.target.value)} placeholder="e.g. ABC Developers" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Client Code</label>
          <Input value={form.client_code} onChange={e => set("client_code", e.target.value)} placeholder="e.g. ABC" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Client Type</label>
          <Select value={form.client_type} onValueChange={v => set("client_type", v)}>
            <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
            <SelectContent>
              {Object.entries(clientTypeLabels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Contact Person</label>
          <Input value={form.contact_person} onChange={e => set("contact_person", e.target.value)} placeholder="e.g. Juan dela Cruz" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
          <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+63 9xx xxx xxxx" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Email</label>
          <Input value={form.email} onChange={e => set("email", e.target.value)} placeholder="contact@client.com" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">Address</label>
          <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Business address" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Status</label>
          <Select value={form.status} onValueChange={v => set("status", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
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

export default function Clients() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [expandedClients, setExpandedClients] = useState({});

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("client_name", 200),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("project_name", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create(data),
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

  const toggle = (id) => setExpandedClients(p => ({ ...p, [id]: !p[id] }));

  // Group projects by client_id or client_name fallback
  const projectsByClient = {};
  projects.forEach(p => {
    const key = p.client_id || p.client_name || "unassigned";
    if (!projectsByClient[key]) projectsByClient[key] = [];
    projectsByClient[key].push(p);
  });

  const activeCount = clients.filter(c => c.status === "active").length;
  const totalContractValue = projects.reduce((s, p) => s + (p.contract_amount || 0), 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Clients</h1>
          <p className="text-muted-foreground mt-1">{clients.length} total · {activeCount} active · {projects.length} projects · ₱{totalContractValue.toLocaleString()} total contract value</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Client
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Clients</p>
          <p className="text-2xl font-bold text-foreground">{clients.length}</p>
        </div>
        <div className="bg-card border border-primary/20 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Projects</p>
          <p className="text-2xl font-bold text-primary">{projects.length}</p>
        </div>
        <div className="bg-card border border-chart-2/20 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Active Clients</p>
          <p className="text-2xl font-bold text-chart-2">{activeCount}</p>
        </div>
        <div className="bg-card border border-chart-3/20 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Contract Value</p>
          <p className="text-lg font-bold text-chart-3">₱{totalContractValue.toLocaleString()}</p>
        </div>
      </div>

      {/* Client List with nested Projects */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
        {!isLoading && clients.length === 0 && (
          <div className="text-center py-16">
            <Building2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No clients yet. Add your first client.</p>
          </div>
        )}
        {!isLoading && clients.length > 0 && (
          <table className="w-full">
            <thead className="bg-muted/30 border-b border-border">
              <tr>
                <th className="px-3 py-2 w-6"></th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Client</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Type</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Contact</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">Projects</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">Contract Value</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(client => {
                const clientProjects = projectsByClient[client.id] || projectsByClient[client.client_name] || [];
                const clientContractValue = clientProjects.reduce((s, p) => s + (p.contract_amount || 0), 0);
                const isExpanded = expandedClients[client.id] !== false;

                return (
                  <>
                    <tr
                      key={client.id}
                      className="bg-muted/20 border-t border-border cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => toggle(client.id)}
                    >
                      <td className="px-3 py-3 text-muted-foreground">
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-sm text-foreground">{client.client_name}</p>
                        {client.client_code && <p className="text-xs text-muted-foreground font-mono">{client.client_code}</p>}
                      </td>
                      <td className="px-3 py-3 hidden sm:table-cell">
                        {client.client_type && (
                          <Badge variant="secondary" className="text-xs">{clientTypeLabels[client.client_type] || client.client_type}</Badge>
                        )}
                        <Badge variant="outline" className={`text-xs ml-1 ${statusStyles[client.status] || ""}`}>{client.status}</Badge>
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell text-xs text-muted-foreground">
                        {client.contact_person && <p>{client.contact_person}</p>}
                        {client.email && <p>{client.email}</p>}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-semibold text-foreground">{clientProjects.length}</td>
                      <td className="px-3 py-3 text-right text-sm font-mono font-semibold text-primary">₱{clientContractValue.toLocaleString()}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setEditingClient(client)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(client.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                    {/* Nested Projects */}
                    {isExpanded && clientProjects.length === 0 && (
                      <tr className="border-t border-border/40">
                        <td colSpan={7} className="px-6 py-3 text-xs text-muted-foreground italic">No projects linked to this client.</td>
                      </tr>
                    )}
                    {isExpanded && clientProjects.map(p => (
                      <tr key={p.id} className="border-t border-border/30 hover:bg-muted/10 transition-colors">
                        <td className="px-3 py-2"></td>
                        <td className="px-3 py-2 pl-8" colSpan={2}>
                          <button onClick={() => navigate(`/projects/${p.id}`)} className="flex items-center gap-1 text-sm text-primary hover:underline font-medium">
                            {p.project_name} <ExternalLink className="w-3 h-3" />
                          </button>
                          <p className="text-xs text-muted-foreground font-mono">{p.project_code}</p>
                        </td>
                        <td className="px-3 py-2 hidden md:table-cell">
                          <Badge variant="outline" className="text-xs">{(p.contract_status || "pending").replace(/_/g, " ")}</Badge>
                        </td>
                        <td className="px-3 py-2 text-right text-xs text-muted-foreground">{p.completed_percentage || 0}%</td>
                        <td className="px-3 py-2 text-right text-xs font-mono font-semibold text-foreground">₱{(p.contract_amount || 0).toLocaleString()}</td>
                        <td></td>
                      </tr>
                    ))}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>New Client</DialogTitle></DialogHeader>
          <ClientForm onSubmit={(data) => createMutation.mutateAsync(data)} onCancel={() => setShowAdd(false)} loading={createMutation.isPending} />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
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