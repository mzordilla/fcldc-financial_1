import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from "recharts";
import ProjectMonthlyTransactions from "@/components/projects/ProjectMonthlyTransactions";

const EXPENSE_CATEGORIES = [
  "material_cost", "labor", "equipment", "subcontractor", "overhead", "permits", "insurance", "other",
];

const CATEGORY_LABELS = {
  material_cost: "Materials",
  labor: "Labor",
  equipment: "Equipment",
  subcontractor: "Subcontractor",
  overhead: "Overhead",
  permits: "Permits",
  insurance: "Insurance",
  other: "Other",
};

const CLASSIFICATION_STYLES = {
  company_development: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  external_construction: "bg-chart-4/10 text-chart-4 border-chart-4/20",
};

const CLASSIFICATION_LABELS = {
  company_development: "Company Development",
  external_construction: "External Construction",
};

function buildProjectData(transactions, receivables = [], billingCycles = [], projectsData = [], payables = [], paymentRequests = []) {
  const projects = {};

  // Build lookups by project_name and project_code
  const classificationMap = {};
  const codeToName = {}; // project_code → canonical project_name
  projectsData.forEach(p => {
    if (p.project_name) {
      if (p.project_classification) classificationMap[p.project_name] = p.project_classification;
      if (p.project_code) codeToName[p.project_code] = p.project_name;
    }
  });

  // Resolve a record to a canonical project name key
  const resolveKey = (project_name, project_code) => {
    if (project_code && codeToName[project_code]) return codeToName[project_code];
    return project_name || "Unassigned";
  };

  const ensure = (key) => {
    if (!projects[key]) {
      projects[key] = { name: key, income: 0, expenses: 0, billed: 0, collected: 0, categories: {}, classification: classificationMap[key] || null, transactions: [] };
    }
  };

  // Track transaction-linked payable/PR IDs to avoid double-counting
  const transactionLinkedPayableIds = new Set();
  const transactionLinkedPRIds = new Set();

  transactions.forEach((t) => {
    if (t.category === "fund_transfer") return;
    if (t.category === "bank_reconciliation") return;
    const key = t.project_name || "Unassigned";
    ensure(key);
    if (t.type === "income") {
      projects[key].income += t.amount || 0;
    } else {
      projects[key].expenses += t.amount || 0;
      const cat = t.category || "other";
      projects[key].categories[cat] = (projects[key].categories[cat] || 0) + (t.amount || 0);
    }
    projects[key].transactions.push(t);
  });

  // Include payables (from POs) that have a project and aren't already in transactions
  // Use net amount (gross - withholding tax) to match what was actually paid
  payables.forEach((p) => {
    if (!p.project_name && !p.project_code) return;
    const key = resolveKey(p.project_name, p.project_code);
    ensure(key);
    // Amount to count: use amount_paid if partially/fully paid, else full amount for unpaid
    const amt = p.amount_paid > 0 ? p.amount_paid : (p.status === "paid" ? (p.amount - (p.withholding_tax_amount || 0)) : 0);
    if (amt <= 0) return;
    const cat = p.category || "other";
    projects[key].expenses += amt;
    projects[key].categories[cat] = (projects[key].categories[cat] || 0) + amt;
  });

  // Include paid/approved payment requests that have project allocations
  paymentRequests.forEach((pr) => {
    if (pr.approval_status !== "paid" && pr.approval_status !== "approved") return;
    const allocations = pr.project_allocations || [];
    if (allocations.length === 0 && (pr.project_name || pr.project_code)) {
      // fallback: single project
      const key = resolveKey(pr.project_name, pr.project_code);
      ensure(key);
      const amt = pr.amount - (pr.withholding_tax_amount || 0);
      if (amt <= 0) return;
      const cat = pr.category || "other";
      projects[key].expenses += amt;
      projects[key].categories[cat] = (projects[key].categories[cat] || 0) + amt;
    } else {
      allocations.forEach((alloc) => {
        if ((!alloc.project_name && !alloc.project_code) || !alloc.amount) return;
        const key = resolveKey(alloc.project_name, alloc.project_code);
        ensure(key);
        projects[key].expenses += alloc.amount;
        const cat = alloc.category || pr.category || "other";
        projects[key].categories[cat] = (projects[key].categories[cat] || 0) + alloc.amount;
      });
    }
  });

  // Add approved billing cycles as billed revenue
  billingCycles.forEach((bc) => {
    const key = bc.project_name || "Unassigned";
    ensure(key);
    projects[key].billed += bc.net_billing_amount || bc.billing_amount || 0;
  });

  // Add collected receivables
  receivables.forEach((r) => {
    const key = r.project_name || "Unassigned";
    ensure(key);
    projects[key].collected += r.amount_paid || 0;
  });

  return Object.values(projects).sort((a, b) => (b.income - b.expenses) - (a.income - a.expenses));
}

function ProjectRow({ project }) {
  const [open, setOpen] = useState(false);
  const profit = project.income - project.expenses;
  const margin = project.income > 0 ? (profit / project.income) * 100 : 0;
  const isProfit = profit >= 0;

  const categoryBreakdown = EXPENSE_CATEGORIES
    .filter((c) => project.categories[c])
    .map((c) => ({ label: CATEGORY_LABELS[c], amount: project.categories[c] }))
    .sort((a, b) => b.amount - a.amount);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
      <button
        className="w-full p-5 text-left"
        onClick={() => setOpen(!open)}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isProfit ? "bg-primary/10" : "bg-destructive/10"
            }`}>
              {isProfit
                ? <TrendingUp className="w-4 h-4 text-primary" />
                : <TrendingDown className="w-4 h-4 text-destructive" />
              }
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-foreground">{project.name}</h3>
                {project.classification && (
                  <Badge variant="outline" className={`text-xs ${CLASSIFICATION_STYLES[project.classification] || ""}`}>
                    {CLASSIFICATION_LABELS[project.classification]}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {categoryBreakdown.length} expense categories
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 flex-wrap justify-end">
            {project.billed > 0 && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Billed</p>
                <p className="font-semibold text-sm text-chart-2">₱{project.billed.toLocaleString()}</p>
              </div>
            )}
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Revenue</p>
              <p className="font-semibold text-sm text-primary">+₱{project.income.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Expenses</p>
              <p className="font-semibold text-sm text-destructive">-₱{project.expenses.toLocaleString()}</p>
            </div>
            <div className="text-right min-w-[80px]">
              <p className="text-xs text-muted-foreground">Net P&L</p>
              <p className={`font-bold text-base ${isProfit ? "text-primary" : "text-destructive"}`}>
                {isProfit ? "+" : ""}{profit < 0 ? "-₱" : "₱"}{Math.abs(profit).toLocaleString()}
              </p>
            </div>
            <div className="hidden sm:block text-right min-w-[60px]">
              <p className="text-xs text-muted-foreground">Margin</p>
              <Badge variant="outline" className={`text-xs mt-0.5 ${
                margin >= 20 ? "bg-primary/10 text-primary border-primary/20"
                : margin >= 0 ? "bg-chart-3/10 text-chart-3 border-chart-3/20"
                : "bg-destructive/10 text-destructive border-destructive/20"
              }`}>
                {margin.toFixed(1)}%
              </Badge>
            </div>
            <div className="text-muted-foreground">
              {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Expense ratio</span>
            <span>{project.income > 0 ? ((project.expenses / project.income) * 100).toFixed(0) : 100}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${isProfit ? "bg-primary" : "bg-destructive"}`}
              style={{ width: `${Math.min(project.income > 0 ? (project.expenses / project.income) * 100 : 100, 100)}%` }}
            />
          </div>
        </div>
      </button>

      {open && (
        <div className="border-t border-border px-5 pb-5 pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Expense Breakdown */}
            <div>
              <p className="text-sm font-medium text-foreground mb-3">Expense Breakdown</p>
              {categoryBreakdown.length === 0 && (
                <p className="text-sm text-muted-foreground">No expenses recorded</p>
              )}
              <div className="space-y-2.5">
                {categoryBreakdown.map((cat) => (
                  <div key={cat.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{cat.label}</span>
                      <span className="font-medium">₱{cat.amount.toLocaleString()}</span>
                    </div>
                    <Progress
                      value={project.expenses > 0 ? (cat.amount / project.expenses) * 100 : 0}
                      className="h-1.5"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Mini chart */}
            <div>
              <p className="text-sm font-medium text-foreground mb-3">Income vs Expenses</p>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[{ name: project.name, Revenue: project.income, Expenses: project.expenses }]}
                    margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                    barSize={36}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
                    <XAxis dataKey="name" hide />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} tickFormatter={(v) => `₱${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v) => `₱${v.toLocaleString()}`} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                    <Bar dataKey="Revenue" fill="hsl(160, 84%, 39%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Expenses" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <ProjectMonthlyTransactions transactions={project.transactions || []} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProjectPnL() {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-date", 500),
  });

  const { data: receivables = [] } = useQuery({
    queryKey: ["receivables"],
    queryFn: () => base44.entities.Receivable.list("-created_date", 200),
  });

  const { data: billingCycles = [] } = useQuery({
    queryKey: ["billing_cycles"],
    queryFn: () => base44.entities.BillingCycle.filter({ approval_status: "approved" }, "-created_date", 200),
  });

  const { data: projectsData = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("project_name", 200),
  });

  const { data: payables = [] } = useQuery({
    queryKey: ["payables_pnl"],
    queryFn: () => base44.entities.Payable.list("-created_date", 500),
  });

  const { data: paymentRequests = [] } = useQuery({
    queryKey: ["payment_requests_pnl"],
    queryFn: () => base44.entities.PaymentRequest.filter({ approval_status: "paid" }, "-created_date", 500),
  });

  const [classFilter, setClassFilter] = useState("all");

  const allProjects = buildProjectData(transactions, receivables, billingCycles, projectsData, payables, paymentRequests);
  const projects = classFilter === "all" ? allProjects : allProjects.filter(p => p.classification === classFilter);

  const totalIncome = projects.reduce((s, p) => s + p.income, 0);
  const totalExpenses = projects.reduce((s, p) => s + p.expenses, 0);
  const totalProfit = totalIncome - totalExpenses;
  const profitableCount = projects.filter(p => p.income > p.expenses).length;

  const chartData = projects.slice(0, 8).map(p => ({
    name: p.name.length > 14 ? p.name.slice(0, 14) + "…" : p.name,
    Revenue: p.income,
    Expenses: p.expenses,
    Profit: Math.max(p.income - p.expenses, 0),
    Loss: Math.max(p.expenses - p.income, 0),
  }));

  // Budget vs Actual: only projects with a contract_amount (budget)
  const budgetChartData = projectsData
    .filter(p => p.contract_amount > 0 && (p.contract_status === "active" || p.contract_status === "approved" || p.contract_status === "completed"))
    .map(p => {
      const pData = allProjects.find(ap => ap.name === p.project_name);
      return {
        name: p.project_name.length > 14 ? p.project_name.slice(0, 14) + "…" : p.project_name,
        Budget: p.contract_amount,
        Actual: pData ? pData.expenses : 0,
      };
    })
    .slice(0, 8);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Project P&L</h1>
        <p className="text-muted-foreground mt-1">Profit & loss by project, with expense breakdown</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `₱${totalIncome.toLocaleString()}`, color: "bg-primary/10 text-primary" },
          { label: "Total Expenses", value: `₱${totalExpenses.toLocaleString()}`, color: "bg-destructive/10 text-destructive" },
          { label: "Net Profit", value: `${totalProfit >= 0 ? "+" : "-"}₱${Math.abs(totalProfit).toLocaleString()}`, color: totalProfit >= 0 ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive" },
          { label: "Profitable Projects", value: `${profitableCount} / ${projects.length}`, color: "bg-chart-2/10 text-chart-2" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-card rounded-2xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className={`text-xl font-bold mt-1 ${kpi.color.split(" ")[1]}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Budget vs Actual chart */}
      {budgetChartData.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-semibold">Budget vs Actual Cost — Active Projects</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Contract amount vs actual expenses per project</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetChartData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }} barSize={22} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(220, 9%, 46%)" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(220, 9%, 46%)" }} tickFormatter={(v) => `₱${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v, name) => [`₱${v.toLocaleString()}`, name]}
                  contentStyle={{ borderRadius: 10, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Budget" fill="hsl(199, 89%, 48%)" radius={[3, 3, 0, 0]} name="Budget (Contract)" />
                <Bar dataKey="Actual" fill="hsl(0, 84%, 60%)" radius={[3, 3, 0, 0]} name="Actual Cost">
                  {budgetChartData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.Actual > entry.Budget ? "hsl(0, 84%, 60%)" : "hsl(43, 96%, 56%)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-yellow-400 mr-1" />Actual within budget &nbsp;
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-red-500 mr-1" />Over budget
          </p>
        </div>
      )}

      {/* Overview chart */}
      {chartData.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6">
          <h3 className="text-base font-semibold mb-4">Revenue vs Expenses by Project</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 10, left: -10, bottom: 0 }} barSize={20}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 13%, 91%)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(220, 9%, 46%)" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "hsl(220, 9%, 46%)" }} tickFormatter={(v) => `₱${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => `₱${v.toLocaleString()}`} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Revenue" fill="hsl(160, 84%, 39%)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Expenses" fill="hsl(0, 84%, 60%)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Project rows */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-foreground">By Project</h2>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classifications</SelectItem>
              <SelectItem value="company_development">Company Development</SelectItem>
              <SelectItem value="external_construction">External Construction</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
        {!isLoading && projects.length === 0 && (
          <p className="text-center py-12 text-muted-foreground">No project transactions yet</p>
        )}
        {projects.map((p) => (
          <ProjectRow key={p.name} project={p} />
        ))}
      </div>
    </div>
  );
}