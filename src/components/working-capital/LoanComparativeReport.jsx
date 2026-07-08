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
  const [beginningBalanceOverrides, setBeginningBalanceOverrides] = useState({});

  const getCellKey = (loanId, month) => `${loanId}_${month}`;

  const buildSchedule = (loan) => {
    const monthlyRate = (loan.interest_rate || 0) / 100 / 12;
    let runningBalance = beginningBalanceOverrides[loan.id] !== undefined
      ? Number(beginningBalanceOverrides[loan.id]) || 0
      : (loan.principal_balance || 0);
    const schedule = {};
    months.forEach(month => {
      const existing = payments.find(p => p.loan_id === loan.id && p.month === month);
      const expected = loan.monthly_payment || 0;
      const beginningBalance = runningBalance;
      const interestComponent = existing?.interest_component ?? Math.round(beginningBalance * monthlyRate);
      const draftKey = getCellKey(loan.id, month);
      const actual = drafts[draftKey] !== undefined ? drafts[draftKey] : (existing?.actual_amount ?? expected);
      const principalComponent = Math.max(0, (Number(actual) || 0) - interestComponent);
      const endingBalance = Math.max(0, beginningBalance - principalComponent);
      const finished = endingBalance <= 0;
      schedule[month] = { existing, expected, interestComponent, principalComponent, actual, beginningBalance, endingBalance, finished };
      runningBalance = endingBalance;
    });
    return schedule;
  };

  const getCell = (loan, month) => buildSchedule(loan)[month];

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
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border border-border px-3 py-2 text-left font-semibold text-foreground sticky left-0 bg-muted/50 z-10">Creditor</th>
              <th className="border border-border px-2 py-2 text-left font-semibold text-foreground bg-muted/50 whitespace-nowrap">Row</th>
              {months.map(m => (
                <th key={m} className="border border-border px-2 py-2 text-center font-semibold text-foreground bg-muted/50 whitespace-nowrap">
                  {format(new Date(`${m}-01`), "MMM yyyy")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupedByType.map(group => (
              <React.Fragment key={group.type}>
                <tr className="bg-muted/20">
                  <td colSpan={months.length + 2} className="border border-border px-3 py-1.5 font-bold text-foreground uppercase tracking-wide sticky left-0 bg-muted/20">
                    {typeLabels[group.type]}
                  </td>
                </tr>
                {group.loans.map(loan => {
                  const schedule = buildSchedule(loan);
                  const rows = [
                    { key: "actual", label: "Actual Paid" },
                    { key: "interestComponent", label: "Interest" },
                    { key: "principalComponent", label: "Principal" },
                    { key: "endingBalance", label: "Ending Balance" },
                  ];
                  return (
                    <React.Fragment key={loan.id}>
                      {rows.map((row, rowIdx) => (
                        <tr key={row.key} className="hover:bg-muted/30">
                          {rowIdx === 0 && (
                            <td rowSpan={rows.length} className="border border-border px-3 py-2 align-top font-medium text-foreground whitespace-nowrap sticky left-0 bg-card">
                              {loan.creditor}
                              <div className="mt-1 font-normal text-muted-foreground flex items-center gap-1">
                                <span>Beginning Principal (Jan 1): ₱</span>
                                <Input
                                  type="number"
                                  value={beginningBalanceOverrides[loan.id] !== undefined ? beginningBalanceOverrides[loan.id] : (loan.principal_balance || 0)}
                                  onChange={e => setBeginningBalanceOverrides(prev => ({ ...prev, [loan.id]: e.target.value }))}
                                  className="h-6 text-xs text-right w-24"
                                />
                              </div>
                            </td>
                          )}
                          <td className="border border-border px-2 py-1.5 text-muted-foreground whitespace-nowrap bg-muted/5">{row.label}</td>
                          {months.map(month => {
                            const cell = schedule[month];
                            const draftKey = getCellKey(loan.id, month);
                            if (row.key === "actual") {
                              return (
                                <td key={month} className="border border-border px-1 py-1 text-center">
                                  <Input
                                    type="number"
                                    value={drafts[draftKey] !== undefined ? drafts[draftKey] : cell.actual}
                                    onChange={e => setDrafts(prev => ({ ...prev, [draftKey]: e.target.value }))}
                                    onBlur={() => handleBlur(loan, month, cell)}
                                    className="h-6 text-xs text-right w-24 mx-auto"
                                  />
                                </td>
                              );
                            }
                            return (
                              <td key={month} className="border border-border px-2 py-1.5 text-right">
                                ₱{cell[row.key].toLocaleString()}
                                {row.key === "endingBalance" && cell.finished && (
                                  <span className="block text-primary font-semibold">Paid Off</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  );
                })}
                <tr className="bg-muted/10 font-medium">
                  <td colSpan={2} className="border border-border px-3 py-1.5 text-muted-foreground sticky left-0 bg-muted/10">{typeLabels[group.type]} Subtotal</td>
                  {months.map(month => {
                    const subActual = group.loans.reduce((s, loan) => s + (Number(getCell(loan, month).actual) || 0), 0);
                    return (
                      <td key={month} className="border border-border px-2 py-1.5 text-right">₱{subActual.toLocaleString()}</td>
                    );
                  })}
                </tr>
              </React.Fragment>
            ))}
            <tr className="bg-muted/40 font-semibold">
              <td colSpan={2} className="border border-border px-3 py-2 text-foreground sticky left-0 bg-muted/40">Total</td>
              {months.map(month => {
                const totalActual = activeLoans.reduce((s, loan) => s + (Number(getCell(loan, month).actual) || 0), 0);
                return (
                  <td key={month} className="border border-border px-2 py-2 text-right">₱{totalActual.toLocaleString()}</td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}