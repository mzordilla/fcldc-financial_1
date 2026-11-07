import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fetchAllTransactions } from "@/lib/fetchAllTransactions";
import { incomeStatementAccountNames } from "@/components/reports/comparativeIncomeStatementUtils";
import { buildBoardReport } from "@/lib/boardReport";

const q = (key, fn) => ({ queryKey: key, queryFn: fn });

export default function useBoardReportData(monthKey) {
  const results = [
    useQuery(q(["transactions"], () => fetchAllTransactions("-date"))),
    useQuery(q(["chartofaccounts"], () => base44.entities.ChartOfAccount.list("account_code", 1000))),
    useQuery(q(["ppe_assets"], () => base44.entities.PPEAsset.list("-acquisition_date", 500))),
    useQuery(q(["bankaccounts"], () => base44.entities.BankAccount.list("-created_date", 100))),
    useQuery(q(["board-receivables"], () => base44.entities.Receivable.list("-due_date", 5000))),
    useQuery(q(["board-payables"], () => base44.entities.Payable.list("-due_date", 5000))),
    useQuery(q(["board-loans"], () => base44.entities.WorkingCapitalLoan.list("-created_date", 500))),
    useQuery(q(["board-projects"], () => base44.entities.Project.list("-created_date", 1000))),
    useQuery(q(["board-advances"], () => base44.entities.CustomerAdvance.list("-received_date", 1000))),
    useQuery(q(["board-pos"], () => base44.entities.PurchaseOrder.list("-requested_date", 5000))),
  ];
  const isLoading = results.some((r) => r.isLoading);
  const [transactions, coa, ppeAssets, bankAccounts, receivables, payables, loans, projects, advances, purchaseOrders] = results.map((r) => r.data);

  const report = useMemo(() => {
    if (isLoading) return null;
    return buildBoardReport(monthKey, {
      transactions, ppeAssets, bankAccounts, receivables, payables, loans, projects, advances, purchaseOrders,
      coaMap: incomeStatementAccountNames(coa, bankAccounts),
    });
  }, [isLoading, monthKey, transactions, coa, ppeAssets, bankAccounts, receivables, payables, loans, projects, advances, purchaseOrders]);

  return { report, isLoading };
}