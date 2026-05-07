import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, startOfMonth, eachMonthOfInterval, subMonths, parseISO } from "date-fns";
import { TrendingUp, TrendingDown, ChevronDown, ChevronUp, Download, FileSpreadsheet } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

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

export default function Reports() {
  const [rangeMonths, setRangeMonths] = useState("6");
  const [expandedMonth, setExpandedMonth] = useState(null);

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-date", 500),
  });

  const { data: loans = [] } = useQuery({
    queryKey: ["bankloans"],
    queryFn: () => base44.entities.BankLoan.list("-created_date", 50),
  });

  const { data: wcLoans = [] } = useQuery({
    queryKey: ["workingcapitalloans"],
    queryFn: () => base44.entities.WorkingCapitalLoan.list("-created_date", 50),
  });

  const allLoans = [...loans, ...wcLoans];
  const activeLoans = allLoans.filter(l => l.status === "active");

  const months = useMemo(() => {
    const n = parseInt(rangeMonths);
    const end = startOfMonth(new Date());
    const start = subMonths(end, n - 1);
    return eachMonthOfInterval({ start, end });
  }, [rangeMonths]);

  const txByMonth = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      if (!t.date) return;
      const key = format(parseISO(t.date), "yyyy-MM");
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [transactions]);

  // Totals for the selected range
  const rangeTx = months.flatMap(m => txByMonth[format(m, "yyyy-MM")] || []);
  const rangeIncome = rangeTx.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
  const rangeExpenses = rangeTx.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
  const rangeNet = rangeIncome - rangeExpenses;

  const currentMonthKey = format(new Date(), "yyyy-MM");
  const currentTx = txByMonth[currentMonthKey] || [];

  // Build flat summary rows for all months in range
  const buildSummaryRows = () => {
    return [...months].reverse().map(m => {
      const key = format(m, "yyyy-MM");
      const mTx = txByMonth[key] || [];
      const income = mTx.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
      const expenses = mTx.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
      const loanPayments = activeLoans.reduce((s, l) => s + (l.monthly_payment || 0), 0);
      const netIncome = income - expenses;
      const netCF = netIncome - loanPayments;
      return { Month: format(m, "MMMM yyyy"), Revenue: income, Expenses: expenses, "Net Income": netIncome, "Loan Payments": loanPayments, "Net Cash Flow": netCF };
    });
  };

  const exportExcel = () => {
    const rows = buildSummaryRows();
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "P&L Summary");

    // Add category breakdown sheet
    const catRows = [];
    [...months].reverse().forEach(m => {
      const key = format(m, "yyyy-MM");
      const mTx = txByMonth[key] || [];
      const byCategory = {};
      mTx.forEach(t => {
        const cat = CATEGORY_LABELS[t.category] || t.category || "Other";
        if (!byCategory[cat]) byCategory[cat] = { income: 0, expense: 0 };
        byCategory[cat][t.type] += (t.amount || 0);
      });
      Object.entries(byCategory).forEach(([cat, vals]) => {
        catRows.push({ Month: format(m, "MMMM yyyy"), Category: cat, Income: vals.income, Expenses: vals.expense });
      });
    });
    const ws2 = XLSX.utils.json_to_sheet(catRows);
    XLSX.utils.book_append_sheet(wb, ws2, "Category Breakdown");
    XLSX.writeFile(wb, `Financial_Report_${rangeMonths}mo_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    const rows = buildSummaryRows();
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Financial Report", 14, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy")}  |  Range: Last ${rangeMonths} months`, 14, 26);
    doc.text(`Total Revenue: ${fmt(rangeIncome)}   Total Expenses: ${fmt(rangeExpenses)}   Net Income: ${fmtSigned(rangeNet)}`, 14, 33);

    doc.setTextColor(0);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("P&L Summary", 14, 45);

    // Table header
    const cols = ["Month", "Revenue", "Expenses", "Net Income", "Loan Payments", "Net Cash Flow"];
    const colX = [14, 55, 90, 125, 155, 182];
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setFillColor(240, 240, 240);
    doc.rect(14, 48, pageW - 28, 7, "F");
    cols.forEach((c, i) => doc.text(c, colX[i], 53));

    doc.setFont("helvetica", "normal");
    let y = 60;
    rows.forEach((row, idx) => {
      if (y > 270) { doc.addPage(); y = 20; }
      if (idx % 2 === 0) { doc.setFillColor(250, 250, 250); doc.rect(14, y - 4, pageW - 28, 7, "F"); }
      const vals = [row.Month, fmt(row.Revenue), fmt(row.Expenses), fmtSigned(row["Net Income"]), fmt(row["Loan Payments"]), fmtSigned(row["Net Cash Flow"])];
      vals.forEach((v, i) => doc.text(String(v), colX[i], y));
      y += 8;
    });

    doc.save(`Financial_Report_${rangeMonths}mo_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">Monthly P&L summaries and cash flow statements</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={rangeMonths} onValueChange={setRangeMonths}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Last 3 months</SelectItem>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportExcel} className="gap-2">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportPDF} className="gap-2">
            <Download className="w-4 h-4" /> PDF
          </Button>
        </div>
      </div>

      {/* Range Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-primary/20 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Revenue ({rangeMonths}mo)</p>
          <p className="text-2xl font-bold text-primary">{fmt(rangeIncome)}</p>
        </div>
        <div className="bg-card border border-destructive/20 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Expenses ({rangeMonths}mo)</p>
          <p className="text-2xl font-bold text-destructive">{fmt(rangeExpenses)}</p>
        </div>
        <div className={`bg-card border rounded-2xl p-4 ${rangeNet >= 0 ? "border-primary/20" : "border-destructive/20"}`}>
          <p className="text-xs text-muted-foreground mb-1">Net Income ({rangeMonths}mo)</p>
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
    </div>
  );
}