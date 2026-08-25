import { BookOpen, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import GLReconcileRow from "./GLReconcileRow";
import { BS_ACCOUNT_NAMES, glFor } from "@/lib/balanceSheetAccounts";

/**
 * General-ledger overlay for the Balance Sheet: every balance-sheet Chart of Account
 * shown beside its entity-derived figure, with the reconciling difference.
 */
export default function GLReconciliationPanel({ bs, ledger, bankAccountNames = [], asOfDate, onDrilldown, onSeed, isSeeding, seedNotice }) {
  const items = [
    { label: "Cash in Bank", value: bs.cashAndBank, names: [BS_ACCOUNT_NAMES.cash, ...bankAccountNames] },
    { label: "Accounts Receivable", value: bs.totalReceivables, names: BS_ACCOUNT_NAMES.receivable },
    { label: "Funding & Loans Receivable", value: bs.totalFundingLoanReceivables, names: BS_ACCOUNT_NAMES.fundingReceivable },
    { label: "Property, Plant & Equipment", value: bs.ppeNetBookValue, names: BS_ACCOUNT_NAMES.ppe },
    { label: "Accounts Payable", value: bs.unpaidPayables, names: BS_ACCOUNT_NAMES.payable, colorClass: "text-destructive" },
    { label: "Other Payables", value: bs.otherPayables, names: BS_ACCOUNT_NAMES.otherPayable, colorClass: "text-destructive" },
    { label: "Withholding Tax Payable", value: bs.withholdingTaxPayable, names: BS_ACCOUNT_NAMES.withholdingTax, colorClass: "text-destructive" },
    { label: "Current Portion of Loans", value: bs.currentPortionLoans, names: BS_ACCOUNT_NAMES.currentLoans, colorClass: "text-destructive" },
    { label: "Long-Term Loans", value: bs.totalNonCurrentLiabilities, names: BS_ACCOUNT_NAMES.longTermLoans, colorClass: "text-destructive" },
  ];

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <BookOpen className="w-4 h-4 text-primary" /> General Ledger Reconciliation
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Chart of Account postings (as of {asOfDate}) compared against the balances above. Expand a line to see the ledger entries behind it.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onSeed} disabled={isSeeding}>
          <RefreshCw className={`w-3.5 h-3.5 mr-2 ${isSeeding ? "animate-spin" : ""}`} />
          {isSeeding ? "Checking..." : "Sync Accounts"}
        </Button>
      </div>

      {seedNotice && (
        <p className="text-xs text-primary bg-primary/10 border border-primary/20 rounded-xl px-3 py-2 mb-2">{seedNotice}</p>
      )}

      {items.map(item => (
        <GLReconcileRow
          key={item.label}
          label={item.label}
          value={item.value}
          accountNames={item.names}
          gl={glFor(ledger, item.names)}
          colorClass={item.colorClass}
          onDrilldown={onDrilldown}
          isSub
        />
      ))}
    </div>
  );
}