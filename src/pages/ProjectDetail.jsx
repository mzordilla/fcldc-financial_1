import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ArrowLeft, Pencil, Trash2, Receipt, Plus, TrendingUp, TrendingDown, AlertCircle, FileText, FilePlus, ChevronDown, ChevronRight, Building2, Phone, Mail, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AddFormDialog from "../components/shared/AddFormDialog";
import ChangeOrderFormDialog from "../components/projects/ChangeOrderFormDialog";
import ContractFormDialog from "../components/projects/ContractFormDialog";
import { useState } from "react";

const contractStatusStyles = {
  pending: "bg-muted text-muted-foreground border-border",
  approved: "bg-primary/10 text-primary border-primary/20",
  active: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  completed: "bg-muted text-muted-foreground border-border",
  on_hold: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20"
};

const projectTypeLabels = {
  residential: "Residential",
  commercial: "Commercial",
  industrial: "Industrial",
  infrastructure: "Infrastructure",
  renovation: "Renovation",
  other: "Other"
};

const fields = [
  { name: "project_name", label: "Project Name", required: true, placeholder: "e.g. Main Street Tower" },
  { name: "project_code", label: "Project Code", required: true, placeholder: "PRJ-2026-001" },
  { name: "client_name", label: "Client Name", required: true, placeholder: "e.g. ABC Developers" },
  { name: "project_number", label: "Project #", placeholder: "PRJ-2026-001" },
  { name: "location", label: "Location", placeholder: "e.g. 123 Main St, City" },
  { name: "project_type", label: "Project Type", type: "select", options: [
    { value: "residential", label: "Residential" },
    { value: "commercial", label: "Commercial" },
    { value: "industrial", label: "Industrial" },
    { value: "infrastructure", label: "Infrastructure" },
    { value: "renovation", label: "Renovation" },
    { value: "other", label: "Other" }]
  },
  { name: "contract_amount", label: "Contract Amount ($)", type: "number", required: true, placeholder: "0.00" },
  { name: "completed_percentage", label: "Completed (%)", type: "number", placeholder: "e.g. 45" },
  { name: "retention_rate", label: "Retention Rate (%)", type: "number", placeholder: "e.g. 5" },
  { name: "contract_status", label: "Contract Status", type: "select", options: [
    { value: "pending", label: "Pending" },
    { value: "approved", label: "Approved" },
    { value: "active", label: "Active" },
    { value: "completed", label: "Completed" },
    { value: "on_hold", label: "On Hold" },
    { value: "cancelled", label: "Cancelled" }]
  },
  { name: "contract_date", label: "Contract Date", type: "date" },
  { name: "start_date", label: "Start Date", type: "date" },
  { name: "end_date", label: "Expected Completion", type: "date" },
  { name: "project_manager", label: "Project Manager", placeholder: "e.g. John Smith" },
  { name: "scope_of_works", label: "Scope of Works", type: "textarea", rows: 5, placeholder: "Describe the full scope of works for this project..." },
  { name: "description", label: "Description", placeholder: "Brief project description" }
];

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const initialTab = urlParams.get("tab") || "overview";
  const [editingProject, setEditingProject] = useState(null);
  const [showAddCO, setShowAddCO] = useState(false);
  const [addCOForContract, setAddCOForContract] = useState(null); // contract object to pre-link
  const [editingCO, setEditingCO] = useState(null);
  const [showAddContract, setShowAddContract] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [expandedContracts, setExpandedContracts] = useState({});
  const queryClient = useQueryClient();

  const toggleContract = (id) => setExpandedContracts(p => ({ ...p, [id]: !p[id] }));

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => base44.entities.Project.get(id)
  });

  const { data: billingCycles = [] } = useQuery({
    queryKey: ["billing_cycles_project", project?.project_name],
    queryFn: () => base44.entities.BillingCycle.filter({ project_name: project.project_name }, "-period_start", 100),
    enabled: !!project?.project_name,
  });

  const { data: changeOrders = [] } = useQuery({
    queryKey: ["change_orders", id],
    queryFn: () => base44.entities.ChangeOrder.filter({ project_id: id }, "-date_issued", 100),
    enabled: !!id,
  });

  const { data: contracts = [] } = useQuery({
    queryKey: ["contracts", id],
    queryFn: () => base44.entities.Contract.filter({ project_id: id }, "-contract_date", 50),
    enabled: !!id,
  });

  const { data: clientRecord } = useQuery({
    queryKey: ["client", project?.client_id],
    queryFn: () => base44.entities.Client.filter({ id: project.client_id }, "client_name", 1).then(r => r[0]),
    enabled: !!project?.client_id,
  });

  const createContractMutation = useMutation({
    mutationFn: (data) => base44.entities.Contract.create({ ...data, project_id: id, project_name: project?.project_name, client_name: project?.client_name, client_id: project?.client_id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contracts", id] }),
  });

  const updateContractMutation = useMutation({
    mutationFn: ({ contractId, data }) => base44.entities.Contract.update(contractId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contracts", id] }),
  });

  const deleteContractMutation = useMutation({
    mutationFn: (contractId) => base44.entities.Contract.delete(contractId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["contracts", id] }),
  });

  const createCOMutation = useMutation({
    mutationFn: (data) => base44.entities.ChangeOrder.create({ ...data, project_id: id, project_name: project?.project_code }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["change_orders", id] }),
  });

  const updateCOMutation = useMutation({
    mutationFn: ({ coId, data }) => base44.entities.ChangeOrder.update(coId, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["change_orders", id] }),
  });

  const deleteCOMutation = useMutation({
    mutationFn: (coId) => base44.entities.ChangeOrder.delete(coId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["change_orders", id] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", id] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setEditingProject(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => {
      navigate("/projects");
    }
  });

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  if (!project) return <div className="p-8 text-center text-muted-foreground">Project not found</div>;

  const completedPct = project.completed_percentage || 0;

  // Change Order consolidation — only approved COs affect the adjusted contract amount
  const approvedCOs = changeOrders.filter(co => co.status === "approved");
  const coAdditives = approvedCOs.filter(co => co.co_type === "additive").reduce((s, co) => s + (co.amount || 0), 0);
  const coDeductives = approvedCOs.filter(co => co.co_type === "deductive").reduce((s, co) => s + (co.amount || 0), 0);
  const netCOAdjustment = coAdditives - coDeductives;
  const adjustedContractAmount = (project.contract_amount || 0) + netCOAdjustment;

  const completedAmt = adjustedContractAmount * (completedPct / 100);
  const remainingAmt = adjustedContractAmount - completedAmt;
  const retentionAmt = completedAmt * ((project.retention_rate || 0) / 100);

  const coStatusStyles = {
    pending: "bg-chart-3/10 text-chart-3 border-chart-3/20",
    approved: "bg-primary/10 text-primary border-primary/20",
    rejected: "bg-destructive/10 text-destructive border-destructive/20",
    cancelled: "bg-muted text-muted-foreground border-border",
  };

  // Compute Current Contract Value across ALL contracts: original + approved COs per contract
  const contractsWithCCV = contracts.map(contract => {
    const contractCOs = changeOrders.filter(co => co.contract_id === contract.id);
    const approvedContractCOs = contractCOs.filter(co => co.status === "approved");
    const adds = approvedContractCOs.filter(co => co.co_type === "additive").reduce((s, co) => s + (co.amount || 0), 0);
    const deds = approvedContractCOs.filter(co => co.co_type === "deductive").reduce((s, co) => s + (co.amount || 0), 0);
    const currentContractValue = (contract.original_contract_amount || 0) + adds - deds;
    return { ...contract, _contractCOs: contractCOs, _approvedCOs: approvedContractCOs, _adds: adds, _deds: deds, _ccv: currentContractValue };
  });

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold text-foreground">{project.project_name}</h1>
      </div>

      <Tabs defaultValue={initialTab} className="w-full">
        <TabsList className="mb-4 flex w-full overflow-x-auto">
          <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
          <TabsTrigger value="client" className="flex-1">Client</TabsTrigger>
          <TabsTrigger value="contracts" className="flex-1">Contracts ({contracts.length})</TabsTrigger>
          <TabsTrigger value="billings" className="flex-1">Progress Billings ({billingCycles.length})</TabsTrigger>
          <TabsTrigger value="change_orders" className="flex-1">Change Orders ({changeOrders.length})</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-6">
      <div className="bg-card rounded-2xl border border-border p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Badge variant="outline" className={`text-xs mb-2 ${contractStatusStyles[project.contract_status] || ""}`}>
              {(project.contract_status || "pending").replace(/_/g, " ")}
            </Badge>
            {project.project_type && <Badge variant="secondary" className="text-xs ml-2">{projectTypeLabels[project.project_type]}</Badge>}
            <p className="text-muted-foreground mt-2">Client: <span className="text-foreground font-medium">{project.client_name}</span></p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditingProject(project)}>
              <Pencil className="w-4 h-4 mr-2" /> Edit
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(project.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {project.project_code && <div><p className="text-xs text-muted-foreground">Project Code</p><p className="font-mono text-sm font-semibold text-primary">{project.project_code}</p></div>}
          {project.project_number && <div><p className="text-xs text-muted-foreground">Project #</p><p className="font-mono text-sm">{project.project_number}</p></div>}
          {project.location && <div><p className="text-xs text-muted-foreground">Location</p><p className="text-sm text-foreground">{project.location}</p></div>}
          {project.project_manager && <div><p className="text-xs text-muted-foreground">Project Manager</p><p className="text-sm text-foreground">{project.project_manager}</p></div>}
          {project.contract_date && <div><p className="text-xs text-muted-foreground">Contract Date</p><p className="text-sm text-foreground">{format(new Date(project.contract_date), "MMM d, yyyy")}</p></div>}
          {project.start_date && <div><p className="text-xs text-muted-foreground">Start Date</p><p className="text-sm text-foreground">{format(new Date(project.start_date), "MMM d, yyyy")}</p></div>}
          {project.end_date && <div><p className="text-xs text-muted-foreground">Expected Completion</p><p className="text-sm text-foreground">{format(new Date(project.end_date), "MMM d, yyyy")}</p></div>}
        </div>

        {project.scope_of_works && (
          <div className="bg-muted/40 rounded-lg p-4 border border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Scope of Works</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{project.scope_of_works}</p>
          </div>
        )}

        {project.description && (
          <div className="bg-muted/40 rounded-lg p-4 border border-border">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Description</p>
            <p className="text-sm text-foreground">{project.description}</p>
          </div>
        )}

        <div className="border-t border-border pt-6 space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-muted-foreground">Completion</span>
              <span className="text-sm font-semibold text-foreground">{completedPct}%</span>
            </div>
            <Progress value={completedPct} className="h-2" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-muted/40 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Main Contract</p>
              <p className="font-semibold text-foreground">₱{(project.contract_amount || 0).toLocaleString()}</p>
              {changeOrders.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">(immutable baseline)</p>
              )}
            </div>
            {changeOrders.length > 0 && (
              <div className={`rounded-lg p-3 border ${netCOAdjustment >= 0 ? "bg-primary/5 border-primary/20" : "bg-destructive/5 border-destructive/20"}`}>
                <p className="text-xs text-muted-foreground mb-1">Adjusted Contract</p>
                <p className={`font-semibold ${netCOAdjustment >= 0 ? "text-primary" : "text-destructive"}`}>₱{adjustedContractAmount.toLocaleString()}</p>
                <p className={`text-xs mt-0.5 ${netCOAdjustment >= 0 ? "text-primary/70" : "text-destructive/70"}`}>
                  {netCOAdjustment >= 0 ? "+" : ""}₱{netCOAdjustment.toLocaleString()} from {approvedCOs.length} CO{approvedCOs.length !== 1 ? "s" : ""}
                </p>
              </div>
            )}
            <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">Completed</p>
              <p className="font-semibold text-primary">₱{completedAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-chart-3/5 rounded-lg p-3 border border-chart-3/20">
              <p className="text-xs text-muted-foreground mb-1">Retention ({project.retention_rate || 0}%)</p>
              <p className="font-semibold text-chart-3">₱{retentionAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 border border-border">
              <p className="text-xs text-muted-foreground mb-1">Remaining</p>
              <p className="font-semibold text-foreground">₱{remainingAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>
      </div>

        </TabsContent>

        {/* CLIENT TAB */}
        <TabsContent value="client">
          <div className="bg-card rounded-2xl border border-border p-6 space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-foreground">Client Information</h2>
            </div>
            {!clientRecord ? (
              <div className="text-center py-10 text-sm text-muted-foreground">
                <Building2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                <p>No linked client record found.</p>
                <p className="text-xs mt-1 font-mono text-muted-foreground">{project.client_name}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">{clientRecord.client_name}</h3>
                    {clientRecord.client_code && <p className="text-xs font-mono text-primary mt-0.5">{clientRecord.client_code}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {clientRecord.client_type && (
                      <span className="text-xs bg-secondary text-secondary-foreground border border-border rounded-md px-2.5 py-0.5 font-semibold capitalize">{clientRecord.client_type.replace(/_/g, " ")}</span>
                    )}
                    <span className={`text-xs border rounded-md px-2.5 py-0.5 font-semibold ${clientRecord.status === "active" ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground border-border"}`}>{clientRecord.status}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-4">
                  {clientRecord.contact_person && (
                    <div className="flex items-start gap-3">
                      <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div><p className="text-xs text-muted-foreground">Contact Person</p><p className="text-sm text-foreground font-medium">{clientRecord.contact_person}</p></div>
                    </div>
                  )}
                  {clientRecord.email && (
                    <div className="flex items-start gap-3">
                      <Mail className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div><p className="text-xs text-muted-foreground">Email</p><a href={`mailto:${clientRecord.email}`} className="text-sm text-primary hover:underline">{clientRecord.email}</a></div>
                    </div>
                  )}
                  {clientRecord.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div><p className="text-xs text-muted-foreground">Phone</p><p className="text-sm text-foreground">{clientRecord.phone}</p></div>
                    </div>
                  )}
                  {clientRecord.address && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div><p className="text-xs text-muted-foreground">Address</p><p className="text-sm text-foreground">{clientRecord.address}</p></div>
                    </div>
                  )}
                </div>
                {clientRecord.notes && (
                  <div className="bg-muted/40 rounded-lg p-4 border border-border">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Notes</p>
                    <p className="text-sm text-foreground">{clientRecord.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        {/* CONTRACTS TAB */}
        <TabsContent value="contracts" className="space-y-4">
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
              <FilePlus className="w-4 h-4 text-primary" />
              <h2 className="font-semibold text-foreground">Contracts</h2>
              <span className="text-xs text-muted-foreground ml-1">({contracts.length})</span>
              <div className="ml-auto flex items-center gap-3">
                {contracts.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Total CCV: <span className="font-semibold text-primary">₱{contractsWithCCV.reduce((s, c) => s + c._ccv, 0).toLocaleString()}</span>
                  </div>
                )}
                <Button size="sm" onClick={() => setShowAddContract(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add Contract
                </Button>
              </div>
            </div>

            {contractsWithCCV.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <FilePlus className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
                <p>No contracts yet. Add the first contract for this project.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-3 py-2 w-6"></th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Contract #</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Description</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Original Amount</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">CO Adjustment</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Current Contract Value</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {contractsWithCCV.map((contract, ci) => {
                    const isExpanded = expandedContracts[contract.id] !== false;
                    const netAdj = contract._adds - contract._deds;
                    const contractStatusStyles2 = {
                      pending: "bg-muted text-muted-foreground border-border",
                      approved: "bg-primary/10 text-primary border-primary/20",
                      active: "bg-chart-2/10 text-chart-2 border-chart-2/20",
                      completed: "bg-muted text-muted-foreground border-border",
                      on_hold: "bg-chart-3/10 text-chart-3 border-chart-3/20",
                      cancelled: "bg-destructive/10 text-destructive border-destructive/20",
                    };
                    const coStatusStyles2 = {
                      pending: "bg-chart-3/10 text-chart-3 border-chart-3/20",
                      approved: "bg-primary/10 text-primary border-primary/20",
                      rejected: "bg-destructive/10 text-destructive border-destructive/20",
                      cancelled: "bg-muted text-muted-foreground border-border",
                    };
                    return (
                      <>
                        <tr key={contract.id} className={`border-t border-border cursor-pointer hover:bg-muted/20 transition-colors ${ci % 2 === 0 ? "" : "bg-muted/5"}`} onClick={() => toggleContract(contract.id)}>
                          <td className="px-3 py-3 text-muted-foreground">
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-primary font-semibold">
                            {contract.contract_number || `CTR-${String(ci + 1).padStart(3, "0")}`}
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell text-sm text-foreground">
                            {contract.description || "—"}
                            {contract.contract_date && <p className="text-xs text-muted-foreground">{format(new Date(contract.contract_date), "MMM d, yyyy")}</p>}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="outline" className={`text-xs ${contractStatusStyles2[contract.contract_status] || ""}`}>
                              {(contract.contract_status || "pending").replace(/_/g, " ")}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-sm text-foreground">
                            ₱{(contract.original_contract_amount || 0).toLocaleString()}
                            <p className="text-xs text-muted-foreground">(baseline)</p>
                          </td>
                          <td className={`px-4 py-3 text-right font-mono text-sm font-semibold ${netAdj >= 0 ? "text-primary" : "text-destructive"}`}>
                            {netAdj !== 0 ? `${netAdj >= 0 ? "+" : ""}₱${netAdj.toLocaleString()}` : "—"}
                            {contract._approvedCOs.length > 0 && <p className="text-xs text-muted-foreground font-normal">{contract._approvedCOs.length} approved CO{contract._approvedCOs.length !== 1 ? "s" : ""}</p>}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-primary text-base">
                            ₱{contract._ccv.toLocaleString()}
                          </td>
                          <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="outline" size="sm" className="h-7 text-xs px-2 text-primary border-primary/30 hover:bg-primary/5" onClick={() => setAddCOForContract(contract)}>
                                <Plus className="w-3 h-3 mr-1" /> Add CO
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setEditingContract(contract)}>
                                <Pencil className="w-3 h-3" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteContractMutation.mutate(contract.id)}>
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                        {/* Expanded: Change Orders under this contract */}
                        {isExpanded && contract._contractCOs.length === 0 && (
                          <tr className="border-t border-border/30">
                            <td colSpan={8} className="px-8 py-2 text-xs text-muted-foreground italic">No change orders linked to this contract. When adding a CO, select this contract.</td>
                          </tr>
                        )}
                        {isExpanded && contract._contractCOs.map((co, ci2) => (
                          <tr key={co.id} className="border-t border-border/20 bg-muted/5 hover:bg-muted/10 transition-colors">
                            <td></td>
                            <td className="px-4 py-2 pl-10 font-mono text-xs text-muted-foreground">{co.co_number || `CO-${String(ci2 + 1).padStart(3, "0")}`}</td>
                            <td className="px-4 py-2 text-xs text-foreground hidden sm:table-cell">{co.description}</td>
                            <td className="px-4 py-2">
                              <Badge variant="outline" className={`text-xs ${coStatusStyles2[co.status] || ""}`}>{co.status}</Badge>
                            </td>
                            <td className="px-4 py-2 text-right text-xs text-muted-foreground">original</td>
                            <td className={`px-4 py-2 text-right text-xs font-semibold font-mono ${co.co_type === "additive" ? "text-primary" : "text-destructive"}`}>
                              {co.co_type === "additive" ? "+" : "-"}₱{(co.amount || 0).toLocaleString()}
                            </td>
                            <td colSpan={2} className="px-4 py-2 text-right text-xs text-muted-foreground">
                              {co.timeline_impact_days ? `${co.timeline_impact_days > 0 ? "+" : ""}${co.timeline_impact_days} day(s)` : ""}
                            </td>
                          </tr>
                        ))}
                        {isExpanded && (
                          <tr className="border-t border-border/20 bg-primary/5">
                            <td colSpan={6} className="px-4 py-2 text-xs font-semibold text-foreground pl-10">Current Contract Value</td>
                            <td className="px-4 py-2 text-right font-bold text-primary text-sm">₱{contract._ccv.toLocaleString()}</td>
                            <td></td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-border bg-muted/30">
                    <td colSpan={6} className="px-4 py-3 text-sm font-bold text-foreground">Total Current Contract Value (All Contracts)</td>
                    <td className="px-4 py-3 text-right font-bold text-primary text-base">₱{contractsWithCCV.reduce((s, c) => s + c._ccv, 0).toLocaleString()}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </TabsContent>

        {/* PROGRESS BILLINGS TAB */}
        <TabsContent value="billings">
      {/* Billing Cycles / Progress Billings */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
          <Receipt className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground">Progress Billings</h2>
          <span className="ml-auto text-xs text-muted-foreground">{billingCycles.length} billing cycle{billingCycles.length !== 1 ? "s" : ""}</span>
        </div>

        {billingCycles.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground text-sm">No billing cycles recorded for this project.</p>
        ) : (
          <>
            {/* Summary bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 border-b border-border">
              {[
                { label: "Contract Amount", value: `₱${(project.contract_amount || 0).toLocaleString()}`, color: "" },
                { label: "Total Billed", value: `₱${billingCycles.reduce((s, b) => s + (b.billing_amount || 0), 0).toLocaleString()}`, color: "text-primary" },
                { label: "Net Collected", value: `₱${billingCycles.reduce((s, b) => s + (b.net_billing_amount || 0), 0).toLocaleString()}`, color: "text-chart-2" },
                { label: "Latest Progress", value: `${Math.max(...billingCycles.map(b => b.cumulative_percentage || 0), 0)}%`, color: "text-chart-3" },
              ].map((item, i) => (
                <div key={i} className="px-5 py-3 border-r border-border last:border-r-0">
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className={`font-bold text-sm mt-0.5 ${item.color || "text-foreground"}`}>{item.value}</p>
                </div>
              ))}
            </div>

            {/* Progress bar: billed vs contract */}
            <div className="px-6 py-4 border-b border-border">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>Billed vs Contract</span>
                <span>{Math.round((billingCycles.reduce((s, b) => s + (b.billing_amount || 0), 0) / (project.contract_amount || 1)) * 100)}%</span>
              </div>
              <Progress value={Math.min((billingCycles.reduce((s, b) => s + (b.billing_amount || 0), 0) / (project.contract_amount || 1)) * 100, 100)} className="h-2" />
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Period</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Billing #</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">This Period %</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Cumulative %</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Billing Amount</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Retention</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Net Amount</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {billingCycles.map((b, i) => (
                    <tr key={b.id} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "" : "bg-muted/5"}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{b.period_label || "—"}</p>
                        {b.due_date && <p className="text-xs text-muted-foreground">Due: {b.due_date}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-muted-foreground hidden sm:table-cell">{b.billing_number || "—"}</td>
                      <td className="px-4 py-3 text-right text-foreground">{b.accomplishment_percentage ?? 0}%</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-foreground font-medium">{b.cumulative_percentage ?? 0}%</span>
                          <div className="w-16 bg-muted rounded-full h-1.5 hidden lg:block">
                            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${Math.min(b.cumulative_percentage || 0, 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-foreground">₱{(b.billing_amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right text-chart-3 hidden md:table-cell">₱{(b.retention_amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-semibold text-primary">₱{(b.net_billing_amount || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-xs ${b.approval_status === "approved" ? "bg-primary/10 text-primary border-primary/20" : b.approval_status === "rejected" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-chart-3/10 text-chart-3 border-chart-3/20"}`}>
                          {b.approval_status || "pending"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

        </TabsContent>

        {/* CHANGE ORDERS TAB */}
        <TabsContent value="change_orders">
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-border">
          <FileText className="w-4 h-4 text-primary" />
          <h2 className="font-semibold text-foreground">Change Orders</h2>
          <span className="text-xs text-muted-foreground ml-1">({changeOrders.length})</span>
          <div className="ml-auto flex items-center gap-3">
            {changeOrders.length > 0 && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {coAdditives > 0 && (
                  <span className="flex items-center gap-1 text-primary font-medium">
                    <TrendingUp className="w-3 h-3" /> +₱{coAdditives.toLocaleString()}
                  </span>
                )}
                {coDeductives > 0 && (
                  <span className="flex items-center gap-1 text-destructive font-medium">
                    <TrendingDown className="w-3 h-3" /> -₱{coDeductives.toLocaleString()}
                  </span>
                )}
              </div>
            )}
            <Button size="sm" onClick={() => setShowAddCO(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add CO
            </Button>
          </div>
        </div>

        {changeOrders.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-muted-foreground/30" />
            <p>No change orders recorded.</p>
            <p className="text-xs mt-1">The main contract amount of ₱{(project.contract_amount || 0).toLocaleString()} is the active baseline.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">CO #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Date Issued</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {changeOrders.map((co, i) => (
                  <tr key={co.id} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "" : "bg-muted/5"}`}>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{co.co_number || `CO-${String(i + 1).padStart(3, "0")}`}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{co.description}</p>
                      {co.scope_change && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{co.scope_change}</p>}
                      {(co.timeline_impact_days !== 0 && co.timeline_impact_days) && (
                        <p className="text-xs text-chart-3 mt-0.5">Timeline: {co.timeline_impact_days > 0 ? "+" : ""}{co.timeline_impact_days} day{Math.abs(co.timeline_impact_days) !== 1 ? "s" : ""}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground hidden sm:table-cell">
                      {co.date_issued ? format(new Date(co.date_issued), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${co.co_type === "additive" ? "text-primary" : "text-destructive"}`}>
                        {co.co_type === "additive" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {co.co_type}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold ${co.co_type === "additive" ? "text-primary" : "text-destructive"}`}>
                      {co.co_type === "additive" ? "+" : "-"}₱{(co.amount || 0).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs ${coStatusStyles[co.status] || ""}`}>
                        {co.status || "pending"}
                      </Badge>
                      {co.approved_by && <p className="text-xs text-muted-foreground mt-0.5">{co.approved_by}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setEditingCO(co)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteCOMutation.mutate(co.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-muted/20">
                  <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-foreground">Net CO Adjustment (Approved only)</td>
                  <td className={`px-4 py-3 text-right font-bold ${netCOAdjustment >= 0 ? "text-primary" : "text-destructive"}`}>
                    {netCOAdjustment >= 0 ? "+" : ""}₱{netCOAdjustment.toLocaleString()}
                  </td>
                  <td colSpan={2} className="px-4 py-3 text-right text-xs text-muted-foreground">
                    Adjusted: ₱{adjustedContractAmount.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

        </TabsContent>
      </Tabs>

      <AddFormDialog
        open={!!editingProject}
        onOpenChange={(open) => {if (!open) setEditingProject(null);}}
        title="Edit Project"
        fields={fields}
        initialData={editingProject || {}}
        onSubmit={(data) => updateMutation.mutateAsync({ id: editingProject.id, data })}
      />

      <ChangeOrderFormDialog
        open={showAddCO}
        onOpenChange={setShowAddCO}
        title="New Change Order"
        contracts={contracts}
        onSubmit={(data) => createCOMutation.mutateAsync(data)}
      />
      <ChangeOrderFormDialog
        open={!!addCOForContract}
        onOpenChange={(v) => { if (!v) setAddCOForContract(null); }}
        title={`Add Change Order — ${addCOForContract?.contract_number || "Contract"}`}
        contracts={contracts}
        initialData={{ contract_id: addCOForContract?.id || "" }}
        onSubmit={(data) => createCOMutation.mutateAsync(data).then(() => setAddCOForContract(null))}
      />
      <ChangeOrderFormDialog
        open={!!editingCO}
        onOpenChange={(v) => { if (!v) setEditingCO(null); }}
        title="Edit Change Order"
        initialData={editingCO || {}}
        contracts={contracts}
        onSubmit={(data) => updateCOMutation.mutateAsync({ coId: editingCO.id, data })}
      />

      <ContractFormDialog
        open={showAddContract}
        onOpenChange={setShowAddContract}
        title="New Contract"
        onSubmit={(data) => createContractMutation.mutateAsync(data)}
      />
      <ContractFormDialog
        open={!!editingContract}
        onOpenChange={(v) => { if (!v) setEditingContract(null); }}
        title="Edit Contract"
        initialData={editingContract || {}}
        onSubmit={(data) => updateContractMutation.mutateAsync({ contractId: editingContract.id, data })}
      />
    </div>
  );
}