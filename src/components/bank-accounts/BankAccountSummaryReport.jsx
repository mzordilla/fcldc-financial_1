import { useMemo } from "react";
import { Building2 } from "lucide-react";

const fmt = (v) =>
  `₱${Math.abs(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function BankAccountSummaryReport({ accounts, transactions }) {
  const rows = useMemo(() => {
    return accounts.map((account) => {
      const linked = transactions.filter((t) => t.bank_account_id === account.id);
      const deposits = linked.filter((t) => t.type === "income").reduce((s, t) => s + (t.amount || 0), 0);
      const withdrawals = linked.filter((t) => t.type === "expense").reduce((s, t) => s + (t.amount || 0), 0);
      const endingBalance = deposits - withdrawals;
      return { account, deposits, withdrawals, endingBalance };
    });
  }, [accounts, transactions]);

  const totals = rows.reduce(
    (acc, r) => ({
      deposits: acc.deposits + r.deposits,
      withdrawals: acc.withdrawals + r.withdrawals,
      endingBalance: acc.endingBalance + r.endingBalance,
    }),
    { deposits: 0, withdrawals: 0, endingBalance: 0 }
  );

  if (accounts.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="font-medium">No bank accounts added yet</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border">
        <h2 className="text-lg font-bold text-foreground">Bank Account Summary</h2>
        <p className="text-sm text-muted-foreground">Sum of deposits and withdrawals per account, based on linked transactions</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="px-4 py-3 text-left font-semibold text-foreground">Bank Account</th>
              <th className="px-4 py-3 text-right font-semibold text-foreground">Deposits</th>
              <th className="px-4 py-3 text-right font-semibold text-foreground">Withdrawals</th>
              <th className="px-4 py-3 text-right font-semibold text-foreground">Ending Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ account, deposits, withdrawals, endingBalance }) => (
              <tr key={account.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground">{account.account_name}</p>
                  <p className="text-xs text-muted-foreground">{account.bank_name}</p>
                </td>
                <td className="px-4 py-3 text-right text-primary font-medium">+{fmt(deposits)}</td>
                <td className="px-4 py-3 text-right text-destructive font-medium">-{fmt(withdrawals)}</td>
                <td className={`px-4 py-3 text-right font-semibold ${endingBalance < 0 ? "text-destructive" : "text-foreground"}`}>
                  {endingBalance < 0 ? "-" : ""}{fmt(endingBalance)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border bg-muted/40 font-semibold">
              <td className="px-4 py-3 text-foreground">Total</td>
              <td className="px-4 py-3 text-right text-primary">+{fmt(totals.deposits)}</td>
              <td className="px-4 py-3 text-right text-destructive">-{fmt(totals.withdrawals)}</td>
              <td className={`px-4 py-3 text-right ${totals.endingBalance < 0 ? "text-destructive" : "text-foreground"}`}>
                {totals.endingBalance < 0 ? "-" : ""}{fmt(totals.endingBalance)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}