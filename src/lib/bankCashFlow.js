// Cash flow must only reflect actual money that moved through a bank account.
// Transactions with no linked bank account are accrual-only entries and are excluded.
export const isBankTransaction = (t) => !!t?.bank_account_id;

export const bankOnly = (transactions = []) => transactions.filter(isBankTransaction);