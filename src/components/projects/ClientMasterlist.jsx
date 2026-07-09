import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Pencil, Trash2, Building2, ChevronDown, ChevronRight, ExternalLink, TrendingUp, TrendingDown, FileText } from "lucide-react";
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

const contractStatusStyles = {
  pending: "bg-muted text-muted-foreground border-border",
  approved: "bg-primary/10 text-primary border-primary/20",
  active: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  completed: "bg-muted text-muted-foreground border-border",
  on_hold: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
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

// Per-project row: shows contracts + CCV computed from approved COs
function ProjectContractRow({ project, contracts, changeOrders }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);

  // Per-contract CCV
  const contractsWithCCV = contracts.map(contract => {
    const contractCOs = changeOrders.filter(co => co.contract_id === contract.id);
    const approved = contractCOs.filter(co => co.status === "approved");
    const adds = approved.filter(co => co.co_type === "additive").reduce((s, co) => s + (co.amount || 0), 0);
    const deds = approved.filter(co => co.co_type === "deductive").reduce((s, co) => s + (co.amount || 0), 0);
    return { ...contract, _ccv: (contract.original_contract_amount || 0) + adds - deds, _netAdj: adds - deds, _approvedCOs: approved.length };
  });

  const totalCCV = contractsWithCCV.reduce((s, c) => s + c._ccv, 0);
  const totalOriginal = contracts.reduce((s, c) => s + (c.original_contract_amount || 0), 0);
  const netAdj = totalCCV - totalOriginal;

  return (
    <>
      <tr
        className="border-t border-border/30 hover:bg-muted/10 transition-colors cursor-pointer"
        onClick={() => contracts.length > 0 && setExpanded(e => !e)}
      >
        <td className="px-3 py-2.5 pl-8">
          <button
            onClick={e => { e.stopPropagation(); navigate(`/projects/${project.id}`); }}
            className="flex items-center gap-1 text-sm text-primary hover:underline font-medium"
          >
            {project.project_name} <ExternalLink className="w-3 h-3" />
          </button>
          <p className="text-xs text-muted-foreground font-mono">{project.project_code}</p>
        </td>
        <td className="px-3 py-2.5 hidden md:table-cell">
          <Badge variant="outline" className={`text-xs ${contractStatusStyles[project.contract_status] || ""}`}>
            {(project.contract_status || "pending").replace(/_/g, " ")}
          </Badge>
        </td>
        <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">
          {contracts.length > 0 ? (
            <span className="flex items-center justify-center gap-1">
              <FileText className="w-3 h-3" /> {contracts.length}
              {contracts.length > 0 && (expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)}
            </span>
          ) : "—"}
        </td>
        <td className="px-3 py-2.5 text-right text-xs font-mono text-foreground">
          ₱{totalOriginal.toLocaleString()}
        </td>
        <td className={`px-3 py-2.5 text-right text-xs font-mono font-semibold ${netAdj > 0 ? "text-primary" : netAdj < 0 ? "text-destructive" : "text-muted-foreground"}`}>
          {netAdj !== 0 ? `${netAdj > 0 ? "+" : ""}₱${netAdj.toLocaleString()}` : "—"}
        </td>
        <td className="px-3 py-2.5 text-right text-sm font-bold font-mono text-primary">
          ₱{totalCCV.toLocaleString()}
        </td>
        <td className="px-3 py-2.5 text-right text-xs text-muted-foreground">
          {project.completed_percentage || 0}%
        </td>
      </tr>
      {/* Expanded contracts */}
      {expanded && contractsWithCCV.map((contract, ci) => (
        <tr key={contract.id} className="border-t border-border/20 bg-muted/5">
          <td className="px-3 py-2 pl-14">
            <p className="text-xs font-mono text-muted-foreground font-semibold">
              {contract.contract_number || `CTR-${String(ci + 1).padStart(3, "0")}`}
            </p>
            {contract.description && <p className="text-xs text-foreground mt-0.5">{contract.description}</p>}
          </td>
          <td className="px-3 py-2 hidden md:table-cell">
            <Badge variant="outline" className={`text-xs ${contractStatusStyles[contract.contract_status] || ""}`}>
              {(contract.contract_status || "pending").replace(/_/g, " ")}
            </Badge>
          </td>
          <td className="px-3 py-2 text-center text-xs text-muted-foreground">
            {contract._approvedCOs > 0 ? (
              <span className="text-primary font-medium">{contract._approvedCOs} CO{contract._approvedCOs !== 1 ? "s" : ""}</span>
            ) : "—"}
          </td>
          <td className="px-3 py-2 text-right text-xs font-mono text-muted-foreground">
            ₱{(contract.original_contract_amount || 0).toLocaleString()}
          </td>
          <td className={`px-3 py-2 text-right text-xs font-mono font-semibold ${contract._netAdj > 0 ? "text-primary" : contract._netAdj < 0 ? "text-destructive" : "text-muted-foreground"}`}>
            {contract._netAdj !== 0 ? `${contract._netAdj > 0 ? "+" : ""}₱${contract._netAdj.toLocaleString()}` : "—"}
          </td>
          <td className="px-3 py-2 text-right text-sm font-bold font-mono text-primary">
            ₱{contract._ccv.toLocaleString()}
          </td>
          <td></td>
        </tr>
      ))}
    </>
  );
}

export default function ClientMasterlist() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [expandedClients, setExpandedClients] = useState({});

  const { data: allClients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("client_name", 200),
  });
  const clients = allClients.filter(c => (c.client_category || "project") === "project");

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("project_name", 200),
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["all_contracts"],
    queryFn: () => base44.entities.Contract.list("-contract_date", 500),
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ["all_change_orders"],
    queryFn: () => base44.entities.ChangeOrder.list("-date_issued", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Client.create({ ...data, client_category: "project" }),
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

  // Group projects by client_id
  const projectsByClient = {};
  projects.forEach(p => {
    const key = p.client_id || "__unlinked__";
    if (!projectsByClient[key]) projectsByClient[key] = [];
    projectsByClient[key].push(p);
  });

  // Contracts by project_id
  const contractsByProject = {};
  contracts.forEach(c => {
    if (!contractsByProject[c.project_id]) contractsByProject[c.project_id] = [];
    contractsByProject[c.project_id].push(c);
  });

  // Compute CCV per client: sum of all contract original amounts + approved CO adjustments
  const getClientCCV = (clientProjects) => {
    let total = 0;
    clientProjects.forEach(p => {
      const pContracts = contractsByProject[p.id] || [];
      pContracts.forEach(contract => {
        const contractCOs = changeOrders.filter(co => co.contract_id === contract.id && co.status === "approved");
        const adds = contractCOs.filter(co => co.co_type === "additive").reduce((s, co) => s + (co.amount || 0), 0);
        const deds = contractCOs.filter(co => co.co_type === "deductive").reduce((s, co) => s + (co.amount || 0), 0);
        total += (contract.original_contract_amount || 0) + adds - deds;
      });
      // fallback: if no contracts linked, use project contract_amount
      if (pContracts.length === 0) total += (p.contract_amount || 0);
    });
    return total;
  };

  const activeCount = clients.filter(c => c.status === "active").length;
  const totalCCV = clients.reduce((s, c) => s + getClientCCV(projectsByClient[c.id] || []), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Client Masterlist</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            {clients.length} clients · {activeCount} active · {projects.length} projects · Total CCV: ₱{totalCCV.toLocaleString()}
          </p>
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
          <p className="text-xs text-muted-foreground mb-1">Total Current Contract Value</p>
          <p className="text-lg font-bold text-chart-3">₱{totalCCV.toLocaleString()}</p>
        </div>
      </div>

      {/* Masterlist Table */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
        {!isLoading && clients.length === 0 && (
          <div className="text-center py-16">
            <Building2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No clients yet. Add your first client.</p>
          </div>
        )}
        {!isLoading && clients.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="px-3 py-3 w-6"></th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Client</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Type / Status</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Contact</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase">Projects</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Original Contract</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">CO Adjustment</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Current Contract Value</th>
                  <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map(client => {
                  const clientProjects = projectsByClient[client.id] || [];
                  const isExpanded = expandedClients[client.id] !== false;
                  const ccv = getClientCCV(clientProjects);
                  const origTotal = clientProjects.reduce((s, p) => {
                    const pContracts = contractsByProject[p.id] || [];
                    return s + (pContracts.length > 0
                      ? pContracts.reduce((ss, c) => ss + (c.original_contract_amount || 0), 0)
                      : (p.contract_amount || 0));
                  }, 0);
                  const netAdj = ccv - origTotal;

                  return (
                    <>
                      {/* Client row */}
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
                        <td className="px-3 py-3 text-center text-sm font-semibold text-foreground">{clientProjects.length}</td>
                        <td className="px-3 py-3 text-right text-sm font-mono text-foreground">₱{origTotal.toLocaleString()}</td>
                        <td className={`px-3 py-3 text-right text-sm font-mono font-semibold ${netAdj > 0 ? "text-primary" : netAdj < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                          {netAdj !== 0 ? (
                            <span className="flex items-center justify-end gap-1">
                              {netAdj > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                              {netAdj > 0 ? "+" : ""}₱{netAdj.toLocaleString()}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-3 text-right text-base font-bold font-mono text-primary">₱{ccv.toLocaleString()}</td>
                        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setEditingClient(client)}>
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteMutation.mutate(client.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>

                      {/* Project sub-header when expanded */}
                      {isExpanded && clientProjects.length > 0 && (
                        <tr className="bg-muted/10 border-t border-border/20">
                          <td></td>
                          <td className="px-3 py-1.5 pl-8 text-xs font-semibold text-muted-foreground uppercase">Project</td>
                          <td className="px-3 py-1.5 hidden md:table-cell text-xs font-semibold text-muted-foreground uppercase">Status</td>
                          <td className="px-3 py-1.5 text-center text-xs font-semibold text-muted-foreground uppercase">Contracts</td>
                          <td className="px-3 py-1.5 text-right text-xs font-semibold text-muted-foreground uppercase">Original</td>
                          <td className="px-3 py-1.5 text-right text-xs font-semibold text-muted-foreground uppercase">CO Adj.</td>
                          <td className="px-3 py-1.5 text-right text-xs font-semibold text-muted-foreground uppercase">CCV</td>
                          <td className="px-3 py-1.5 text-right text-xs font-semibold text-muted-foreground uppercase">Done %</td>
                        </tr>
                      )}
                      {isExpanded && clientProjects.length === 0 && (
                        <tr className="border-t border-border/40">
                          <td colSpan={9} className="px-6 py-3 text-xs text-muted-foreground italic">No projects linked to this client.</td>
                        </tr>
                      )}
                      {isExpanded && clientProjects.map(p => (
                        <ProjectContractRow
                          key={p.id}
                          project={p}
                          contracts={contractsByProject[p.id] || []}
                          changeOrders={changeOrders}
                        />
                      ))}

                      {/* Client total row */}
                      {isExpanded && clientProjects.length > 0 && (
                        <tr className="border-t border-primary/20 bg-primary/5">
                          <td colSpan={6} className="px-3 py-2 pl-8 text-xs font-bold text-foreground">Client Total CCV</td>
                          <td></td>
                          <td className="px-3 py-2 text-right text-sm font-bold text-primary">₱{ccv.toLocaleString()}</td>
                          <td></td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/40">
                  <td colSpan={5} className="px-3 py-3 text-sm font-bold text-foreground">Grand Total — Current Contract Value</td>
                  <td className="px-3 py-3 text-right font-mono font-bold text-foreground">
                    ₱{clients.reduce((s, c) => {
                      const cp = projectsByClient[c.id] || [];
                      return s + cp.reduce((ss, p) => {
                        const pContracts = contractsByProject[p.id] || [];
                        return ss + (pContracts.length > 0
                          ? pContracts.reduce((sss, c2) => sss + (c2.original_contract_amount || 0), 0)
                          : (p.contract_amount || 0));
                      }, 0);
                    }, 0).toLocaleString()}
                  </td>
                  <td></td>
                  <td className="px-3 py-3 text-right text-base font-bold text-primary">₱{totalCCV.toLocaleString()}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
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