import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { AlertTriangle } from "lucide-react";
import ProjectBudgetCategoryTable from "@/components/projects/ProjectBudgetCategoryTable";
import { projectBudgetUsage } from "@/lib/projectBudget";

const money = (value) => `₱${Math.abs(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function ProjectBudgetPanel({ project, actualCost }) {
  const { data: allOrders = [], isLoading } = useQuery({ queryKey: ["project_budget_orders", project.id], queryFn: () => base44.entities.PurchaseOrder.list("-requested_date", 10000) });
  const orders = allOrders.filter((po) => po.project_code === project.project_code || (!po.project_code && po.project_name === project.project_name));
  const usage = projectBudgetUsage(project, orders);
  const forecast = usage.approved + usage.pending;
  const exhausted = usage.total > 0 && usage.approved >= usage.total;

  if (isLoading) return <p className="py-12 text-center text-muted-foreground">Loading project budget...</p>;
  return <div className="space-y-4">
    {usage.total <= 0 && <div className="rounded-xl border border-chart-3/30 bg-chart-3/10 p-4 text-sm text-chart-3"><AlertTriangle className="mr-2 inline h-4 w-4" />No project estimate has been entered yet. Edit the project to add category budgets.</div>}
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">{[
      ["Project Estimate", usage.total], ["Approved POs", usage.approved], ["Pending POs", usage.pending], ["Actual Cost", actualCost], [exhausted ? "Budget Exhausted" : "Available to Commit", usage.remaining]
    ].map(([label, value]) => <div key={label} className={`rounded-xl border p-4 ${label === "Budget Exhausted" || value < 0 ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"}`}><p className="text-xs text-muted-foreground">{label}</p><p className={`mt-1 text-lg font-bold ${label === "Budget Exhausted" || value < 0 ? "text-destructive" : "text-foreground"}`}>{value < 0 ? "−" : ""}{money(value)}</p></div>)}</div>
    {usage.total > 0 && forecast > usage.total && <p className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"><AlertTriangle className="mr-2 inline h-4 w-4" />Approved and pending POs exceed the estimate by {money(forecast - usage.total)}.</p>}
    <ProjectBudgetCategoryTable project={project} orders={orders} />
  </div>;
}