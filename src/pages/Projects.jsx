import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Plus, Trash2, Briefcase, CheckCircle2, Pencil, ExternalLink, FileUp, Download, TrendingUp, TrendingDown, ChevronDown, ChevronRight, FileText, Users } from "lucide-react";
import { ExecutiveTabsList, ExecutiveTab } from "@/components/shared/ExecutiveTabs";
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
import ProjectCommandHeader from "@/components/projects/ProjectCommandHeader";
import ProjectKpiStrip from "@/components/projects/ProjectKpiStrip";
import ApprovedProjectCards from "@/components/projects/ApprovedProjectCards";
import ProjectRegisterBody from "@/components/projects/ProjectRegisterBody";
import { fetchAllTransactions } from "@/lib/fetchAllTransactions";
import { calculateProjectCost, usesCostIncurred } from "@/lib/projectCost";
import { PROJECT_BUDGET_FORM_FIELDS, clearProjectBudget } from "@/lib/projectBudget";


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
  owned_project: "Owned Project",
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
  { value: "owned_project", label: "Owned Project" },
  { value: "client_project", label: "Client Project" },
  { value: "monitoring_project", label: "Monitoring Project" }]
},
{ name: "contract_amount", label: "Contract Amount (₱)", type: "number", required: true, placeholder: "0.00", showWhen: { field: "project_classification", values: ["client_project"] } },
...PROJECT_BUDGET_FORM_FIELDS,
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
  const [approvedClassificationFilter, setApprovedClassificationFilter] = useState("all");
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

  const { data: transactions = [] } = useQuery({
    queryKey: ["project_cost_transactions"],
    queryFn: () => fetchAllTransactions()
  });

  const { data: receivingItems = [] } = useQuery({
    queryKey: ["project_cost_receiving_items"],
    queryFn: () => base44.entities.ReceivingItem.list("-received_date", 5000)
  });

  const projectCosts = useMemo(() => Object.fromEntries(
    projects.map((project) => [project.id, calculateProjectCost(project, transactions, receivingItems)])
  ), [projects, transactions, receivingItems]);





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
  const approvedClientProjects = approvedProjects.filter((p) => p.project_classification === "client_project");
  const totalApprovedValue = approvedClientProjects.reduce((s, p) => s + (p.contract_amount || 0), 0);
  const remainingWorksValue = approvedClientProjects.reduce((s, p) => s + (p.contract_amount || 0) * (1 - (p.completed_percentage || 0) / 100), 0);
  const activeCount = projects.filter((p) => p.contract_status === "active").length;
  const pendingCount = projects.filter((p) => p.contract_status === "pending").length;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 font-project-body md:p-8">
      <Tabs defaultValue="projects" className="w-full">
        <ExecutiveTabsList className="mb-4">
          <ExecutiveTab value="projects" icon={Briefcase}>Projects</ExecutiveTab>
          <ExecutiveTab value="clients" icon={Users}>Client Masterlist</ExecutiveTab>
          <ExecutiveTab value="pnl" icon={TrendingUp}>Project P&amp;L</ExecutiveTab>
        </ExecutiveTabsList>

        <TabsContent value="projects" className="space-y-6">
      <ProjectCommandHeader
        projects={projects}
        activeCount={activeCount}
        pendingCount={pendingCount}
        totalApprovedValue={totalApprovedValue}
        approvedCount={approvedClientProjects.length}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        classificationFilter={classificationFilter}
        setClassificationFilter={setClassificationFilter}
        onExport={() => handleExport(projects)}
        importRef={importRef}
        onImport={handleImportFile}
        onNew={() => setShowAdd(true)}
      />

      {/* KPI Summary */}
      <ProjectKpiStrip total={projects.length} approvedValue={totalApprovedValue} approvedCount={approvedClientProjects.length} active={activeCount} pending={pendingCount} remainingWorksValue={remainingWorksValue} />

      {/* Approved Contracts Summary, grouped by classification with subtotals */}
      {approvedProjects.length > 0 &&
        <section className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-sky-700" /><h3 className="font-project-display text-base font-bold text-slate-950 dark:text-white">Approved Contracts</h3></div>
            <Select value={approvedClassificationFilter} onValueChange={setApprovedClassificationFilter}>
              <SelectTrigger className="h-9 w-48 bg-white text-xs dark:bg-slate-950"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Classifications</SelectItem><SelectItem value="owned_project">Owned Project</SelectItem><SelectItem value="client_project">Client Project</SelectItem><SelectItem value="monitoring_project">Monitoring Project</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 lg:grid-cols-4">
            {["owned_project", "client_project", "monitoring_project", "unclassified"].filter(classification => approvedClassificationFilter === "all" || classification === approvedClassificationFilter).map(classification =>
              <ApprovedProjectCards key={classification} classification={classification} label={classificationLabels[classification] || "Unclassified"} projects={approvedProjects.filter(project => (project.project_classification || "unclassified") === classification)} projectCosts={projectCosts} costBased={["owned_project", "monitoring_project"].includes(classification)} onOpen={(id) => navigate(`/projects/${id}`)} statusStyles={contractStatusStyles} />
            )}
          </div>
          <div className="flex items-center gap-3 pt-2"><span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Portfolio Health Rail</span><div className="h-px flex-1 bg-slate-300 dark:bg-slate-700" /><div className="h-2 w-2 rounded-full bg-sky-600" /><div className="h-px w-1/3 bg-teal-600" /></div>
        </section>
      }

      {/* All Projects List, grouped by classification with subtotals */}
      <div className="space-y-6 border-t border-slate-200 pt-6 dark:border-slate-700">
        <div><h2 className="font-project-display text-xl font-bold text-slate-950 dark:text-white">Project Register</h2><p className="text-sm text-slate-500">Complete portfolio grouped by project classification</p></div>
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
          const costBased = ["owned_project", "monitoring_project"].includes(classification);
          const groupTotal = groupProjects.reduce((s, p) => s + (costBased ? (projectCosts[p.id] || 0) : (p.contract_amount || 0)), 0);
          const groupCompleted = costBased ? 0 : groupProjects.reduce((s, p) => s + (p.contract_amount || 0) * ((p.completed_percentage || 0) / 100), 0);
          return (
            <div key={classification} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-sm font-semibold text-foreground">
                  {classificationLabels[classification] || "Unclassified"}
                  <span className="text-muted-foreground font-normal ml-2">({groupProjects.length})</span>
                </h3>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{costBased ? "Total Cost Incurred" : "Subtotal Contract Amt"}</p>
                  <p className="text-sm font-bold text-primary">₱{groupTotal.toLocaleString()}</p>
                  {!costBased && <p className="text-xs text-muted-foreground">Completed: ₱{groupCompleted.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>}
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-700">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-950">
                      <th className="text-left py-2 px-4">Project</th>
                      <th className="text-left py-2 px-4">Client</th>
                      <th className="text-left py-2 px-4">Status</th>
                      <th className="text-right py-2 px-4">{costBased ? "Cost Incurred" : "Contract Amt"}</th>
                      {!costBased && <th className="text-right py-2 px-4">Completed</th>}
                      {!costBased && <th className="text-right py-2 px-4">Balance</th>}
                      <th className="text-right py-2 px-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <ProjectRegisterBody
                      classification={classification}
                      projects={groupProjects}
                      costBased={costBased}
                      projectCosts={projectCosts}
                      statusStyles={contractStatusStyles}
                      navigate={navigate}
                      setEditingProject={setEditingProject}
                      deleteProject={(id) => deleteMutation.mutate(id)}
                      updateStatus={(id, status) => updateMutation.mutate({ id, data: { contract_status: status } })}
                    />
                  </tbody>
                </table>
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
          const projectData = data.project_classification === "client_project" ? data : clearProjectBudget({ ...data, contract_amount: 0 });
          return createMutation.mutateAsync({ ...projectData, client_name: client?.client_name || "" });
        }} />

      <AddFormDialog
        open={!!editingProject}
        onOpenChange={(open) => {if (!open) setEditingProject(null);}}
        title="Edit Project"
        fields={fields(clients)}
        initialData={editingProject || {}}
        onSubmit={(data) => {
          const client = clients.find(c => c.id === data.client_id);
          const projectData = data.project_classification === "client_project" ? data : clearProjectBudget({ ...data, contract_amount: 0 });
          return updateMutation.mutateAsync({ id: editingProject.id, data: { ...projectData, client_name: client?.client_name || data.client_name || "" } });
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