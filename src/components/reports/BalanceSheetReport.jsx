import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { FileSpreadsheet, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import * as XLSX from "xlsx";
import { format, parseISO } from "date-fns";
import { fetchAllTransactions } from "@/lib/fetchAllTransactions";

const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

function SectionHeader({ label }) {
  return <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-5 mb-1">{label}</p>;
}

function BSRow({ label, value, isTotal, isSub, colorClass }) {
  return (
    <div className={`flex justify-between py-2 ${isSub ? "pl-6" : ""} ${isTotal ? "border-t border-border font-semibold" : "border-b border-border/30"}`}>
      <span className={`text-sm ${isSub ? "text-muted-foreground" : "text-foreground"}`}>{label}</span>
      <span className={`text-sm font-medium ${colorClass || ""}`}>{value !== undefined ? fmt(value) : ""}</span>
    </div>
  );
}

function ExpandableBSRow({ label, value, items = [], renderItem, isSub, colorClass }) {
  const [open, setOpen] = useState(false);
  const hasDetail = items.length > 0;

  return (
    <>
      <div
        className={`flex justify-between py-2 ${isSub ? "pl-6" : ""} border-b border-border/30 ${hasDetail ? "cursor-pointer hover:bg-muted/30" : ""}`}
        onClick={() => hasDetail && setOpen(o => !o)}
      >
        <span className={`flex items-center gap-1 text-sm ${isSub ? "text-muted-foreground" : "text-foreground"}`}>
          {hasDetail ? (
            open ? <ChevronDown className="w-3.5 h-3.5 flex-shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
          ) : <span className="w-3.5" />}
          {label}
        </span>
        <span className={`text-sm font-medium ${colorClass || ""}`}>{fmt(value)}</span>
      </div>
      {open && (
        <div className="bg-muted/20 border-b border-border/30">
          <table className="w-full text-xs">
            <tbody>{items.map((item, i) => renderItem(item, i))}</tbody>
          </table>
        </div>
      )}
    </>
  );
}

export default function BalanceSheetReport({ asOfDate }) {
  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankaccounts"],
    queryFn: () => base44.entities.BankAccount.list("-created_date", 100),
  });

  const { data: receivables = [] } = useQuery({
    queryKey: ["receivables"],
    queryFn: () => base44.entities.Receivable.list("-created_date", 10000),
  });

  const { data: payables = [] } = useQuery({
    queryKey: ["payables"],
    queryFn: () => base44.entities.Payable.list("-created_date", 10000),
  });

  const { data: loans = [] } = useQuery({
    queryKey: ["bankloans"],
    queryFn: () => base44.entities.BankLoan.list("-created_date", 500),
  });

  const { data: wcLoans = [] } = useQuery({
    queryKey: ["workingcapitalloans"],
    queryFn: () => base44.entities.WorkingCapitalLoan.list("-created_date", 500),
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => fetchAllTransactions("-date"),
  });

  const { data: ppeAssets = [] } = useQuery({
    queryKey: ["ppeassets"],
    queryFn: () => base44.entities.PPEAsset.list("-created_date", 5000),
  });

  const bs = useMemo(() => {
    const activeBankAccounts = bankAccounts.filter(a => a.status === "active");
    const cashAndBank = activeBankAccounts.reduce((s, a) => s + (a.current_balance || 0), 0);

    const outstandingReceivables = receivables.filter(r => r.status !== "paid" && r.receivable_type !== "funding_loan");
    const totalReceivables = outstandingReceivables.reduce((s, r) => s + ((r.amount || 0) - (r.amount_paid || 0)), 0);

    const outstandingFundingLoanReceivables = receivables.filter(r => r.status !== "paid" && r.receivable_type === "funding_loan");
    const totalFundingLoanReceivables = outstandingFundingLoanReceivables.reduce((s, r) => s + ((r.amount || 0) - (r.amount_paid || 0)), 0);

    const totalCurrentAssets = cashAndBank + totalReceivables + totalFundingLoanReceivables;

    const nonCurrentAssetTxList = transactions.filter(t => t.category === "non_current_assets" && t.type === "expense");
    const nonCurrentAssetTx = nonCurrentAssetTxList.reduce((s, t) => s + (t.amount || 0), 0);

    const equipmentTxList = transactions.filter(t => t.category === "equipment" && t.type === "expense");
    const equipmentTx = equipmentTxList.reduce((s, t) => s + (t.amount || 0), 0);

    const activePPE = ppeAssets.filter(a => a.status !== "disposed");
    const ppeNetBookValue = activePPE.reduce((s, a) => {
      return s + Math.max(0, (a.acquisition_cost || 0) - (a.accumulated_depreciation || 0));
    }, 0);

    const totalNonCurrentAssets = nonCurrentAssetTx + equipmentTx + ppeNetBookValue;
    const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

    const unpaidPayablesList = payables.filter(p => p.status !== "paid");
    // Net accounts payable = net payable amount (gross - WHT + VAT) less what's already paid
    const netPayable = (p) => (p.amount || 0) - (p.withholding_tax_amount || 0) + (p.vat_amount || 0);
    const unpaidPayables = unpaidPayablesList.reduce((s, p) => s + Math.max(0, netPayable(p) - (p.amount_paid || 0)), 0);

    // Withholding Tax Payable — WHT withheld from unpaid invoices not yet remitted to BIR
    const whtPayableList = unpaidPayablesList.filter(p => (p.withholding_tax_amount || 0) > 0);
    const withholdingTaxPayable = whtPayableList.reduce((s, p) => s + (p.withholding_tax_amount || 0), 0);

    const activeLoans = [...loans, ...wcLoans].filter(l => l.status === "active");
    const currentPortionLoans = activeLoans.reduce((s, l) => s + ((l.monthly_payment || 0) * 12), 0);

    const totalCurrentLiabilities = unpaidPayables + withholdingTaxPayable + currentPortionLoans;

    const loanBalances = loans.filter(l => l.status === "active").reduce((s, l) => s + (l.outstanding_balance || 0), 0);
    const wcLoanBalances = wcLoans.filter(l => l.status === "active").reduce((s, l) => s + ((l.total_amount || 0) - (l.amount_paid || 0)), 0);
    const totalNonCurrentLiabilities = Math.max(0, (loanBalances + wcLoanBalances) - currentPortionLoans);
    const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;

    const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
    const totalExpenses = transactions.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
    const retainedEarnings = totalIncome - totalExpenses;
    const totalEquity = totalAssets - totalLiabilities;

    return {
      cashAndBank, activeBankAccounts,
      totalReceivables, outstandingReceivables,
      totalFundingLoanReceivables, outstandingFundingLoanReceivables,
      totalCurrentAssets,
      nonCurrentAssetTx, nonCurrentAssetTxList,
      equipmentTx, equipmentTxList,
      ppeNetBookValue, activePPE,
      totalNonCurrentAssets, totalAssets,
      unpaidPayables, unpaidPayablesList,
      withholdingTaxPayable, whtPayableList,
      currentPortionLoans, activeLoans,
      totalCurrentLiabilities,
      totalNonCurrentLiabilities,
      totalLiabilities,
      retainedEarnings, totalEquity,
    };
  }, [bankAccounts, receivables, payables, loans, wcLoans, transactions, ppeAssets]);

  const handleExport = () => {
    const rows = [
      ["BALANCE SHEET", `As of ${asOfDate}`],
      [],
      ["ASSETS"],
      ["Current Assets"],
      ["  Cash & Bank Balances", bs.cashAndBank],
      ["  Accounts Receivable", bs.totalReceivables],
      ["  Funding & Loans Receivable", bs.totalFundingLoanReceivables],
      ["  Total Current Assets", bs.totalCurrentAssets],
      [],
      ["Non-Current Assets"],
      ["  PPE Assets (Net Book Value)", bs.ppeNetBookValue],
      ["  Equipment (Transactions)", bs.equipmentTx],
      ["  Other Non-Current Assets", bs.nonCurrentAssetTx],
      ["  Total Non-Current Assets", bs.totalNonCurrentAssets],
      [],
      ["TOTAL ASSETS", bs.totalAssets],
      [],
      ["LIABILITIES"],
      ["Current Liabilities"],
      ["  Accounts Payable", bs.unpaidPayables],
      ["  Withholding Tax Payable", bs.withholdingTaxPayable],
      ["  Current Portion of Loans", bs.currentPortionLoans],
      ["  Total Current Liabilities", bs.totalCurrentLiabilities],
      [],
      ["Non-Current Liabilities"],
      ["  Long-Term Loans", bs.totalNonCurrentLiabilities],
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

      <p className="text-xs text-muted-foreground italic">Click any line item to see the underlying records</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Assets */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-base font-semibold text-foreground mb-2">Assets</h3>

          <SectionHeader label="Current Assets" />
          <ExpandableBSRow
            label="Cash & Bank Balances" value={bs.cashAndBank} isSub
            items={bs.activeBankAccounts}
            renderItem={(a, i) => (
              <tr key={i} className="border-b border-border/20 hover:bg-muted/30">
                <td className="pl-10 pr-3 py-1.5 text-foreground">{a.account_name}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{a.bank_name}</td>
                <td className="px-3 py-1.5 text-right font-medium">{fmt(a.current_balance)}</td>
              </tr>
            )}
          />
          <ExpandableBSRow
            label="Accounts Receivable" value={bs.totalReceivables} isSub
            items={bs.outstandingReceivables}
            renderItem={(r, i) => (
              <tr key={i} className="border-b border-border/20 hover:bg-muted/30">
                <td className="pl-10 pr-3 py-1.5 text-foreground">{r.client_name}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{r.project_name || r.invoice_number || "—"}</td>
                <td className="px-3 py-1.5 text-right font-medium">{fmt((r.amount || 0) - (r.amount_paid || 0))}</td>
              </tr>
            )}
          />
          <ExpandableBSRow
            label="Funding & Loans Receivable" value={bs.totalFundingLoanReceivables} isSub
            items={bs.outstandingFundingLoanReceivables}
            renderItem={(r, i) => (
              <tr key={i} className="border-b border-border/20 hover:bg-muted/30">
                <td className="pl-10 pr-3 py-1.5 text-foreground">{r.client_name}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{r.invoice_number || "—"}</td>
                <td className="px-3 py-1.5 text-right font-medium">{fmt((r.amount || 0) - (r.amount_paid || 0))}</td>
              </tr>
            )}
          />
          <BSRow label="Total Current Assets" value={bs.totalCurrentAssets} isTotal colorClass="text-primary" />

          <SectionHeader label="Non-Current Assets" />
          <ExpandableBSRow
            label="PPE Assets (Net Book Value)" value={bs.ppeNetBookValue} isSub
            items={bs.activePPE}
            renderItem={(a, i) => (
              <tr key={i} className="border-b border-border/20 hover:bg-muted/30">
                <td className="pl-10 pr-3 py-1.5 text-foreground">{a.asset_name}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{a.asset_type?.replace(/_/g, " ")}</td>
                <td className="px-3 py-1.5 text-right font-medium">{fmt(Math.max(0, (a.acquisition_cost || 0) - (a.accumulated_depreciation || 0)))}</td>
              </tr>
            )}
          />
          <ExpandableBSRow
            label="Equipment (Transactions)" value={bs.equipmentTx} isSub
            items={bs.equipmentTxList}
            renderItem={(t, i) => (
              <tr key={i} className="border-b border-border/20 hover:bg-muted/30">
                <td className="pl-10 pr-3 py-1.5 text-muted-foreground whitespace-nowrap">{t.date ? format(parseISO(t.date), "MMM d, yyyy") : "—"}</td>
                <td className="px-3 py-1.5 text-foreground">{t.description || "—"}</td>
                <td className="px-3 py-1.5 text-right font-medium">{fmt(t.amount)}</td>
              </tr>
            )}
          />
          <ExpandableBSRow
            label="Other Non-Current Assets" value={bs.nonCurrentAssetTx} isSub
            items={bs.nonCurrentAssetTxList}
            renderItem={(t, i) => (
              <tr key={i} className="border-b border-border/20 hover:bg-muted/30">
                <td className="pl-10 pr-3 py-1.5 text-muted-foreground whitespace-nowrap">{t.date ? format(parseISO(t.date), "MMM d, yyyy") : "—"}</td>
                <td className="px-3 py-1.5 text-foreground">{t.description || "—"}</td>
                <td className="px-3 py-1.5 text-right font-medium">{fmt(t.amount)}</td>
              </tr>
            )}
          />
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
          <ExpandableBSRow
            label="Accounts Payable" value={bs.unpaidPayables} isSub
            items={bs.unpaidPayablesList}
            renderItem={(p, i) => (
              <tr key={i} className="border-b border-border/20 hover:bg-muted/30">
                <td className="pl-10 pr-3 py-1.5 text-foreground">{p.supplier_name}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{p.invoice_number || p.project_name || "—"}</td>
                <td className="px-3 py-1.5 text-right font-medium">{fmt((p.amount || 0) - (p.amount_paid || 0))}</td>
              </tr>
            )}
          />
          <ExpandableBSRow
            label="Withholding Tax Payable" value={bs.withholdingTaxPayable} isSub
            items={bs.whtPayableList}
            renderItem={(p, i) => (
              <tr key={i} className="border-b border-border/20 hover:bg-muted/30">
                <td className="pl-10 pr-3 py-1.5 text-foreground">{p.supplier_name}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{p.invoice_number || p.project_name || "—"} ({p.withholding_tax_percentage || 0}%)</td>
                <td className="px-3 py-1.5 text-right font-medium">{fmt(p.withholding_tax_amount)}</td>
              </tr>
            )}
          />
          <ExpandableBSRow
            label="Current Portion of Loans" value={bs.currentPortionLoans} isSub
            items={bs.activeLoans}
            renderItem={(l, i) => (
              <tr key={i} className="border-b border-border/20 hover:bg-muted/30">
                <td className="pl-10 pr-3 py-1.5 text-foreground">{l.lender || l.creditor}</td>
                <td className="px-3 py-1.5 text-muted-foreground">{l.loan_name || l.description || "—"}</td>
                <td className="px-3 py-1.5 text-right font-medium">{fmt((l.monthly_payment || 0) * 12)}</td>
              </tr>
            )}
          />
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