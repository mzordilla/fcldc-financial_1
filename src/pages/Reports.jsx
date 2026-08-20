import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, startOfMonth, eachMonthOfInterval, subMonths, parseISO, startOfDay, endOfDay } from "date-fns";
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, FileSpreadsheet, FileText, Plus } from "lucide-react";
import ReportsTabs from "../components/reports/ReportsTabs";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import WorkingCapitalLoansReport from "../components/reports/WorkingCapitalLoansReport";
import BankTransactionsReport from "../components/reports/BankTransactionsReport";
import IncomeTrendChart from "../components/reports/IncomeTrendChart";
import BalanceSheetReport from "../components/reports/BalanceSheetReport";
import IncomeStatementReport from "../components/reports/IncomeStatementReport";
import ComparativeIncomeStatement from "../components/reports/ComparativeIncomeStatement";
import EfficiencyReport from "../components/reports/EfficiencyReport";
import DailyTransactionsReport from "../components/reports/DailyTransactionsReport";
import MonthlyTransactionsReport from "../components/reports/MonthlyTransactionsReport";
import WithholdingTaxSync from "../components/reports/WithholdingTaxSync";
import CorporateDocuments from "../components/reports/CorporateDocuments";
import WeeklyCollatedReport from "../components/reports/WeeklyCollatedReport";
import { fetchAllTransactions } from "@/lib/fetchAllTransactions";
import { normalizeLoan } from "@/lib/normalizeLoan";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddFormDialog from "../components/shared/AddFormDialog";
import { Badge } from "@/components/ui/badge";
import { Pencil, Trash2, BookOpen } from "lucide-react";

const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtSigned = (v) => (v < 0 ? `-₱${Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `₱${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`);

const CATEGORY_LABELS = {
  project_payment: "Project Payments",
  material_cost: "Materials",
  labor: "Labor",
  equipment: "Equipment",
  subcontractor: "Subcontractor",
  overhead: "Overhead",
  permits: "Permits & Fees",
  insurance: "Insurance",
  bank_reconciliation: "Bank Reconciliation",
  other: "Other",
};

const TYPE_COLORS = {
  income:    "bg-primary/10 text-primary border-primary/20",
  expense:   "bg-destructive/10 text-destructive border-destructive/20",
  asset:     "bg-chart-2/10 text-chart-2 border-chart-2/20",
  liability: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  equity:    "bg-chart-4/10 text-chart-4 border-chart-4/20",
};

const COA_CATEGORY_LABELS = {
  project_payment: "Project Payment",
  material_cost: "Material Cost",
  labor: "Labor",
  equipment: "Equipment",
  subcontractor: "Subcontractor",
  overhead: "Overhead",
  permits: "Permits",
  insurance: "Insurance",
  bank_reconciliation: "Bank Reconciliation",
  non_current_assets: "Non-Current Assets",
  current_assets: "Current Assets",
  current_liabilities: "Current Liabilities",
  non_current_liabilities: "Non-Current Liabilities",
  repair_and_maintenance: "Repair & Maintenance",
  fixtures: "Fixtures",
  other: "Other",
};

const coaFields = [
  { name: "account_code", label: "Account Code", placeholder: "e.g. 4001" },
  { name: "account_name", label: "Account Name", required: true, placeholder: "e.g. Project Revenue" },
  { name: "account_type", label: "Account Type", type: "select", required: true, options: [
    { value: "income", label: "Income" },
    { value: "expense", label: "Expense" },
    { value: "asset", label: "Asset" },
    { value: "liability", label: "Liability" },
    { value: "equity", label: "Equity" },
  ]},
  { name: "category", label: "Transaction Category", type: "select", options: [
    { value: "project_payment", label: "Project Payment" },
    { value: "material_cost", label: "Material Cost" },
    { value: "labor", label: "Labor" },
    { value: "equipment", label: "Equipment" },
    { value: "subcontractor", label: "Subcontractor" },
    { value: "overhead", label: "Overhead" },
    { value: "permits", label: "Permits" },
    { value: "insurance", label: "Insurance" },
    { value: "bank_reconciliation", label: "Bank Reconciliation" },
    { value: "non_current_assets", label: "Non-Current Assets" },
    { value: "current_assets", label: "Current Assets" },
    { value: "current_liabilities", label: "Current Liabilities" },
    { value: "non_current_liabilities", label: "Non-Current Liabilities" },
    { value: "repair_and_maintenance", label: "Repair & Maintenance" },
    { value: "fixtures", label: "Fixtures" },
    { value: "other", label: "Other" },
  ]},
  { name: "description", label: "Notes", placeholder: "Optional description" },
];

function SectionRow({ label, value, isTotal, isSub, colorClass }) {
  return (
    <div className={`flex justify-between py-2 ${isSub ? "pl-6" : ""} ${isTotal ? "border-t border-border font-semibold" : "border-b border-border/30"}`}>
      <span className={`text-sm ${isSub ? "text-muted-foreground" : isTotal ? "text-foreground" : "text-foreground"}`}>{label}</span>
      <span className={`text-sm font-medium ${colorClass || (isTotal ? "text-foreground" : "")}`}>{value}</span>
    </div>
  );
}

function PnLStatement({ transactions, monthLabel }) {
  const income = transactions.filter(t => t.type === "income");
  const expenses = transactions.filter(t => t.type === "expense");

  const totalIncome = income.reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpenses = expenses.reduce((s, t) => s + (t.amount || 0), 0);
  const netIncome = totalIncome - totalExpenses;

  // Group by category
  const incomeByCategory = {};
  income.forEach(t => {
    const cat = t.category || "other";
    incomeByCategory[cat] = (incomeByCategory[cat] || 0) + (t.amount || 0);
  });
  const expenseByCategory = {};
  expenses.forEach(t => {
    const cat = t.category || "other";
    expenseByCategory[cat] = (expenseByCategory[cat] || 0) + (t.amount || 0);
  });

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <h3 className="text-base font-semibold text-foreground mb-4">
        Profit & Loss — {monthLabel}
      </h3>

      {/* Revenue */}
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Revenue</p>
      {Object.entries(incomeByCategory).map(([cat, amt]) => (
        <SectionRow key={cat} label={CATEGORY_LABELS[cat] || cat} value={fmt(amt)} isSub />
      ))}
      {Object.keys(incomeByCategory).length === 0 && (
        <SectionRow label="No income recorded" value="₱0" isSub />
      )}
      <SectionRow label="Total Revenue" value={fmt(totalIncome)} isTotal colorClass="text-primary" />

      {/* Expenses */}
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-1">Expenses</p>
      {Object.entries(expenseByCategory).map(([cat, amt]) => (
        <SectionRow key={cat} label={CATEGORY_LABELS[cat] || cat} value={fmt(amt)} isSub />
      ))}
      {Object.keys(expenseByCategory).length === 0 && (
        <SectionRow label="No expenses recorded" value="₱0" isSub />
      )}
      <SectionRow label="Total Expenses" value={fmt(totalExpenses)} isTotal colorClass="text-destructive" />

      {/* Net */}
      <div className={`flex justify-between items-center mt-4 pt-3 border-t-2 border-border`}>
        <span className="font-bold text-foreground">Net Income</span>
        <span className={`text-lg font-bold ${netIncome >= 0 ? "text-primary" : "text-destructive"}`}>
          {fmtSigned(netIncome)}
        </span>
      </div>
    </div>
  );
}

function CashFlowStatement({ transactions, loans, monthLabel }) {
  const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const expenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  const operatingCF = income - expenses;

  // Financing: loan payments this month
  const loanPayments = loans.reduce((s, l) => s + (l.monthly_payment || 0), 0);
  const netCF = operatingCF - loanPayments;

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <h3 className="text-base font-semibold text-foreground mb-4">
        Cash Flow Statement — {monthLabel}
      </h3>

      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Operating Activities</p>
      <SectionRow label="Cash received from clients" value={fmt(income)} isSub />
      <SectionRow label="Cash paid for expenses" value={`(${fmt(expenses)})`} isSub />
      <SectionRow label="Net Operating Cash Flow" value={fmtSigned(operatingCF)} isTotal colorClass={operatingCF >= 0 ? "text-primary" : "text-destructive"} />

      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-1">Financing Activities</p>
      <SectionRow label="Loan repayments (estimated)" value={loanPayments > 0 ? `(${fmt(loanPayments)})` : "₱0"} isSub />
      <SectionRow label="Net Financing Cash Flow" value={fmtSigned(-loanPayments)} isTotal colorClass={-loanPayments <= 0 ? "text-destructive" : "text-primary"} />

      <div className="flex justify-between items-center mt-4 pt-3 border-t-2 border-border">
        <span className="font-bold text-foreground">Net Cash Position</span>
        <span className={`text-lg font-bold ${netCF >= 0 ? "text-primary" : "text-destructive"}`}>
          {fmtSigned(netCF)}
        </span>
      </div>
    </div>
  );
}

function MonthlySummaryRow({ month, transactions, onClick, isExpanded }) {
  const income = transactions.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const expenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  const net = income - expenses;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-4 py-3 bg-card border border-border rounded-xl hover:bg-accent/40 transition-colors"
    >
      <span className="text-sm font-medium text-foreground w-32 text-left">{month}</span>
      <span className="text-sm text-primary">{fmt(income)}</span>
      <span className="text-sm text-destructive">{fmt(expenses)}</span>
      <span className={`text-sm font-semibold ${net >= 0 ? "text-primary" : "text-destructive"}`}>{fmtSigned(net)}</span>
      <span className="text-muted-foreground">{isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}</span>
    </button>
  );
}

function exportToExcel({ months, txByMonth, activeLoans, rangeMonths }) {
  const wb = XLSX.utils.book_new();

  // P&L Sheet
  const pnlRows = [["Month", "Revenue", "Expenses", "Net Income"]];
  [...months].reverse().forEach(m => {
    const key = format(m, "yyyy-MM");
    const label = format(m, "MMMM yyyy");
    const mTx = txByMonth[key] || [];
    const income = mTx.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
    const expenses = mTx.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
    pnlRows.push([label, income, expenses, income - expenses]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pnlRows), "P&L Summary");

  // Cash Flow Sheet
  const loanPayments = activeLoans.reduce((s, l) => s + (l.monthly_payment || 0), 0);
  const cfRows = [["Month", "Cash In (Revenue)", "Cash Out (Expenses)", "Operating CF", "Loan Payments", "Net CF"]];
  [...months].reverse().forEach(m => {
    const key = format(m, "yyyy-MM");
    const label = format(m, "MMMM yyyy");
    const mTx = txByMonth[key] || [];
    const income = mTx.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
    const expenses = mTx.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
    const opCF = income - expenses;
    cfRows.push([label, income, expenses, opCF, loanPayments, opCF - loanPayments]);
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cfRows), "Cash Flow");

  XLSX.writeFile(wb, `Financial_Report_${rangeMonths}mo_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
}

function exportToPDF({ months, txByMonth, activeLoans, rangeMonths }) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const loanPayments = activeLoans.reduce((s, l) => s + (l.monthly_payment || 0), 0);
  const fmtNum = (v) => `P${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

  // Title
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Financial Report", pageW / 2, 20, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Period: Last ${rangeMonths} months  |  Generated: ${format(new Date(), "MMMM d, yyyy")}`, pageW / 2, 28, { align: "center" });

  // Range summary
  const rangeTx = months.flatMap(m => txByMonth[format(m, "yyyy-MM")] || []);
  const rangeIncome = rangeTx.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const rangeExpenses = rangeTx.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  const rangeNet = rangeIncome - rangeExpenses;

  let y = 40;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(14, y, pageW - 28, 22, 3, 3, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("SUMMARY", 20, y + 7);
  doc.setFont("helvetica", "normal");
  doc.text(`Total Revenue: ${fmtNum(rangeIncome)}`, 20, y + 15);
  doc.text(`Total Expenses: ${fmtNum(rangeExpenses)}`, 85, y + 15);
  doc.text(`Net Income: ${fmtNum(rangeNet)}`, 155, y + 15);

  y += 32;

  // P&L Table Header
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("P&L Summary", 14, y);
  y += 6;

  // Table header row
  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, pageW - 28, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text("Month", 18, y + 5.5);
  doc.text("Revenue", 80, y + 5.5);
  doc.text("Expenses", 120, y + 5.5);
  doc.text("Net Income", 158, y + 5.5);
  doc.setTextColor(0, 0, 0);
  y += 8;

  [...months].reverse().forEach((m, i) => {
    if (y > 270) { doc.addPage(); y = 20; }
    const key = format(m, "yyyy-MM");
    const label = format(m, "MMMM yyyy");
    const mTx = txByMonth[key] || [];
    const inc = mTx.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
    const exp = mTx.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
    const net = inc - exp;

    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, pageW - 28, 7, "F");
    }
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(label, 18, y + 5);
    doc.setTextColor(22, 163, 74);
    doc.text(fmtNum(inc), 80, y + 5);
    doc.setTextColor(220, 38, 38);
    doc.text(fmtNum(exp), 120, y + 5);
    doc.setTextColor(net >= 0 ? 22 : 220, net >= 0 ? 163 : 38, net >= 0 ? 74 : 38);
    doc.text(fmtNum(net), 158, y + 5);
    doc.setTextColor(0, 0, 0);
    y += 7;
  });

  // Cash flow section
  y += 10;
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Cash Flow Summary", 14, y);
  y += 6;

  doc.setFillColor(30, 41, 59);
  doc.rect(14, y, pageW - 28, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text("Month", 18, y + 5.5);
  doc.text("Operating CF", 80, y + 5.5);
  doc.text("Loan Pmts", 128, y + 5.5);
  doc.text("Net CF", 162, y + 5.5);
  doc.setTextColor(0, 0, 0);
  y += 8;

  [...months].reverse().forEach((m, i) => {
    if (y > 270) { doc.addPage(); y = 20; }
    const key = format(m, "yyyy-MM");
    const label = format(m, "MMMM yyyy");
    const mTx = txByMonth[key] || [];
    const inc = mTx.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
    const exp = mTx.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
    const opCF = inc - exp;
    const netCF = opCF - loanPayments;

    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(14, y, pageW - 28, 7, "F");
    }
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(label, 18, y + 5);
    doc.setTextColor(opCF >= 0 ? 22 : 220, opCF >= 0 ? 163 : 38, opCF >= 0 ? 74 : 38);
    doc.text(fmtNum(opCF), 80, y + 5);
    doc.setTextColor(220, 38, 38);
    doc.text(fmtNum(loanPayments), 128, y + 5);
    doc.setTextColor(netCF >= 0 ? 22 : 220, netCF >= 0 ? 163 : 38, netCF >= 0 ? 74 : 38);
    doc.text(fmtNum(netCF), 162, y + 5);
    doc.setTextColor(0, 0, 0);
    y += 7;
  });

  doc.save(`Financial_Report_${rangeMonths}mo_${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

export default function Reports() {
  const [activeTab, setActiveTab] = useState("corporate_docs");
  const [rangeMonths, setRangeMonths] = useState("6");
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [showAddCOA, setShowAddCOA] = useState(false);
  const [editingCOA, setEditingCOA] = useState(null);
  const [coaTypeFilter, setCoaTypeFilter] = useState("all");
  const queryClient = useQueryClient();

  // Date range filter (shared across tabs) — defaults to full year-to-date from Jan 1, 2026
  const defaultEnd = format(new Date(), "yyyy-MM-dd");
  const defaultStart = "2026-01-01";
  const [dateFrom, setDateFrom] = useState(defaultStart);
  const [dateTo, setDateTo] = useState(defaultEnd);

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => fetchAllTransactions("-date"),
  });

  const { data: loans = [] } = useQuery({
    queryKey: ["bankloans"],
    queryFn: () => base44.entities.BankLoan.list("-created_date", 500),
  });

  const { data: wcLoans = [] } = useQuery({
    queryKey: ["workingcapitalloans"],
    queryFn: () => base44.entities.WorkingCapitalLoan.list("-created_date", 500),
  });

  const { data: chartOfAccounts = [] } = useQuery({
    queryKey: ["chartofaccounts"],
    queryFn: () => base44.entities.ChartOfAccount.list("account_code", 1000),
  });

  const createCOAMutation = useMutation({
    mutationFn: (data) => base44.entities.ChartOfAccount.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chartofaccounts"] }),
  });

  const updateCOAMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ChartOfAccount.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chartofaccounts"] }),
  });

  const deleteCOAMutation = useMutation({
    mutationFn: (id) => base44.entities.ChartOfAccount.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chartofaccounts"] }),
  });

  const allLoans = [...loans, ...wcLoans].map(normalizeLoan);
  const activeLoans = allLoans.filter(l => l.status === "active");
  
  const filteredCOA = coaTypeFilter === "all" ? chartOfAccounts : chartOfAccounts.filter(a => a.account_type === coaTypeFilter);
  const coaTypeCounts = chartOfAccounts.reduce((acc, a) => {
    acc[a.account_type] = (acc[a.account_type] || 0) + 1;
    return acc;
  }, {});

  const months = useMemo(() => {
    const start = startOfMonth(parseISO(dateFrom));
    const end = startOfMonth(parseISO(dateTo));
    return eachMonthOfInterval({ start, end });
  }, [dateFrom, dateTo]);

  const filteredTransactions = useMemo(() => {
    if (!dateFrom && !dateTo) return transactions;
    return transactions.filter(t => {
      if (!t.date) return false;
      const d = t.date;
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      return true;
    });
  }, [transactions, dateFrom, dateTo]);

  const txByMonth = useMemo(() => {
    const map = {};
    filteredTransactions.forEach(t => {
      if (!t.date) return;
      const key = format(parseISO(t.date), "yyyy-MM");
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [filteredTransactions]);

  // Totals for the selected range
  const rangeTx = filteredTransactions;
  const rangeIncome = rangeTx.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const rangeExpenses = rangeTx.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  const rangeNet = rangeIncome - rangeExpenses;

  const currentMonthKey = format(new Date(), "yyyy-MM");
  const currentTx = txByMonth[currentMonthKey] || [];
  const rangeLabel = `${format(parseISO(dateFrom), "MMM d, yyyy")} – ${format(parseISO(dateTo), "MMM d, yyyy")}`;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">Financial reports and summaries</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground whitespace-nowrap">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-muted-foreground whitespace-nowrap">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          {activeTab === "pnl" && (
            <>
              <Button variant="outline" onClick={() => exportToExcel({ months, txByMonth, activeLoans, rangeMonths })}>
                <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
              </Button>
              <Button variant="outline" onClick={() => exportToPDF({ months, txByMonth, activeLoans, rangeMonths })}>
                <FileText className="w-4 h-4 mr-2" /> Export PDF
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs */}
      <ReportsTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "weekly_collated" && (
        <WeeklyCollatedReport />
      )}

      {activeTab === "efficiency" && (
        <EfficiencyReport dateFrom={dateFrom} dateTo={dateTo} />
      )}

      {activeTab === "trend" && (
        <IncomeTrendChart transactions={filteredTransactions} dateFrom={dateFrom} dateTo={dateTo} />
      )}

      {activeTab === "wc_loans" && (
        <WorkingCapitalLoansReport loans={allLoans} />
      )}

      {activeTab === "bank_transactions" && (
        <BankTransactionsReport dateFrom={dateFrom} dateTo={dateTo} />
      )}

      {activeTab === "balance_sheet" && (
        <BalanceSheetReport asOfDate={format(parseISO(dateTo), "MMMM d, yyyy")} />
      )}

      {activeTab === "income_statement" && (
        <IncomeStatementReport dateFrom={dateFrom} dateTo={dateTo} />
      )}

      {activeTab === "comparative_income_statement" && (
        <ComparativeIncomeStatement />
      )}

      {activeTab === "daily_transactions" && (
        <DailyTransactionsReport dateFrom={dateFrom} dateTo={dateTo} />
      )}

      {activeTab === "monthly_transactions" && (
        <MonthlyTransactionsReport dateFrom={dateFrom} dateTo={dateTo} />
      )}

      {activeTab === "chart_of_accounts" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{chartOfAccounts.length} accounts</h2>
              <p className="text-sm text-muted-foreground">Used to classify transaction descriptions</p>
            </div>
            <div className="flex items-center gap-3">
              <Select value={coaTypeFilter} onValueChange={setCoaTypeFilter}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                  <SelectItem value="asset">Asset</SelectItem>
                  <SelectItem value="liability">Liability</SelectItem>
                  <SelectItem value="equity">Equity</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => setShowAddCOA(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Account
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {Object.entries(coaTypeCounts).map(([type, count]) => (
              <button
                key={type}
                onClick={() => setCoaTypeFilter(coaTypeFilter === type ? "all" : type)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${TYPE_COLORS[type] || "bg-muted text-muted-foreground"}`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)} ({count})
              </button>
            ))}
          </div>

          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Code</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Account Name</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Type</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Category</th>
                    <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Notes</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCOA.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-16">
                        <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-muted-foreground text-sm">No accounts yet. Add your first account.</p>
                      </td>
                    </tr>
                  )}
                  {filteredCOA.map((a) => (
                    <tr key={a.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{a.account_code || "—"}</td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{a.account_name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-xs ${TYPE_COLORS[a.account_type] || ""}`}>
                          {a.account_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {a.category
                          ? <Badge variant="secondary" className="text-xs">{COA_CATEGORY_LABELS[a.category] || a.category}</Badge>
                          : <span className="text-xs text-muted-foreground">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground hidden md:table-cell max-w-xs truncate">{a.description || "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => setEditingCOA(a)} className="text-muted-foreground hover:text-foreground transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteCOAMutation.mutate(a.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <AddFormDialog
            open={showAddCOA}
            onOpenChange={setShowAddCOA}
            title="Add Account"
            fields={coaFields}
            onSubmit={(data) => createCOAMutation.mutateAsync(data)}
          />
          <AddFormDialog
            open={!!editingCOA}
            onOpenChange={(v) => { if (!v) setEditingCOA(null); }}
            title="Edit Account"
            fields={coaFields}
            initialData={editingCOA || {}}
            onSubmit={(data) => updateCOAMutation.mutateAsync({ id: editingCOA.id, data })}
          />
        </div>
      )}

      {activeTab === "wht_sync" && (
        <WithholdingTaxSync />
      )}

      {activeTab === "corporate_docs" && (
        <CorporateDocuments />
      )}

      {activeTab === "pnl" && <>
      {/* Range Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-primary/20 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
          <p className="text-2xl font-bold text-primary">{fmt(rangeIncome)}</p>
        </div>
        <div className="bg-card border border-destructive/20 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Expenses</p>
          <p className="text-2xl font-bold text-destructive">{fmt(rangeExpenses)}</p>
        </div>
        <div className={`bg-card border rounded-2xl p-4 ${rangeNet >= 0 ? "border-primary/20" : "border-destructive/20"}`}>
          <p className="text-xs text-muted-foreground mb-1">Net Income</p>
          <div className="flex items-center gap-2">
            <p className={`text-2xl font-bold ${rangeNet >= 0 ? "text-primary" : "text-destructive"}`}>{fmtSigned(rangeNet)}</p>
            {rangeNet >= 0 ? <TrendingUp className="w-5 h-5 text-primary" /> : <TrendingDown className="w-5 h-5 text-destructive" />}
          </div>
          {rangeIncome > 0 && (
            <p className="text-xs text-muted-foreground mt-1">{Math.round((rangeNet / rangeIncome) * 100)}% margin</p>
          )}
        </div>
      </div>

      {/* Current Month Statements */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">
          Current Month — {format(new Date(), "MMMM yyyy")}
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <PnLStatement transactions={currentTx} monthLabel={format(new Date(), "MMMM yyyy")} />
          <CashFlowStatement transactions={currentTx} loans={activeLoans} monthLabel={format(new Date(), "MMMM yyyy")} />
        </div>
      </div>

      {/* Monthly History */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Monthly History</h2>
        <div className="space-y-2">
          {/* Header */}
          <div className="w-full flex items-center px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <span className="w-32">Month</span>
            <span className="flex-1 text-primary">Revenue</span>
            <span className="flex-1 text-destructive">Expenses</span>
            <span className="flex-1">Net</span>
            <span className="w-5" />
          </div>
          {[...months].reverse().map((m) => {
            const key = format(m, "yyyy-MM");
            const label = format(m, "MMMM yyyy");
            const mTx = txByMonth[key] || [];
            const isExpanded = expandedMonth === key;
            return (
              <div key={key}>
                <MonthlySummaryRow
                  month={label}
                  transactions={mTx}
                  onClick={() => setExpandedMonth(isExpanded ? null : key)}
                  isExpanded={isExpanded}
                />
                {isExpanded && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-2 mb-1">
                    <PnLStatement transactions={mTx} monthLabel={label} />
                    <CashFlowStatement transactions={mTx} loans={activeLoans} monthLabel={label} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      </>}
    </div>
  );
}