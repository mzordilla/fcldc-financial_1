import React, { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const typeLabels = {
  loan: "Loan",
  credit_line: "Credit Line",
  equipment_financing: "Equipment",
  vendor_credit: "Vendor Credit",
  mortgage: "Mortgage",
  other: "Other",
};

export default function LoanComparativeReport({ items }) {
  const queryClient = useQueryClient();
  const activeLoans = items.filter(l => l.status === "active");
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(String(currentYear));
  const yearOptions = [currentYear - 1, currentYear, currentYear + 1].map(String);

  const months = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 12; i++) {
      arr.push(`${year}-${String(i + 1).padStart(2, "0")}`);
    }
    return arr;
  }, [year]);

  const { data: payments = [] } = useQuery({
    queryKey: ["loan_payments"],
    queryFn: () => base44.entities.LoanPayment.list("-created_date", 5000),
  });

  const upsertMutation = useMutation({
    mutationFn: async ({ existing, data }) => {
      if (existing) return base44.entities.LoanPayment.update(existing.id, data);
      return base44.entities.LoanPayment.create(data);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["loan_payments"] }),
  });

  const [drafts, setDrafts] = useState({});

  const getCellKey = (loanId, month) => `${loanId}_${month}`;

  const getCell = (loan, month) => {
    const existing = payments.find(p => p.loan_id === loan.id && p.month === month);
    const expected = loan.monthly_payment || 0;
    const monthlyRate = (loan.interest_rate || 0) / 100 / 12;
    const interestComponent = existing?.interest_component ?? Math.round((loan.principal_balance || 0) * monthlyRate);
    const draftKey = getCellKey(loan.id, month);
    const actual = drafts[draftKey] !== undefined ? drafts[draftKey] : (existing?.actual_amount ?? expected);
    const principalComponent = Math.max(0, (Number(actual) || 0) - interestComponent);
    return { existing, expected, interestComponent, principalComponent, actual };
  };

  const handleBlur = (loan, month, cell) => {
    const draftKey = getCellKey(loan.id, month);
    if (drafts[draftKey] === undefined) return;
    const actualAmount = Number(drafts[draftKey]) || 0;
    upsertMutation.mutate({
      existing: cell.existing,
      data: {
        loan_id: loan.id,
        loan_creditor: loan.creditor,
        month,
        expected_amount: cell.expected,
        actual_amount: actualAmount,
        interest_component: cell.interestComponent,
        principal_component: Math.max(0, actualAmount - cell.interestComponent),
      },
    });
    setDrafts(prev => {
      const next = { ...prev };
      delete next[draftKey];
      return next;
    });
  };

  if (activeLoans.length === 0) return null;

  const groupedByType = Object.keys(typeLabels)
    .map(type => ({ type, loans: activeLoans.filter(l => l.type === type) }))
    .filter(g => g.loans.length > 0);

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Comparative Monthly Payments</h2>
          <p className="text-sm text-muted-foreground">Interest vs. principal breakdown per loan — edit the actual amount debited from the bank</p>
        </div>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {yearOptions.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left text-xs font-semibold text-foreground sticky left-0 bg-card">Creditor</th>
              {months.map(m => (
                <th key={m} className="px-4 py-3 text-center text-xs font-semibold text-foreground whitespace-nowrap">
                  {format(new Date(`${m}-01`), "MMM yyyy")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupedByType.map(group => (
              <React.Fragment key={group.type}>
                <tr className="bg-muted/20">
                  <td colSpan={months.length + 1} className="px-4 py-2 text-xs font-bold text-foreground uppercase tracking-wide sticky left-0 bg-muted/20">
                    {typeLabels[group.type]}
                  </td>
                </tr>
                {group.loans.map(loan => (
                  <tr key={loan.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm font-medium text-foreground whitespace-nowrap sticky left-0 bg-card">{loan.creditor}</td>
                    {months.map(month => {
                      const cell = getCell(loan, month);
                      const draftKey = getCellKey(loan.id, month);
                      return (
                        <td key={month} className="px-2 py-2 text-center align-top">
                          <Input
                            type="number"
                            value={drafts[draftKey] !== undefined ? drafts[draftKey] : cell.actual}
                            onChange={e => setDrafts(prev => ({ ...prev, [draftKey]: e.target.value }))}
                            onBlur={() => handleBlur(loan, month, cell)}
                            className="h-7 text-xs text-right w-28 mx-auto"
                          />
                          <div className="mt-1 text-[10px] text-muted-foreground space-y-0.5">
                            <div>Interest: ₱{cell.interestComponent.toLocaleString()}</div>
                            <div>Principal: ₱{cell.principalComponent.toLocaleString()}</div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="bg-muted/10 font-medium">
                  <td className="px-4 py-2 text-xs text-muted-foreground sticky left-0 bg-muted/10">{typeLabels[group.type]} Subtotal</td>
                  {months.map(month => {
                    const subActual = group.loans.reduce((s, loan) => s + (Number(getCell(loan, month).actual) || 0), 0);
                    const subInterest = group.loans.reduce((s, loan) => s + getCell(loan, month).interestComponent, 0);
                    const subPrincipal = group.loans.reduce((s, loan) => s + getCell(loan, month).principalComponent, 0);
                    return (
                      <td key={month} className="px-2 py-2 text-center">
                        <div className="text-xs text-foreground">₱{subActual.toLocaleString()}</div>
                        <div className="mt-1 text-[10px] text-muted-foreground space-y-0.5">
                          <div>Interest: ₱{subInterest.toLocaleString()}</div>
                          <div>Principal: ₱{subPrincipal.toLocaleString()}</div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </React.Fragment>
            ))}
            <tr className="bg-muted/40 font-semibold">
              <td className="px-4 py-3 text-sm text-foreground sticky left-0 bg-muted/40">Total</td>
              {months.map(month => {
                const totalActual = activeLoans.reduce((s, loan) => s + (Number(getCell(loan, month).actual) || 0), 0);
                const totalInterest = activeLoans.reduce((s, loan) => s + getCell(loan, month).interestComponent, 0);
                const totalPrincipal = activeLoans.reduce((s, loan) => s + getCell(loan, month).principalComponent, 0);
                return (
                  <td key={month} className="px-2 py-3 text-center">
                    <div className="text-xs text-foreground">₱{totalActual.toLocaleString()}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground space-y-0.5">
                      <div>Interest: ₱{totalInterest.toLocaleString()}</div>
                      <div>Principal: ₱{totalPrincipal.toLocaleString()}</div>
                    </div>
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}