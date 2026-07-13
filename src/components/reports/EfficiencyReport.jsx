import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fetchAllTransactions } from "@/lib/fetchAllTransactions";

const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export default function EfficiencyReport({ dateFrom, dateTo }) {
  const { data: payables = [] } = useQuery({
    queryKey: ["payables_efficiency"],
    queryFn: () => base44.entities.Payable.list("-created_date", 10000),
  });

  const { data: receivables = [] } = useQuery({
    queryKey: ["receivables_efficiency"],
    queryFn: () => base44.entities.Receivable.list("-created_date", 10000),
  });

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["pos_efficiency"],
    queryFn: () => base44.entities.PurchaseOrder.list("-created_date", 10000),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions_efficiency"],
    queryFn: () => fetchAllTransactions("-date"),
  });

  const { data: billingCycles = [] } = useQuery({
    queryKey: ["billing_cycles_efficiency"],
    queryFn: () => base44.entities.BillingCycle.list("-created_date", 10000),
  });

  const filteredData = useMemo(() => {
    const from = dateFrom ? parseISO(dateFrom) : null;
    const to = dateTo ? parseISO(dateTo) : null;

    const filterByDate = (items, dateField) => {
      if (!from && !to) return items;
      return items.filter(item => {
        if (!item[dateField]) return false;
        const d = item[dateField];
        if (from && d < format(from, "yyyy-MM-dd")) return false;
        if (to && d > format(to, "yyyy-MM-dd")) return false;
        return true;
      });
    };

    return {
      payables: filterByDate(payables, "due_date"),
      receivables: filterByDate(receivables, "due_date"),
      purchaseOrders: filterByDate(purchaseOrders, "requested_date"),
      transactions: filterByDate(transactions, "date"),
      billingCycles: filterByDate(billingCycles, "period_start"),
    };
  }, [payables, receivables, purchaseOrders, transactions, billingCycles, dateFrom, dateTo]);

  // Payables Efficiency (based on aging/overdue)
  const payablesMetrics = useMemo(() => {
    const total = filteredData.payables.reduce((s, p) => s + (p.amount || 0), 0);
    const paid = filteredData.payables.reduce((s, p) => s + (p.amount_paid || 0), 0);
    const overdue = filteredData.payables
      .filter(p => p.status === "overdue" || (p.due_date && new Date(p.due_date) < new Date() && p.status !== "paid"))
      .reduce((s, p) => s + ((p.amount || 0) - (p.amount_paid || 0)), 0);
    
    const efficiency = total > 0 ? ((total - overdue) / total) * 100 : 0;
    
    return { total, paid, overdue, efficiency };
  }, [filteredData.payables]);

  // Receivables Collection Efficiency
  const receivablesMetrics = useMemo(() => {
    const total = filteredData.receivables.reduce((s, r) => s + (r.amount || 0), 0);
    const collected = filteredData.receivables.reduce((s, r) => s + (r.amount_paid || 0), 0);
    const outstanding = filteredData.receivables
      .filter(r => r.status !== "paid")
      .reduce((s, r) => s + ((r.amount || 0) - (r.amount_paid || 0)), 0);
    const efficiency = total > 0 ? (collected / total) * 100 : 0;
    
    return { total, collected, outstanding, efficiency };
  }, [filteredData.receivables]);

  // Purchase Order Delivery Efficiency
  const poMetrics = useMemo(() => {
    const approvedPOs = filteredData.purchaseOrders.filter(po => po.approval_status === "approved" && po.requested_date && po.delivery_date);
    const onTime = approvedPOs.filter(po => new Date(po.delivery_date) <= new Date(po.requested_date)).length;
    const delayed = approvedPOs.length - onTime;
    const efficiency = approvedPOs.length > 0 ? (onTime / approvedPOs.length) * 100 : 0;
    
    return { total: approvedPOs.length, onTime, delayed, efficiency };
  }, [filteredData.purchaseOrders]);

  // Banking Transaction Velocity
  const bankingMetrics = useMemo(() => {
    const income = filteredData.transactions.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
    const expenses = filteredData.transactions.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
    const net = income - expenses;
    const transactionCount = filteredData.transactions.length;
    
    return { income, expenses, net, transactionCount };
  }, [filteredData.transactions]);

  // Reporting/Billing Efficiency
  const reportingMetrics = useMemo(() => {
    const totalBillings = filteredData.billingCycles.length;
    const approvedBillings = filteredData.billingCycles.filter(b => b.approval_status === "approved").length;
    const pendingBillings = filteredData.billingCycles.filter(b => b.approval_status === "pending").length;
    const rejectedBillings = filteredData.billingCycles.filter(b => b.approval_status === "rejected").length;
    const approvalRate = totalBillings > 0 ? (approvedBillings / totalBillings) * 100 : 0;
    
    // Calculate average days to approval for approved billings
    const approvedWithDates = filteredData.billingCycles.filter(b => 
      b.approval_status === "approved" && b.period_start && b.approved_by
    );
    const avgApprovalDays = approvedWithDates.length > 0 
      ? approvedWithDates.reduce((sum, b) => {
          const start = new Date(b.period_start);
          const now = new Date();
          return sum + Math.round((now - start) / 86400000);
        }, 0) / approvedWithDates.length
      : 0;
    
    return { totalBillings, approvedBillings, pendingBillings, rejectedBillings, approvalRate, avgApprovalDays };
  }, [filteredData.billingCycles]);

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Payables Efficiency</p>
            {payablesMetrics.efficiency >= 80 ? <TrendingUp className="w-4 h-4 text-primary" /> : payablesMetrics.efficiency >= 50 ? <TrendingUp className="w-4 h-4 text-chart-3" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
          </div>
          <p className={`text-2xl font-bold ${payablesMetrics.efficiency >= 80 ? "text-primary" : payablesMetrics.efficiency >= 50 ? "text-chart-3" : "text-destructive"}`}>
            {payablesMetrics.efficiency.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Overdue: {fmt(payablesMetrics.overdue)}
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Collection Efficiency</p>
            {receivablesMetrics.efficiency >= 80 ? <TrendingUp className="w-4 h-4 text-primary" /> : receivablesMetrics.efficiency >= 50 ? <TrendingUp className="w-4 h-4 text-chart-3" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
          </div>
          <p className={`text-2xl font-bold ${receivablesMetrics.efficiency >= 80 ? "text-primary" : receivablesMetrics.efficiency >= 50 ? "text-chart-3" : "text-destructive"}`}>
            {receivablesMetrics.efficiency.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Outstanding: {fmt(receivablesMetrics.outstanding)}
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Delivery Efficiency</p>
            {poMetrics.efficiency >= 80 ? <TrendingUp className="w-4 h-4 text-primary" /> : poMetrics.efficiency >= 50 ? <TrendingUp className="w-4 h-4 text-chart-3" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
          </div>
          <p className={`text-2xl font-bold ${poMetrics.efficiency >= 80 ? "text-primary" : poMetrics.efficiency >= 50 ? "text-chart-3" : "text-destructive"}`}>
            {poMetrics.efficiency.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {poMetrics.onTime} on-time / {poMetrics.delayed} delayed
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Net Cash Flow</p>
            {bankingMetrics.net >= 0 ? <TrendingUp className="w-4 h-4 text-primary" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
          </div>
          <p className={`text-2xl font-bold ${bankingMetrics.net >= 0 ? "text-primary" : "text-destructive"}`}>
            {fmt(bankingMetrics.net)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {bankingMetrics.transactionCount} transactions
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Reporting Efficiency</p>
            {reportingMetrics.approvalRate >= 80 ? <TrendingUp className="w-4 h-4 text-primary" /> : reportingMetrics.approvalRate >= 50 ? <TrendingUp className="w-4 h-4 text-chart-3" /> : <TrendingDown className="w-4 h-4 text-destructive" />}
          </div>
          <p className={`text-2xl font-bold ${reportingMetrics.approvalRate >= 80 ? "text-primary" : reportingMetrics.approvalRate >= 50 ? "text-chart-3" : "text-destructive"}`}>
            {reportingMetrics.approvalRate.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {reportingMetrics.approvedBillings}/{reportingMetrics.totalBillings} approved
          </p>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payables Aging Analysis */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            Payables Aging Analysis
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Total Payables</span>
              <span className="text-sm font-semibold text-foreground">{fmt(payablesMetrics.total)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Amount Paid</span>
              <span className="text-sm font-semibold text-primary">{fmt(payablesMetrics.paid)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Overdue Amount</span>
              <span className="text-sm font-semibold text-destructive">{fmt(payablesMetrics.overdue)}</span>
            </div>
            <div className="flex justify-between items-center py-3 bg-muted/30 rounded-lg px-3 mt-2">
              <span className="text-sm font-semibold text-foreground">Efficiency Score</span>
              <Badge variant="outline" className={`text-sm ${payablesMetrics.efficiency >= 80 ? "bg-primary/10 text-primary border-primary/20" : payablesMetrics.efficiency >= 50 ? "bg-chart-3/10 text-chart-3 border-chart-3/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                {payablesMetrics.efficiency.toFixed(1)}%
              </Badge>
            </div>
          </div>
        </div>

        {/* Receivables Collection Analysis */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            Receivables Collection Analysis
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Total Receivables</span>
              <span className="text-sm font-semibold text-foreground">{fmt(receivablesMetrics.total)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Amount Collected</span>
              <span className="text-sm font-semibold text-primary">{fmt(receivablesMetrics.collected)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Outstanding Balance</span>
              <span className="text-sm font-semibold text-destructive">{fmt(receivablesMetrics.outstanding)}</span>
            </div>
            <div className="flex justify-between items-center py-3 bg-muted/30 rounded-lg px-3 mt-2">
              <span className="text-sm font-semibold text-foreground">Collection Rate</span>
              <Badge variant="outline" className={`text-sm ${receivablesMetrics.efficiency >= 80 ? "bg-primary/10 text-primary border-primary/20" : receivablesMetrics.efficiency >= 50 ? "bg-chart-3/10 text-chart-3 border-chart-3/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                {receivablesMetrics.efficiency.toFixed(1)}%
              </Badge>
            </div>
          </div>
        </div>

        {/* PO Delivery Performance */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            Purchase Order Delivery Performance
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Total Approved POs</span>
              <span className="text-sm font-semibold text-foreground">{poMetrics.total}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">On-Time Deliveries</span>
              <span className="text-sm font-semibold text-primary">{poMetrics.onTime}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Delayed Deliveries</span>
              <span className="text-sm font-semibold text-destructive">{poMetrics.delayed}</span>
            </div>
            <div className="flex justify-between items-center py-3 bg-muted/30 rounded-lg px-3 mt-2">
              <span className="text-sm font-semibold text-foreground">On-Time Rate</span>
              <Badge variant="outline" className={`text-sm ${poMetrics.efficiency >= 80 ? "bg-primary/10 text-primary border-primary/20" : poMetrics.efficiency >= 50 ? "bg-chart-3/10 text-chart-3 border-chart-3/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                {poMetrics.efficiency.toFixed(1)}%
              </Badge>
            </div>
          </div>
        </div>

        {/* Banking Transaction Summary */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            Banking Transaction Summary
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Total Inflow</span>
              <span className="text-sm font-semibold text-primary">{fmt(bankingMetrics.income)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Total Outflow</span>
              <span className="text-sm font-semibold text-destructive">{fmt(bankingMetrics.expenses)}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Net Flow</span>
              <span className={`text-sm font-semibold ${bankingMetrics.net >= 0 ? "text-primary" : "text-destructive"}`}>
                {fmt(bankingMetrics.net)}
              </span>
            </div>
            <div className="flex justify-between items-center py-3 bg-muted/30 rounded-lg px-3 mt-2">
              <span className="text-sm font-semibold text-foreground">Transaction Volume</span>
              <Badge variant="secondary" className="text-sm">
                {bankingMetrics.transactionCount} transactions
              </Badge>
            </div>
          </div>
        </div>

        {/* Reporting/Billing Efficiency */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            Reporting & Billing Efficiency
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Total Billing Cycles</span>
              <span className="text-sm font-semibold text-foreground">{reportingMetrics.totalBillings}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Approved Billings</span>
              <span className="text-sm font-semibold text-primary">{reportingMetrics.approvedBillings}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Pending Review</span>
              <span className="text-sm font-semibold text-chart-3">{reportingMetrics.pendingBillings}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Rejected</span>
              <span className="text-sm font-semibold text-destructive">{reportingMetrics.rejectedBillings}</span>
            </div>
            <div className="flex justify-between items-center py-3 bg-muted/30 rounded-lg px-3 mt-2">
              <span className="text-sm font-semibold text-foreground">Approval Rate</span>
              <Badge variant="outline" className={`text-sm ${reportingMetrics.approvalRate >= 80 ? "bg-primary/10 text-primary border-primary/20" : reportingMetrics.approvalRate >= 50 ? "bg-chart-3/10 text-chart-3 border-chart-3/20" : "bg-destructive/10 text-destructive border-destructive/20"}`}>
                {reportingMetrics.approvalRate.toFixed(1)}%
              </Badge>
            </div>
            {reportingMetrics.avgApprovalDays > 0 && (
              <div className="text-xs text-muted-foreground text-center pt-2">
                Avg. processing time: {reportingMetrics.avgApprovalDays.toFixed(0)} days
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alerts & Insights */}
      {(payablesMetrics.overdue > 0 || receivablesMetrics.outstanding > receivablesMetrics.total * 0.3 || poMetrics.delayed > poMetrics.total * 0.2) && (
        <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-destructive mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Attention Required
          </h3>
          <div className="space-y-2">
            {payablesMetrics.overdue > 0 && (
              <p className="text-sm text-destructive">• Overdue payables of {fmt(payablesMetrics.overdue)} require immediate attention</p>
            )}
            {receivablesMetrics.outstanding > receivablesMetrics.total * 0.3 && (
              <p className="text-sm text-destructive">• High outstanding receivables ({((receivablesMetrics.outstanding / receivablesMetrics.total) * 100).toFixed(1)}%) may impact cash flow</p>
            )}
            {poMetrics.delayed > poMetrics.total * 0.2 && (
              <p className="text-sm text-destructive">• Delivery delay rate of {((poMetrics.delayed / poMetrics.total) * 100).toFixed(1)}% affecting operations</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}