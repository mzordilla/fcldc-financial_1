import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO } from "date-fns";
import { FileSpreadsheet, FileText, Building2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";

const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const fmtSigned = (v, type) => (type === "income" ? "+" : "-") + fmt(Math.abs(v));

const CATEGORY_LABELS = {
  project_payment: "Project Payment",
  material_cost: "Material Cost",
  labor: "Labor",
  equipment: "Equipment",
  subcontractor: "Subcontractor",
  overhead: "Overhead",
  permits: "Permits",
  insurance: "Insurance",
  bank_reconciliation: "Bank Reconciliation",
  other: "Other",
};

export default function BankTransactionsReport({ dateFrom, dateTo }) {
  const [expandedBank, setExpandedBank] = useState(null);

  const { data: allTransactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-date", 500),
  });

  const transactions = useMemo(() => {
    return allTransactions.filter(t => {
      if (!t.date) return false;
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;
      return true;
    });
  }, [allTransactions, dateFrom, dateTo]);

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankaccounts"],
    queryFn: () => base44.entities.BankAccount.list("-created_date", 100),
  });

  const accountMap = useMemo(() =>
    Object.fromEntries(bankAccounts.map(a => [a.id, a])),
    [bankAccounts]
  );

  // Group transactions by bank account
  const byBank = useMemo(() => {
    const map = {};
    // "unassigned" bucket
    transactions.forEach(t => {
      const key = t.bank_account_id || "__none__";
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    return map;
  }, [transactions]);

  // Build ordered list: known accounts first, then unassigned
  const bankKeys = useMemo(() => {
    const keys = bankAccounts.map(a => a.id).filter(id => byBank[id]);
    if (byBank["__none__"]) keys.push("__none__");
    return keys;
  }, [bankAccounts, byBank]);

  function getBankLabel(key) {
    if (key === "__none__") return "Unassigned";
    const acct = accountMap[key];
    return acct ? `${acct.account_name} — ${acct.bank_name}` : key;
  }

  function getBankSummary(txs) {
    const income = txs.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
    const expense = txs.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
    return { income, expense, net: income - expense, count: txs.length };
  }

  function exportToExcel() {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryRows = [["Bank Account", "Transactions", "Income", "Expenses", "Net"]];
    bankKeys.forEach(key => {
      const txs = byBank[key] || [];
      const { income, expense, net } = getBankSummary(txs);
      summaryRows.push([getBankLabel(key), txs.length, income, expense, net]);
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(summaryRows), "Summary");

    // Per-bank sheets
    bankKeys.forEach(key => {
      const txs = byBank[key] || [];
      const label = getBankLabel(key).substring(0, 31); // Excel sheet name limit
      const rows = [["Date", "Description", "Type", "Category", "Project", "Amount"]];
      txs.forEach(t => rows.push([
        t.date || "",
        t.description || "",
        t.type || "",
        CATEGORY_LABELS[t.category] || t.category || "",
        t.project_name || "",
        t.type === "income" ? (t.amount || 0) : -(t.amount || 0),
      ]));
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), label);
    });

    XLSX.writeFile(wb, `Bank_Transactions_Report_${dateFrom || "start"}_to_${dateTo || "end"}.xlsx`);
  }

  function exportToPDF() {
    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Bank Transactions Report", pageW / 2, 16, { align: "center" });
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${format(new Date(), "MMMM d, yyyy")}`, pageW / 2, 23, { align: "center" });

    let y = 32;

    // Summary table
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Summary by Bank Account", 14, y);
    y += 5;

    doc.setFillColor(30, 41, 59);
    doc.rect(14, y, pageW - 28, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text("Bank Account", 18, y + 5.5);
    doc.text("Txns", 110, y + 5.5);
    doc.text("Income", 125, y + 5.5);
    doc.text("Expenses", 153, y + 5.5);
    doc.text("Net", 183, y + 5.5);
    doc.setTextColor(0, 0, 0);
    y += 8;

    bankKeys.forEach((key, i) => {
      const txs = byBank[key] || [];
      const { income, expense, net } = getBankSummary(txs);
      if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(14, y, pageW - 28, 7, "F"); }
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(getBankLabel(key).substring(0, 35), 18, y + 5);
      doc.text(String(txs.length), 110, y + 5);
      doc.setTextColor(22, 163, 74);
      doc.text(fmt(income), 125, y + 5);
      doc.setTextColor(220, 38, 38);
      doc.text(fmt(expense), 153, y + 5);
      doc.setTextColor(net >= 0 ? 22 : 220, net >= 0 ? 163 : 38, net >= 0 ? 74 : 38);
      doc.text(fmt(net), 183, y + 5);
      doc.setTextColor(0, 0, 0);
      y += 7;
    });

    // Per-bank transaction details
    bankKeys.forEach(key => {
      const txs = byBank[key] || [];
      y += 12;
      if (y > 250) { doc.addPage(); y = 20; }

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(getBankLabel(key), 14, y);
      y += 5;

      doc.setFillColor(30, 41, 59);
      doc.rect(14, y, pageW - 28, 8, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7.5);
      doc.text("Date", 18, y + 5.5);
      doc.text("Description", 42, y + 5.5);
      doc.text("Category", 110, y + 5.5);
      doc.text("Project", 148, y + 5.5);
      doc.text("Amount", 183, y + 5.5);
      doc.setTextColor(0, 0, 0);
      y += 8;

      txs.forEach((t, i) => {
        if (y > 272) { doc.addPage(); y = 20; }
        if (i % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(14, y, pageW - 28, 7, "F"); }
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.text(t.date ? format(parseISO(t.date), "MM/dd/yy") : "—", 18, y + 5);
        doc.text((t.description || "").substring(0, 30), 42, y + 5);
        doc.text(CATEGORY_LABELS[t.category] || t.category || "—", 110, y + 5);
        doc.text((t.project_name || "—").substring(0, 18), 148, y + 5);
        doc.setTextColor(t.type === "income" ? 22 : 220, t.type === "income" ? 163 : 38, t.type === "income" ? 74 : 38);
        doc.text((t.type === "income" ? "+" : "-") + fmt(t.amount), 183, y + 5);
        doc.setTextColor(0, 0, 0);
        y += 7;
      });
    });

    doc.save(`Bank_Transactions_Report_${dateFrom || "start"}_to_${dateTo || "end"}.pdf`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Bank Transactions Report</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportToExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
          </Button>
          <Button variant="outline" size="sm" onClick={exportToPDF}>
            <FileText className="w-4 h-4 mr-2" /> Export PDF
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {bankKeys.map(key => {
          const txs = byBank[key] || [];
          const { income, expense, net } = getBankSummary(txs);
          const acct = key !== "__none__" ? accountMap[key] : null;
          return (
            <div key={key} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{acct ? acct.account_name : "Unassigned"}</p>
                  {acct && <p className="text-xs text-muted-foreground">{acct.bank_name}</p>}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Income</p>
                  <p className="text-sm font-semibold text-primary">{fmt(income)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Expenses</p>
                  <p className="text-sm font-semibold text-destructive">{fmt(expense)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Net</p>
                  <p className={`text-sm font-semibold ${net >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(net)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Per-bank transaction tables */}
      {bankKeys.map(key => {
        const txs = byBank[key] || [];
        const acct = key !== "__none__" ? accountMap[key] : null;
        const isExpanded = expandedBank === key;
        const { income, expense, net } = getBankSummary(txs);

        return (
          <div key={key} className="bg-card border border-border rounded-2xl overflow-hidden">
            <button
              onClick={() => setExpandedBank(isExpanded ? null : key)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">{acct ? acct.account_name : "Unassigned"}</p>
                  {acct && <p className="text-xs text-muted-foreground">{acct.bank_name}</p>}
                </div>
                <Badge variant="secondary" className="text-xs">{txs.length} txns</Badge>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-xs text-primary hidden sm:block">{fmt(income)} in</span>
                <span className="text-xs text-destructive hidden sm:block">{fmt(expense)} out</span>
                <span className={`text-sm font-semibold ${net >= 0 ? "text-primary" : "text-destructive"}`}>{fmt(net)} net</span>
                {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Date</th>
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Description</th>
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Category</th>
                      <th className="text-left px-5 py-2.5 text-xs font-medium text-muted-foreground">Project</th>
                      <th className="text-right px-5 py-2.5 text-xs font-medium text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txs.map(t => (
                      <tr key={t.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-5 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                          {t.date ? format(parseISO(t.date), "MMM d, yyyy") : "—"}
                        </td>
                        <td className="px-5 py-2.5 text-sm">{t.description || "—"}</td>
                        <td className="px-5 py-2.5">
                          {t.category && <Badge variant="secondary" className="text-xs">{CATEGORY_LABELS[t.category] || t.category}</Badge>}
                        </td>
                        <td className="px-5 py-2.5 text-xs text-muted-foreground">{t.project_name || "—"}</td>
                        <td className={`px-5 py-2.5 text-right text-sm font-semibold ${t.type === "income" ? "text-primary" : "text-destructive"}`}>
                          {t.type === "income" ? "+" : "-"}₱{(t.amount || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {bankKeys.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">No transactions recorded</div>
      )}
    </div>
  );
}