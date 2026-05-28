import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DollarSign, FileText, TrendingUp, Landmark } from "lucide-react";
import KpiCard from "../components/dashboard/KpiCard";
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

export default function Dashboard() {
  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-date", 200),
  });

  const { data: receivables = [] } = useQuery({
    queryKey: ["receivables"],
    queryFn: () => base44.entities.Receivable.list("-created_date", 100),
  });

  const { data: debts = [] } = useQuery({
    queryKey: ["workingcapitalloans"],
    queryFn: () => base44.entities.WorkingCapitalLoan.list("-created_date", 50),
  });

  const { data: loans = [] } = useQuery({
    queryKey: ["bankloans"],
    queryFn: () => base44.entities.BankLoan.list("-created_date", 50),
  });

  const { data: payables = [] } = useQuery({
    queryKey: ["payables"],
    queryFn: () => base44.entities.Payable.list("-created_date", 100),
  });

  const totalIncome = transactions.filter(t => t.type === "income" && t.category !== "fund_transfer").reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpenses = transactions.filter(t => t.type === "expense" && t.category !== "fund_transfer").reduce((s, t) => s + (t.amount || 0), 0);
  const netCashFlow = totalIncome - totalExpenses;
  const totalReceivables = receivables.filter(r => r.status !== "paid").reduce((s, r) => s + ((r.amount || 0) - (r.amount_paid || 0)), 0);
  const totalDebt = debts.filter(d => d.status === "active").reduce((s, d) => s + ((d.total_amount || 0) - (d.amount_paid || 0)), 0);


  const fmt = (v) => `₱${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Financial Overview</h1>
        <p className="text-muted-foreground mt-1">Track your construction company finances</p>
      </div>

      <DebtSummarySectionTop debts={debts} />

      <AvailableForRelease debts={debts} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Net Cash Flow"
          value={(netCashFlow < 0 ? "-" : "") + fmt(netCashFlow)}
          icon={DollarSign}
          color="bg-primary/10 text-primary"
          trend={totalIncome > 0 ? Math.round(((totalIncome - totalExpenses) / totalIncome) * 100) : 0}
          trendLabel="margin"
        />
        <KpiCard
          title="Total Income"
          value={fmt(totalIncome)}
          icon={TrendingUp}
          color="bg-chart-2/10 text-chart-2"
        />
        <KpiCard
          title="Receivables"
          value={fmt(totalReceivables)}
          icon={FileText}
          color="bg-chart-3/10 text-chart-3"
          trendLabel={`${receivables.filter(r => r.status === "overdue").length} overdue`}
        />
        <KpiCard
          title="Working Capital Loans"
          value={fmt(totalDebt)}
          icon={Landmark}
          color="bg-chart-5/10 text-chart-5"
          trendLabel={`${debts.filter(d => d.status === "active").length} active`}

        />
      </div>

      <BankBalanceSection
        transactions={transactions}
        payables={payables}
        loans={loans}
        debts={debts}
      />

      <CashFlowChart transactions={transactions} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IncomeByCategory transactions={transactions} />
        <RecentActivity transactions={transactions} />
      </div>

      <DebtSummary debts={debts} loans={loans} />

      <ReceivablesSnapshot receivables={receivables} />

      <AgingChart receivables={receivables} payables={payables} />

      <DebtBalanceChart loans={loans} debts={debts} />
    </div>
  );
}