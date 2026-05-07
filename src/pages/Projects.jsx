import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Plus, Trash2, Briefcase, CheckCircle2, Pencil } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddFormDialog from "../components/shared/AddFormDialog";


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
{ name: "description", label: "Description", placeholder: "Brief project description" }];


export default function Projects() {
  const [showAdd, setShowAdd] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date", 200)
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

  const filtered = statusFilter === "all" ? projects : projects.filter((p) => p.contract_status === statusFilter);



  const approvedProjects = projects.filter((p) => ["approved", "active"].includes(p.contract_status));
  const totalApprovedValue = approvedProjects.reduce((s, p) => s + (p.contract_amount || 0), 0);
  const activeCount = projects.filter((p) => p.contract_status === "active").length;
  const pendingCount = projects.filter((p) => p.contract_status === "pending").length;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
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
                      <td className="py-2.5 pr-4 font-medium text-foreground">{p.project_name}</td>
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

      {/* All Projects List */}
      <div className="grid gap-4">
        {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
        {!isLoading && filtered.length === 0 &&
        <div className="text-center py-16">
            <Briefcase className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No projects found</p>
          </div>
        }
        {filtered.map((p) => {
          const completedPct = p.completed_percentage || 0;
          const retentionRate = p.retention_rate || 0;
          const completedAmt = (p.contract_amount || 0) * (completedPct / 100);
          const remainingAmt = (p.contract_amount || 0) - completedAmt;
          const retentionAmt = completedAmt * (retentionRate / 100);
          const netReceivable = completedAmt - retentionAmt;
          return (
            <div key={p.id} className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <h3 className="font-semibold text-foreground">{p.project_name}</h3>
                    {p.project_number && <span className="text-xs text-muted-foreground font-mono">{p.project_number}</span>}
                    <Badge variant="outline" className={`text-xs ${contractStatusStyles[p.contract_status] || ""}`}>
                      {(p.contract_status || "pending").replace(/_/g, " ")}
                    </Badge>
                    {p.project_type && <Badge variant="secondary" className="text-xs">{projectTypeLabels[p.project_type]}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{p.client_name}</p>
                  <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                    {p.location && <span>📍 {p.location}</span>}
                    {p.project_manager && <span>👤 {p.project_manager}</span>}
                    {p.start_date && <span>Start: {format(new Date(p.start_date), "MMM d, yyyy")}</span>}
                    {p.end_date && <span>End: {format(new Date(p.end_date), "MMM d, yyyy")}</span>}
                  </div>
                  {p.scope_of_works && (
                    <div className="mt-2 p-2.5 bg-muted/40 rounded-lg">
                      <p className="text-xs font-medium text-muted-foreground mb-0.5">Scope of Works</p>
                      <p className="text-xs text-foreground whitespace-pre-wrap">{p.scope_of_works}</p>
                    </div>
                  )}

                  {/* Completion progress bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Completion</span>
                      <span className="font-medium text-foreground">{completedPct}%</span>
                    </div>
                    <div className="relative h-2.5 rounded-full bg-muted overflow-hidden">
                      <div className="absolute left-0 top-0 h-full bg-primary rounded-full transition-all" style={{ width: `${completedPct}%` }} />
                    </div>
                  </div>

                  {/* Financial breakdown */}
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="bg-muted/40 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground">Contract</p>
                      <p className="text-sm font-semibold text-foreground">₱{(p.contract_amount || 0).toLocaleString()}</p>
                      </div>
                      <div className="bg-primary/5 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground">Completed</p>
                      <p className="text-sm font-semibold text-primary">₱{completedAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div className="bg-chart-3/5 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground">Retention ({retentionRate}%)</p>
                      <p className="text-sm font-semibold text-chart-3">₱{retentionAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div className="bg-muted/40 rounded-lg p-2">
                      <p className="text-xs text-muted-foreground">Balance</p>
                      <p className="text-sm font-semibold text-foreground">₱{remainingAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:min-w-[120px]">
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

      <AddFormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title="New Project"
        fields={fields}
        onSubmit={(data) => createMutation.mutateAsync(data)} />
      

      <AddFormDialog
        open={!!editingProject}
        onOpenChange={(open) => {if (!open) setEditingProject(null);}}
        title="Edit Project"
        fields={fields}
        initialData={editingProject || {}}
        onSubmit={(data) => updateMutation.mutateAsync({ id: editingProject.id, data })} />
      
    </div>);

}