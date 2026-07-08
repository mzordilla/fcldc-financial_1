import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Plus, Trash2, Briefcase, CheckCircle2, Pencil, ExternalLink, FileUp, Download, TrendingUp, TrendingDown, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { exportToExcel, parseExcelFile, downloadTemplate } from "@/utils/excelUtils";
import { useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AddFormDialog from "../components/shared/AddFormDialog";
import ProjectPnL from "./ProjectPnL";
import ClientMasterlist from "../components/projects/ClientMasterlist";


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

const classificationLabels = {
  owned_project: "Project Owned Project",
  client_project: "Client Project",
  monitoring_project: "Monitoring Project"
};

const fields = (clients) => [
{ name: "project_name", label: "Project Name", required: true, placeholder: "e.g. Main Street Tower" },
{ name: "project_code", label: "Project Code", required: true, placeholder: "PRJ-2026-001" },
{ name: "client_id", label: "Client", required: true, type: "select", options: clients.map(c => ({ value: c.id, label: c.client_name })) },
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
{ name: "project_classification", label: "Classification", type: "select", options: [
  { value: "owned_project", label: "Project Owned Project" },
  { value: "client_project", label: "Client Project" },
  { value: "monitoring_project", label: "Monitoring Project" }]
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
{ name: "description", label: "Description", placeholder: "Brief project description" }];


export default function Projects() {
  const navigate = useNavigate();
  const [showAdd, setShowAdd] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [classificationFilter, setClassificationFilter] = useState("all");
  const queryClient = useQueryClient();
  const importRef = useRef();

  const handleExport = (data) => {
    exportToExcel(data.map(p => ({
      project_name: p.project_name, project_code: p.project_code, client_name: p.client_name, project_number: p.project_number,
      location: p.location, project_type: p.project_type, contract_amount: p.contract_amount,
      completed_percentage: p.completed_percentage, retention_rate: p.retention_rate,
      contract_status: p.contract_status, contract_date: p.contract_date,
      start_date: p.start_date, end_date: p.end_date, project_manager: p.project_manager,
      description: p.description, scope_of_works: p.scope_of_works,
    })), "projects.xlsx", "Projects");
  };

  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const rows = await parseExcelFile(file);
    const parsed = rows.map(r => ({
      project_name: String(r.project_name || r["Project Name"] || "").trim(),
      client_name: String(r.client_name || r["Client Name"] || "").trim(),
      project_number: String(r.project_number || r["Project #"] || "").trim(),
      location: String(r.location || r.Location || "").trim(),
      project_type: String(r.project_type || r["Project Type"] || "").toLowerCase().trim(),
      contract_amount: r.contract_amount ? parseFloat(r.contract_amount) : 0,
      completed_percentage: r.completed_percentage ? parseFloat(r.completed_percentage) : 0,
      retention_rate: r.retention_rate ? parseFloat(r.retention_rate) : 0,
      contract_status: String(r.contract_status || r["Contract Status"] || "pending").toLowerCase().trim(),
      contract_date: String(r.contract_date || "").trim(),
      start_date: String(r.start_date || "").trim(),
      end_date: String(r.end_date || "").trim(),
      project_manager: String(r.project_manager || r["Project Manager"] || "").trim(),
      description: String(r.description || r.Description || "").trim(),
    })).filter(r => r.project_name && r.client_name);
    await Promise.all(parsed.map(r => createMutation.mutateAsync(r)));
    e.target.value = "";
  };

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date", 200)
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list()
  });





  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projects"] })
  });

  const filtered = projects.filter((p) =>
    (statusFilter === "all" || p.contract_status === statusFilter) &&
    (classificationFilter === "all" || p.project_classification === classificationFilter)
  );



  const approvedProjects = projects.filter((p) => ["approved", "active"].includes(p.contract_status));
  const totalApprovedValue = approvedProjects.reduce((s, p) => s + (p.contract_amount || 0), 0);
  const activeCount = projects.filter((p) => p.contract_status === "active").length;
  const pendingCount = projects.filter((p) => p.contract_status === "pending").length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <Tabs defaultValue="projects" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="clients">Client Masterlist</TabsTrigger>
          <TabsTrigger value="pnl">Project P&amp;L</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">
            {projects.length} total · {activeCount} active · {pendingCount} pending contract
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="on_hold">On Hold</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={classificationFilter} onValueChange={setClassificationFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classifications</SelectItem>
              <SelectItem value="owned_project">Project Owned Project</SelectItem>
              <SelectItem value="client_project">Client Project</SelectItem>
              <SelectItem value="monitoring_project">Monitoring Project</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => handleExport(projects)}>
            <Download className="w-4 h-4 mr-2" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => importRef.current.click()}>
            <FileUp className="w-4 h-4 mr-2" /> Import
          </Button>
          <input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Project
          </Button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Projects</p>
          <p className="text-2xl font-bold text-foreground">{projects.length}</p>
        </div>
        <div className="bg-card border border-primary/20 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Approved Contract Value</p>
          <p className="text-2xl font-bold text-primary">₱{totalApprovedValue.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{approvedProjects.length} contracts</p>
        </div>
        <div className="bg-card border border-chart-2/20 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Active Projects</p>
          <p className="text-2xl font-bold text-chart-2">{activeCount}</p>
        </div>
        <div className="bg-card border border-chart-3/20 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Pending Contracts</p>
          <p className="text-2xl font-bold text-chart-3">{pendingCount}</p>
        </div>
      </div>

      {/* Approved Contracts Summary */}
      {approvedProjects.length > 0 &&
      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 text-[#000000]">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-primary">Approved Contracts</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b border-border">
                  <th className="text-left py-2 pr-4">Project</th>
                  <th className="text-left py-2 pr-4">Client</th>
                  <th className="text-left py-2 pr-4">Status</th>
                  <th className="text-right py-2 pr-4">Contract Amt</th>
                  <th className="text-right py-2 pr-4">Completed</th>
                  <th className="text-right py-2 pr-4">Retention</th>
                  <th className="text-right py-2">Balance</th>
                </tr>
              </thead>
              <tbody>
                {approvedProjects.map((p) => {
                const completedAmt = (p.contract_amount || 0) * ((p.completed_percentage || 0) / 100);
                const remainingAmt = (p.contract_amount || 0) - completedAmt;
                const retentionAmt = completedAmt * ((p.retention_rate || 0) / 100);
                const netReceivable = completedAmt - retentionAmt;
                return (
                  <tr key={p.id} className="border-b border-border/50 last:border-0">
                      <td className="py-2.5 pr-4 font-medium"><button onClick={() => navigate(`/projects/${p.id}`)} className="text-primary hover:underline flex items-center gap-1">{p.project_name} <ExternalLink className="w-3 h-3" /></button></td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{p.client_name}</td>
                      <td className="py-2.5 pr-4">
                        <Badge variant="outline" className={`text-xs ${contractStatusStyles[p.contract_status]}`}>
                          {p.contract_status}
                        </Badge>
                      </td>
                      <td className="py-2.5 pr-4 text-right font-bold text-foreground">₱{(p.contract_amount || 0).toLocaleString()}</td>
                      <td className="py-2.5 pr-4 text-right text-primary">₱{completedAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="py-2.5 pr-4 text-right text-chart-3">₱{retentionAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td className="py-2.5 text-right text-muted-foreground">₱{remainingAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                    </tr>);

              })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border">
                  <td colSpan={3} className="pt-3 text-sm font-semibold text-foreground">Total</td>
                  <td className="pt-3 text-right font-bold text-primary">₱{totalApprovedValue.toLocaleString()}</td>
                  <td className="pt-3 text-right font-bold text-primary">
                    ₱{approvedProjects.reduce((s, p) => s + (p.contract_amount || 0) * ((p.completed_percentage || 0) / 100), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td className="pt-3 text-right font-bold text-chart-3">
                    ₱{approvedProjects.reduce((s, p) => {const c = (p.contract_amount || 0) * ((p.completed_percentage || 0) / 100);return s + c * ((p.retention_rate || 0) / 100);}, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                  <td className="pt-3 text-right font-bold text-muted-foreground">
                    ₱{approvedProjects.reduce((s, p) => s + (p.contract_amount || 0) * (1 - (p.completed_percentage || 0) / 100), 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      }

      {/* All Projects List, grouped by classification with subtotals */}
      <div className="space-y-8">
        {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
        {!isLoading && filtered.length === 0 &&
        <div className="text-center py-16">
            <Briefcase className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No projects found</p>
          </div>
        }
        {!isLoading && filtered.length > 0 && Object.entries(
          filtered.reduce((acc, p) => {
            const key = p.project_classification || "unclassified";
            if (!acc[key]) acc[key] = [];
            acc[key].push(p);
            return acc;
          }, {})
        ).map(([classification, groupProjects]) => {
          const groupTotal = groupProjects.reduce((s, p) => s + (p.contract_amount || 0), 0);
          const groupCompleted = groupProjects.reduce((s, p) => s + (p.contract_amount || 0) * ((p.completed_percentage || 0) / 100), 0);
          return (
            <div key={classification} className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {classificationLabels[classification] || "Unclassified"}
                  <span className="text-muted-foreground font-normal ml-2">({groupProjects.length})</span>
                </h3>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Subtotal Contract Amt</p>
                  <p className="text-sm font-bold text-primary">₱{groupTotal.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Completed: ₱{groupCompleted.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                </div>
              </div>
              <div className="grid gap-2">
              {groupProjects.map((p) => {
          const completedPct = p.completed_percentage || 0;
          const retentionRate = p.retention_rate || 0;
          const completedAmt = (p.contract_amount || 0) * (completedPct / 100);
          const remainingAmt = (p.contract_amount || 0) - completedAmt;
          const retentionAmt = completedAmt * (retentionRate / 100);
          const netReceivable = completedAmt - retentionAmt;
          return (
            <div key={p.id} className="bg-card rounded-xl border border-border px-4 py-2 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button onClick={() => navigate(`/projects/${p.id}`)} className="font-semibold text-foreground flex items-center gap-1 hover:underline text-primary">{p.project_name} <ExternalLink className="w-3 h-3" /></button>
                    {p.project_number && <Badge variant="secondary" className="text-xs">{p.project_number}</Badge>}
                    <Badge variant="outline" className={`text-xs ${contractStatusStyles[p.contract_status] || ""}`}>
                      {(p.contract_status || "pending").replace(/_/g, " ")}
                    </Badge>
                    {p.project_type && <Badge variant="secondary" className="text-xs">{projectTypeLabels[p.project_type]}</Badge>}
                    <span className="text-sm text-muted-foreground">
                      {p.client_name}
                      {p.location ? ` · ${p.location}` : ""}
                      {p.project_manager ? ` · ${p.project_manager}` : ""}
                      {p.end_date && ` · Due ${format(new Date(p.end_date), "MMM d, yyyy")}`}
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-3">
                    <Progress value={completedPct} className="h-1.5 flex-1 max-w-xs" />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {completedPct}% · ₱{completedAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })} / ₱{(p.contract_amount || 0).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                  <p className="text-lg font-bold text-foreground">
                    ₱{remainingAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                  <div className="flex gap-1">
                    {p.contract_status === "approved" &&
                    <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: p.id, data: { contract_status: "active" } })}>
                        Set Active
                      </Button>
                    }
                    {p.contract_status === "pending" &&
                    <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: p.id, data: { contract_status: "approved" } })}>
                        Approve
                      </Button>
                    }
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/projects/${p.id}?tab=change_orders`)} className="text-muted-foreground hover:text-foreground" title="Change Orders">
                      <FileText className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setEditingProject(p)} className="text-muted-foreground hover:text-foreground">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>);

              })}
              </div>
            </div>
          );
        })}
      </div>

      <AddFormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title="New Project"
        fields={fields(clients)}
        onSubmit={(data) => {
          const client = clients.find(c => c.id === data.client_id);
          return createMutation.mutateAsync({ ...data, client_name: client?.client_name || "" });
        }} />

      <AddFormDialog
        open={!!editingProject}
        onOpenChange={(open) => {if (!open) setEditingProject(null);}}
        title="Edit Project"
        fields={fields(clients)}
        initialData={editingProject || {}}
        onSubmit={(data) => {
          const client = clients.find(c => c.id === data.client_id);
          return updateMutation.mutateAsync({ id: editingProject.id, data: { ...data, client_name: client?.client_name || data.client_name || "" } });
        }} />

        </TabsContent>

        <TabsContent value="clients">
          <ClientMasterlist />
        </TabsContent>

        <TabsContent value="pnl">
          <ProjectPnL embedded />
        </TabsContent>
      </Tabs>
    </div>);

}