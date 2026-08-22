export const PROJECT_BUDGET_CATEGORIES = [
  { key: "budget_materials", label: "Materials", poCategories: ["materials", "material_cost"] },
  { key: "budget_labor", label: "Labor", poCategories: ["labor"] },
  { key: "budget_equipment", label: "Equipment", poCategories: ["equipment"] },
  { key: "budget_subcontractor", label: "Subcontractor", poCategories: ["subcontractor"] },
  { key: "budget_services", label: "Services", poCategories: ["services"] },
  { key: "budget_overhead", label: "Overhead", poCategories: ["overhead"] },
  { key: "budget_other", label: "Other", poCategories: ["other", "utilities", "permits", "insurance", "project_payment", "repair_and_maintenance", "fixtures"] },
];

export const PROJECT_BUDGET_FORM_FIELDS = [
  ...PROJECT_BUDGET_CATEGORIES.map(({ key, label }) => ({ name: key, label: `${label} Budget (₱)`, type: "number", placeholder: "0.00", showWhen: { field: "project_classification", values: ["client_project"] } })),
  { name: "project_budget_total", label: "Total Project Cost Budget (₱)", type: "number", calculatedFrom: PROJECT_BUDGET_CATEGORIES.map(({ key }) => key), showWhen: { field: "project_classification", values: ["client_project"] } },
];

export const getBudgetTotal = (project) => project?.project_budget_total || PROJECT_BUDGET_CATEGORIES.reduce((sum, item) => sum + (project?.[item.key] || 0), 0);
export const getBudgetCategory = (category) => PROJECT_BUDGET_CATEGORIES.find((item) => item.poCategories.includes(category)) || PROJECT_BUDGET_CATEGORIES.at(-1);
export const getPOAmount = (po) => po.amount || (po.line_items || []).reduce((sum, item) => sum + (item.total || item.quantity * item.cost_per_item || 0), 0);

export function projectBudgetUsage(project, orders, excludeId) {
  const linked = orders.filter((po) => po.id !== excludeId && (po.project_code === project?.project_code || (!po.project_code && po.project_name === project?.project_name)));
  const approved = linked.filter((po) => po.approval_status === "approved").reduce((sum, po) => sum + getPOAmount(po), 0);
  const pending = linked.filter((po) => po.approval_status === "pending").reduce((sum, po) => sum + getPOAmount(po), 0);
  const total = getBudgetTotal(project);
  return { total, approved, pending, remaining: total - approved };
}

export function clearProjectBudget(data) {
  return PROJECT_BUDGET_CATEGORIES.reduce((result, item) => ({ ...result, [item.key]: 0 }), { ...data, project_budget_total: 0 });
}