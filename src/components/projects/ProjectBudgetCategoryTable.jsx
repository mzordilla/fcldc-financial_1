import { PROJECT_BUDGET_CATEGORIES, getPOAmount } from "@/lib/projectBudget";

const money = (value) => `₱${Math.abs(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function ProjectBudgetCategoryTable({ project, orders }) {
  return <div className="overflow-x-auto rounded-xl border border-border"><table className="w-full text-sm">
    <thead><tr className="bg-muted/40 text-xs uppercase text-muted-foreground"><th className="px-4 py-3 text-left">Cost Category</th><th className="px-4 py-3 text-right">Estimate</th><th className="px-4 py-3 text-right">Approved POs</th><th className="px-4 py-3 text-right">Pending POs</th><th className="px-4 py-3 text-right">Available</th></tr></thead>
    <tbody>{PROJECT_BUDGET_CATEGORIES.map((category) => {
      const relevant = orders.filter((po) => category.poCategories.includes(po.category));
      const committed = relevant.filter((po) => po.approval_status === "approved").reduce((sum, po) => sum + getPOAmount(po), 0);
      const pending = relevant.filter((po) => po.approval_status === "pending").reduce((sum, po) => sum + getPOAmount(po), 0);
      const budget = project[category.key] || 0;
      const available = budget - committed;
      return <tr key={category.key} className="border-t border-border"><td className="px-4 py-3 font-medium">{category.label}</td><td className="px-4 py-3 text-right">{money(budget)}</td><td className="px-4 py-3 text-right">{money(committed)}</td><td className="px-4 py-3 text-right text-chart-3">{money(pending)}</td><td className={`px-4 py-3 text-right font-semibold ${available < 0 ? "text-destructive" : "text-primary"}`}>{available < 0 ? "−" : ""}{money(available)}</td></tr>;
    })}</tbody>
  </table></div>;
}