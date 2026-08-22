import { AlertTriangle } from "lucide-react";
import { getBudgetCategory, getBudgetTotal, getPOAmount, projectBudgetUsage } from "@/lib/projectBudget";

const money = (value) => `₱${Math.abs(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function POBudgetWarning({ project, orders, category, amount, currentPOId }) {
  if (!project || project.project_classification !== "client_project") return null;
  const totalBudget = getBudgetTotal(project);
  if (!totalBudget) return <div className="rounded-lg border border-chart-3/30 bg-chart-3/10 px-3 py-2 text-xs text-chart-3"><AlertTriangle className="mr-1.5 inline h-3.5 w-3.5" />No cost estimate is configured for this client project.</div>;

  const usage = projectBudgetUsage(project, orders, currentPOId);
  const poAmount = Number(amount) || 0;
  const projected = usage.approved + poAmount;
  const budgetCategory = getBudgetCategory(category);
  const categoryBudget = project[budgetCategory.key] || 0;
  const categoryCommitted = orders.filter((po) => po.id !== currentPOId && po.approval_status === "approved" && (po.project_code === project.project_code || (!po.project_code && po.project_name === project.project_name)) && budgetCategory.poCategories.includes(po.category)).reduce((sum, po) => sum + getPOAmount(po), 0);
  const overTotal = projected > totalBudget;
  const overCategory = category && categoryBudget > 0 && categoryCommitted + poAmount > categoryBudget;

  return <div className={`rounded-lg border px-3 py-2 text-xs ${overTotal || overCategory ? "border-destructive/30 bg-destructive/5 text-destructive" : "border-primary/20 bg-primary/5 text-foreground"}`}>
    <p className="font-semibold">Budget check: {money(usage.approved)} committed of {money(totalBudget)} · {money(usage.remaining)} available</p>
    {overTotal && <p className="mt-1"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" />This PO would exceed the total estimate by {money(projected - totalBudget)}. Submission and approval are still allowed.</p>}
    {overCategory && <p className="mt-1"><AlertTriangle className="mr-1 inline h-3.5 w-3.5" />{budgetCategory.label} would exceed its category budget by {money(categoryCommitted + poAmount - categoryBudget)}.</p>}
  </div>;
}