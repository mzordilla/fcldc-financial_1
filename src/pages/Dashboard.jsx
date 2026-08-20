import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fetchAllTransactions } from "@/lib/fetchAllTransactions";
import { normalizeLoan } from "@/lib/normalizeLoan";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import {
  changePercent, expenseMix, monthKeysBack, monthlySeries, payablesHealth,
  periodTotals, projectPerformance, receivablesHealth,
} from "@/lib/executiveMetrics";
import ExecutiveKpiCard from "@/components/dashboard/executive/ExecutiveKpiCard";
import PerformanceTrendChart from "@/components/dashboard/executive/PerformanceTrendChart";
import ManagementAlerts from "@/components/dashboard/executive/ManagementAlerts";
import WorkingCapitalPanel from "@/components/dashboard/executive/WorkingCapitalPanel";
import ProjectProfitability from "@/components/dashboard/executive/ProjectProfitability";
import ExpenseMixPanel from "@/components/dashboard/executive/ExpenseMixPanel";
import CashFlowChart from "../components/dashboard/CashFlowChart";
import IncomeByCategory from "../components/dashboard/IncomeByCategory";
import RecentActivity from "../components/dashboard/RecentActivity";
import ReceivablesSnapshot from "../components/dashboard/ReceivablesSnapshot";
import DebtBalanceChart from "../components/dashboard/DebtBalanceChart";
import AgingChart from "../components/dashboard/AgingChart";
import BankBalanceSection from "../components/dashboard/BankBalanceSection";
import DebtSummary from "../components/dashboard/DebtSummary";
import DebtSummarySectionTop from "../components/dashboard/DebtSummarySectionTop";
import AvailableForRelease from "../components/dashboard/AvailableForRelease";
import ActivityNotes from "../components/dashboard/ActivityNotes";

const money = (v) => `₱${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const compact = (v) => {
  const abs = Math.abs(v);
  const unit = abs >= 1e9 ? ["B", 1e9] : abs >= 1e6 ? ["M", 1e6] : abs >= 1e3 ? ["K", 1e3] : ["", 1];
  return `${v < 0 ? "-" : ""}₱${(abs / unit[1]).toFixed(abs >= 1e6 ? 1 : 0)}${unit[0]}`;
};

export default function Dashboard() {
  const [months, setMonths] = useState("3");

  const { data: transactions = [], isLoading } = useQuery({ queryKey: ["transactions", "all"], queryFn: () => fetchAllTransactions() });
  const { data: receivables = [] } = useQuery({ queryKey: ["receivables"], queryFn: () => base44.entities.Receivable.list("-created_date", 500) });
  const { data: payables = [] } = useQuery({ queryKey: ["payables"], queryFn: () => base44.entities.Payable.list("-created_date", 500) });
  const { data: debts = [] } = useQuery({ queryKey: ["workingcapitalloans"], queryFn: () => base44.entities.WorkingCapitalLoan.list("-created_date", 200) });
  const { data: loans = [] } = useQuery({ queryKey: ["bankloans"], queryFn: () => base44.entities.BankLoan.list("-created_date", 200) });
  const { data: projects = [] } = useQuery({ queryKey: ["projects"], queryFn: () => base44.entities.Project.list("-created_date", 300) });
  const { data: bankAccounts = [] } = useQuery({ queryKey: ["bankaccounts"], queryFn: () => base44.entities.BankAccount.list("-created_date", 100) });
  const { data: purchaseOrders = [] } = useQuery({ queryKey: ["purchaseorders"], queryFn: () => base44.entities.PurchaseOrder.list("-created_date", 300) });
  const { data: paymentRequests = [] } = useQuery({ queryKey: ["paymentrequests"], queryFn: () => base44.entities.PaymentRequest.list("-created_date", 300) });

  const span = Number(months);
  const metrics = useMemo(() => {
    const currentKeys = monthKeysBack(span);
    const priorKeys = monthKeysBack(span * 2).slice(0, span);
    const current = periodTotals(transactions, currentKeys);
    const prior = periodTotals(transactions, priorKeys);
    return {
      current,
      prior,
      series: monthlySeries(transactions, monthKeysBack(Math.max(span, 6))),
      mix: expenseMix(transactions, currentKeys),
    };
  }, [transactions, span]);

  const ar = useMemo(() => receivablesHealth(receivables), [receivables]);
  const ap = useMemo(() => payablesHealth(payables), [payables]);
  const projectRows = useMemo(() => projectPerformance(projects, transactions).slice(0, 6), [projects, transactions]);

  const allLoans = useMemo(() => [...debts, ...loans].map(normalizeLoan).filter((l) => l.status === "active"), [debts, loans]);
  const debtOutstanding = allLoans.reduce((s, l) => s + ((l.total_amount || 0) - (l.amount_paid || 0)), 0);
  const monthlyDebtService = allLoans.reduce((s, l) => s + (l.monthly_payment || 0), 0);
  const cashOnHand = bankAccounts.filter((a) => a.status !== "closed").reduce((s, a) => s + (a.current_balance || 0), 0);

  const alerts = useMemo(() => {
    const list = [];
    const today = new Date();
    if (ar.overdueCount > 0) list.push({ severity: "critical", title: `${ar.overdueCount} overdue receivables · ${money(ar.overdueAmount)}`, detail: "Collections past due date — cash at risk", to: "/receivables" });
    if (ap.overdueCount > 0) list.push({ severity: "critical", title: `${ap.overdueCount} overdue payables · ${money(ap.overdueAmount)}`, detail: "Supplier obligations past due", to: "/payables" });
    if (metrics.current.net < 0) list.push({ severity: "critical", title: `Negative net result of ${money(metrics.current.net)}`, detail: `Costs exceeded revenue over the last ${span} month${span > 1 ? "s" : ""}`, to: "/reports" });
    const losing = projectPerformance(projects, transactions).filter((p) => p.margin < 0);
    if (losing.length > 0) list.push({ severity: "warning", title: `${losing.length} project${losing.length > 1 ? "s" : ""} running at a loss`, detail: losing.slice(0, 2).map((p) => p.name).join(", "), to: "/project-pnl" });
    const maturing = allLoans.filter((l) => l.due_date && (new Date(l.due_date) - today) / 86400000 <= 90 && new Date(l.due_date) >= today);
    if (maturing.length > 0) list.push({ severity: "warning", title: `${maturing.length} loan${maturing.length > 1 ? "s" : ""} maturing within 90 days`, detail: `Principal due ${money(maturing.reduce((s, l) => s + ((l.total_amount || 0) - (l.amount_paid || 0)), 0))}`, to: "/working-capital-loans" });
    if (cashOnHand > 0 && ap.dueSoonAmount > cashOnHand) list.push({ severity: "warning", title: "Payables due in 30 days exceed cash on hand", detail: `${money(ap.dueSoonAmount)} due vs ${money(cashOnHand)} available`, to: "/bank-accounts" });
    const pendingPOs = purchaseOrders.filter((p) => p.approval_status === "pending");
    if (pendingPOs.length > 0) list.push({ severity: "info", title: `${pendingPOs.length} purchase orders awaiting approval`, detail: `Committed value ${money(pendingPOs.reduce((s, p) => s + (p.amount || 0), 0))}`, to: "/purchase-orders" });
    const pendingPayments = paymentRequests.filter((p) => p.approval_status === "pending");
    if (pendingPayments.length > 0) list.push({ severity: "info", title: `${pendingPayments.length} payment requests awaiting approval`, detail: `Total ${money(pendingPayments.reduce((s, p) => s + (p.amount || 0), 0))}`, to: "/payment-approvals" });
    return list;
  }, [ar, ap, metrics, projects, transactions, allLoans, cashOnHand, purchaseOrders, paymentRequests, span]);

  const periodLabel = `Last ${span} month${span > 1 ? "s" : ""}`;

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 font-project-body md:p-8">
      <section className="flex flex-col gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between dark:border-slate-700">
        <div>
          <h1 className="font-project-display text-4xl font-bold tracking-tight text-slate-950 dark:text-white">Executive Overview</h1>
          <p className="mt-1 text-sm text-slate-500">{periodLabel} vs prior period · {isLoading ? "loading live data…" : "live ERP data"}</p>
        </div>
        <Select value={months} onValueChange={setMonths}>
          <SelectTrigger className="w-44 bg-white dark:bg-slate-950"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">This month</SelectItem>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
          </SelectContent>
        </Select>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <ExecutiveKpiCard label="Revenue" value={compact(metrics.current.income)} sub="vs prior period" change={changePercent(metrics.current.income, metrics.prior.income)} />
        <ExecutiveKpiCard label="Operating Cost" value={compact(metrics.current.expenses)} sub="vs prior period" change={changePercent(metrics.current.expenses, metrics.prior.expenses)} invertChange />
        <ExecutiveKpiCard label="Net Result" value={compact(metrics.current.net)} accent={metrics.current.net < 0 ? "text-rose-600" : "text-teal-700"} sub={`${Math.round(metrics.current.margin)}% margin`} change={changePercent(metrics.current.net, metrics.prior.net)} />
        <ExecutiveKpiCard label="Cash Position" value={compact(cashOnHand)} sub={`${bankAccounts.length} accounts`} />
        <ExecutiveKpiCard label="Receivables" value={compact(ar.total)} accent="text-sky-700" sub={`${ar.overdueCount} overdue`} />
        <ExecutiveKpiCard label="Debt Outstanding" value={compact(debtOutstanding)} accent="text-amber-600" sub={`${compact(monthlyDebtService)}/mo service`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <PerformanceTrendChart series={metrics.series} />
        <ManagementAlerts alerts={alerts} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1.2fr]">
        <WorkingCapitalPanel cashOnHand={cashOnHand} receivables={ar} payables={ap} debtOutstanding={debtOutstanding} monthlyDebtService={monthlyDebtService} />
        <div className="space-y-4">
          <ProjectProfitability rows={projectRows} />
          <ExpenseMixPanel rows={metrics.mix} />
        </div>
      </div>

      <ActivityNotes />

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full justify-between border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
            <span className="font-semibold">Detailed financial analytics</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-6 pt-6">
          <DebtSummarySectionTop debts={debts} />
          <AvailableForRelease debts={debts} />
          <BankBalanceSection transactions={transactions} payables={payables} loans={loans} debts={debts} />
          <CashFlowChart transactions={transactions} />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <IncomeByCategory transactions={transactions} />
            <RecentActivity transactions={transactions} />
          </div>
          <DebtSummary debts={debts} loans={loans} />
          <ReceivablesSnapshot receivables={receivables} />
          <AgingChart receivables={receivables} payables={payables} />
          <DebtBalanceChart loans={loans} debts={debts} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}