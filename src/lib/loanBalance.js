export function getLoanBalance(loan) {
  return Math.max(0, Number(loan?.principal_balance) || 0);
}

export function applyLoanLedgerEntry(loan, entry) {
  const amount = Number(entry.amount) || 0;
  const currentBalance = getLoanBalance(loan);
  const isAvailment = entry.entry_type === "availment";
  const principalBalance = isAvailment ? currentBalance + amount : Math.max(0, currentBalance - amount);

  return {
    ledger_entries: [...(loan.ledger_entries || []), entry],
    amount_availed: (Number(loan.amount_availed) || 0) + (isAvailment ? amount : 0),
    amount_paid: (Number(loan.amount_paid) || 0) + (isAvailment ? 0 : amount),
    principal_balance: principalBalance,
    status: principalBalance === 0 && !isAvailment ? "paid_off" : "active",
  };
}