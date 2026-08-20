// BankLoan and WorkingCapitalLoan use different field names for the same concepts.
// This normalizes a loan record (of either entity type) into the WorkingCapitalLoan shape
// so combined lists render correctly wherever both are shown together.
export function normalizeLoan(loan) {
  // WorkingCapitalLoan records already match the target shape — pass through.
  if (loan.creditor !== undefined || loan.total_amount !== undefined) {
    return loan;
  }
  // BankLoan record — map its fields to the common shape.
  const totalAmount = loan.principal || 0;
  const outstanding = loan.outstanding_balance || 0;
  return {
    ...loan,
    creditor: loan.lender,
    total_amount: totalAmount,
    amount_paid: Math.max(0, totalAmount - outstanding),
    outstanding_balance: outstanding,
    due_date: loan.maturity_date,
    type: loan.loan_type,
    status: loan.status === "in_default" ? "defaulted" : loan.status,
  };
}