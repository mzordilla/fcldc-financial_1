import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { format } from "date-fns";

const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function BSRow({ label, value, isTotal, isSub, colorClass }) {
  return (
    <div className={`flex justify-between py-2 ${isSub ? "pl-6" : ""} ${isTotal ? "border-t border-border font-semibold" : "border-b border-border/30"}`}>
      <span className={`text-sm ${isSub ? "text-muted-foreground" : "text-foreground"}`}>{label}</span>
      <span className={`text-sm font-medium ${colorClass || ""}`}>{value !== undefined ? fmt(value) : ""}</span>
    </div>
  );
}

function SectionHeader({ label }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-5 mb-1">{label}</p>
  );
}

export default function BalanceSheetReport({ asOfDate }) {
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankaccounts"],
    queryFn: () => base44.entities.BankAccount.list("-created_date", 100),
  });

  const { data: receivables = [] } = useQuery({
    queryKey: ["receivables"],
    queryFn: () => base44.entities.Receivable.list("-created_date", 200),
  });

  const { data: payables = [] } = useQuery({
    queryKey: ["payables"],
    queryFn: () => base44.entities.Payable.list("-created_date", 200),
  });

  const { data: loans = [] } = useQuery({
    queryKey: ["bankloans"],
    queryFn: () => base44.entities.BankLoan.list("-created_date", 50),
  });

  const { data: wcLoans = [] } = useQuery({
    queryKey: ["workingcapitalloans"],
    queryFn: () => base44.entities.WorkingCapitalLoan.list("-created_date", 50),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => base44.entities.Transaction.list("-date", 1000),
  });

  const bs = useMemo(() => {
    // --- ASSETS ---
    // Current Assets
    const cashAndBank = bankAccounts
      .filter(a => a.status === "active")
      .reduce((s, a) => s + (a.current_balance || 0), 0);

    const totalReceivables = receivables
      .filter(r => r.status !== "paid")
      .reduce((s, r) => s + ((r.amount || 0) - (r.amount_paid || 0)), 0);

    const totalCurrentAssets = cashAndBank + totalReceivables;

    // Non-Current Assets: transactions tagged as non_current_assets
    const nonCurrentAssetTx = transactions
      .filter(t => t.category === "non_current_assets" && t.type === "expense")
      .reduce((s, t) => s + (t.amount || 0), 0);

    const equipmentTx = transactions
      .filter(t => t.category === "equipment" && t.type === "expense")
      .reduce((s, t) => s + (t.amount || 0), 0);

    const totalNonCurrentAssets = nonCurrentAssetTx + equipmentTx;
    const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

    // --- LIABILITIES ---
    // Current Liabilities
    const unpaidPayables = payables
      .filter(p => p.status !== "paid")
      .reduce((s, p) => s + ((p.amount || 0) - (p.amount_paid || 0)), 0);

    const currentPortionLoans = [...loans, ...wcLoans]
      .filter(l => l.status === "active")
      .reduce((s, l) => s + ((l.monthly_payment || 0) * 12), 0);

    const totalCurrentLiabilities = unpaidPayables + currentPortionLoans;

    // Non-Current Liabilities: outstanding loan balances minus current portion
    const loanBalances = loans
      .filter(l => l.status === "active")
      .reduce((s, l) => s + (l.outstanding_balance || 0), 0);

    const wcLoanBalances = wcLoans
      .filter(l => l.status === "active")
      .reduce((s, l) => s + ((l.total_amount || 0) - (l.amount_paid || 0)), 0);

    const totalNonCurrentLiabilities = Math.max(0, (loanBalances + wcLoanBalances) - currentPortionLoans);
    const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;

    // --- EQUITY ---
    const totalIncome = transactions
      .filter(t => t.type === "income")
      .reduce((s, t) => s + (t.amount || 0), 0);
    const totalExpenses = transactions
      .filter(t => t.type === "expense")
      .reduce((s, t) => s + (t.amount || 0), 0);
    const retainedEarnings = totalIncome - totalExpenses;
    const totalEquity = totalAssets - totalLiabilities;

    return {
      cashAndBank,
      totalReceivables,
      totalCurrentAssets,
      nonCurrentAssetTx,
      equipmentTx,
      totalNonCurrentAssets,
      totalAssets,
      unpaidPayables,
      currentPortionLoans,
      totalCurrentLiabilities,
      totalNonCurrentLiabilities,
      totalLiabilities,
      retainedEarnings,
      totalEquity,
    };
  }, [bankAccounts, receivables, payables, loans, wcLoans, transactions]);

  const handleExport = () => {
    const rows = [
      ["BALANCE SHEET", `As of ${asOfDate}`],
      [],
      ["ASSETS"],
      ["Current Assets"],
      ["  Cash & Bank Balances", bs.cashAndBank],
      ["  Accounts Receivable", bs.totalReceivables],
      ["  Total Current Assets", bs.totalCurrentAssets],
      [],
      ["Non-Current Assets"],
      ["  Property, Plant & Equipment", bs.equipmentTx],
      ["  Other Non-Current Assets", bs.nonCurrentAssetTx],
      ["  Total Non-Current Assets", bs.totalNonCurrentAssets],
      [],
      ["TOTAL ASSETS", bs.totalAssets],
      [],
      ["LIABILITIES"],
      ["Current Liabilities"],
      ["  Accounts Payable", bs.unpaidPayables],
      ["  Current Portion of Loans", bs.currentPortionLoans],
      ["  Total Current Liabilities", bs.totalCurrentLiabilities],
      [],
      ["Non-Current Liabilities"],
      ["  Long-Term Loans", bs.totalNonCurrentLiabilities],
      ["  Total Non-Current Liabilities", bs.totalNonCurrentLiabilities],
      [],
      ["TOTAL LIABILITIES", bs.totalLiabilities],
      [],
      ["EQUITY"],
      ["  Retained Earnings", bs.retainedEarnings],
      ["  Total Equity", bs.totalEquity],
      [],
      ["TOTAL LIABILITIES & EQUITY", bs.totalLiabilities + bs.totalEquity],
    ];
    const ws = XLSX.utils.aoa_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Balance Sheet");
    XLSX.writeFile(wb, `Balance_Sheet_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Balance Sheet</h2>
          <p className="text-sm text-muted-foreground">As of {asOfDate}</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <FileSpreadsheet className="w-4 h-4 mr-2" /> Export Excel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-base font-semibold text-foreground mb-2">Assets</h3>

          <SectionHeader label="Current Assets" />
          <BSRow label="Cash & Bank Balances" value={bs.cashAndBank} isSub />
          <BSRow label="Accounts Receivable" value={bs.totalReceivables} isSub />
          <BSRow label="Total Current Assets" value={bs.totalCurrentAssets} isTotal colorClass="text-primary" />

          <SectionHeader label="Non-Current Assets" />
          <BSRow label="Property, Plant & Equipment" value={bs.equipmentTx} isSub />
          <BSRow label="Other Non-Current Assets" value={bs.nonCurrentAssetTx} isSub />
          <BSRow label="Total Non-Current Assets" value={bs.totalNonCurrentAssets} isTotal />

          <div className="flex justify-between items-center mt-4 pt-3 border-t-2 border-border">
            <span className="font-bold text-foreground">TOTAL ASSETS</span>
            <span className="text-lg font-bold text-primary">{fmt(bs.totalAssets)}</span>
          </div>
        </div>

        {/* Liabilities & Equity */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-base font-semibold text-foreground mb-2">Liabilities & Equity</h3>

          <SectionHeader label="Current Liabilities" />
          <BSRow label="Accounts Payable" value={bs.unpaidPayables} isSub />
          <BSRow label="Current Portion of Loans" value={bs.currentPortionLoans} isSub />
          <BSRow label="Total Current Liabilities" value={bs.totalCurrentLiabilities} isTotal colorClass="text-destructive" />

          <SectionHeader label="Non-Current Liabilities" />
          <BSRow label="Long-Term Loans" value={bs.totalNonCurrentLiabilities} isSub />
          <BSRow label="Total Non-Current Liabilities" value={bs.totalNonCurrentLiabilities} isTotal />

          <BSRow label="TOTAL LIABILITIES" value={bs.totalLiabilities} isTotal colorClass="text-destructive" />

          <SectionHeader label="Equity" />
          <BSRow label="Retained Earnings" value={bs.retainedEarnings} isSub colorClass={bs.retainedEarnings >= 0 ? "text-primary" : "text-destructive"} />
          <BSRow label="Total Equity" value={bs.totalEquity} isTotal colorClass={bs.totalEquity >= 0 ? "text-primary" : "text-destructive"} />

          <div className="flex justify-between items-center mt-4 pt-3 border-t-2 border-border">
            <span className="font-bold text-foreground">TOTAL LIABILITIES & EQUITY</span>
            <span className="text-lg font-bold text-foreground">{fmt(bs.totalLiabilities + bs.totalEquity)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}