import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { ArrowLeft, Pencil, Trash2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import AddFormDialog from "../components/shared/AddFormDialog";
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
  const [editingProject, setEditingProject] = useState(null);
  const queryClient = useQueryClient();

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", id],
    queryFn: () => base44.entities.Project.list("id", 1).then(items => items.find(p => p.id === id))
  });

  const { data: billingCycles = [] } = useQuery({
    queryKey: ["billing_cycles_project", project?.project_name],
    queryFn: () => base44.entities.BillingCycle.filter({ project_name: project.project_name }, "-period_start", 100),
    enabled: !!project?.project_name,
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
  const completedAmt = (project.contract_amount || 0) * (completedPct / 100);
  const remainingAmt = (project.contract_amount || 0) - completedAmt;
  const retentionAmt = completedAmt * ((project.retention_rate || 0) / 100);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/projects")} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h1 className="text-3xl font-bold text-foreground">{project.project_name}</h1>
      </div>

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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <p className="text-xs text-muted-foreground mb-1">Contract Value</p>
              <p className="font-semibold text-foreground">₱{(project.contract_amount || 0).toLocaleString()}</p>
            </div>
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

      <AddFormDialog
        open={!!editingProject}
        onOpenChange={(open) => {if (!open) setEditingProject(null);}}
        title="Edit Project"
        fields={fields}
        initialData={editingProject || {}}
        onSubmit={(data) => updateMutation.mutateAsync({ id: editingProject.id, data })}
      />
    </div>
  );
}