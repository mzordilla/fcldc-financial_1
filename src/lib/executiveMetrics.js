// Executive dashboard aggregations built from existing ERP records.
const OPERATIONAL = (t) => t.category !== "fund_transfer" && t.category !== "bank_reconciliation";

const monthKey = (date) => (date || "").slice(0, 7);

export const monthLabel = (key) => {
  const [year, month] = key.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleString(undefined, { month: "short", year: "2-digit" });
};

export function monthKeysBack(count, from = new Date()) {
  const keys = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(from.getFullYear(), from.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  return keys;
}

export function periodTotals(transactions, keys) {
  const set = new Set(keys);
  const scoped = transactions.filter((t) => set.has(monthKey(t.date)) && OPERATIONAL(t));
  const income = scoped.filter((t) => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const expenses = scoped.filter((t) => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  return { income, expenses, net: income - expenses, margin: income > 0 ? ((income - expenses) / income) * 100 : 0 };
}

export function monthlySeries(transactions, keys) {
  return keys.map((key) => {
    const totals = periodTotals(transactions, [key]);
    return { key, label: monthLabel(key), income: totals.income, expenses: totals.expenses, net: totals.net };
  });
}

export function expenseMix(transactions, keys) {
  const set = new Set(keys);
  const map = {};
  transactions.filter((t) => t.type === "expense" && OPERATIONAL(t) && set.has(monthKey(t.date))).forEach((t) => {
    const key = t.category || "other";
    map[key] = (map[key] || 0) + (t.amount || 0);
  });
  return Object.entries(map).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount);
}

export function receivablesHealth(receivables) {
  const today = new Date();
  const open = receivables.filter((r) => r.status !== "paid");
  const outstanding = (r) => (r.amount || 0) - (r.amount_paid || 0);
  const overdue = open.filter((r) => r.due_date && new Date(r.due_date) < today);
  const buckets = { current: 0, d30: 0, d60: 0, d90: 0 };
  open.forEach((r) => {
    const days = r.due_date ? Math.floor((today - new Date(r.due_date)) / 86400000) : 0;
    const value = outstanding(r);
    if (days <= 0) buckets.current += value;
    else if (days <= 30) buckets.d30 += value;
    else if (days <= 60) buckets.d60 += value;
    else buckets.d90 += value;
  });
  return {
    total: open.reduce((s, r) => s + outstanding(r), 0),
    overdueAmount: overdue.reduce((s, r) => s + outstanding(r), 0),
    overdueCount: overdue.length,
    buckets,
  };
}

export function payablesHealth(payables) {
  const today = new Date();
  const open = payables.filter((p) => p.status !== "paid");
  const outstanding = (p) => (p.amount || 0) - (p.amount_paid || 0);
  const overdue = open.filter((p) => p.due_date && new Date(p.due_date) < today);
  const dueSoon = open.filter((p) => p.due_date && new Date(p.due_date) >= today && (new Date(p.due_date) - today) / 86400000 <= 30);
  return {
    total: open.reduce((s, p) => s + outstanding(p), 0),
    overdueAmount: overdue.reduce((s, p) => s + outstanding(p), 0),
    overdueCount: overdue.length,
    dueSoonAmount: dueSoon.reduce((s, p) => s + outstanding(p), 0),
  };
}

export function projectPerformance(projects, transactions) {
  return projects
    .map((project) => {
      const scoped = transactions.filter((t) => t.project_code && t.project_code === project.project_code && OPERATIONAL(t));
      const revenue = scoped.filter((t) => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
      const cost = scoped.filter((t) => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
      const contract = project.contract_amount || 0;
      const billed = contract * ((project.completed_percentage || 0) / 100);
      const base = revenue || billed;
      return {
        id: project.id,
        name: project.project_name,
        client: project.client_name,
        contract,
        revenue,
        cost,
        profit: base - cost,
        margin: base > 0 ? ((base - cost) / base) * 100 : 0,
        completion: project.completed_percentage || 0,
        status: project.contract_status,
      };
    })
    .filter((p) => p.revenue > 0 || p.cost > 0)
    .sort((a, b) => b.cost - a.cost);
}

export function changePercent(current, previous) {
  if (!previous) return current ? 100 : 0;
  return ((current - previous) / Math.abs(previous)) * 100;
}