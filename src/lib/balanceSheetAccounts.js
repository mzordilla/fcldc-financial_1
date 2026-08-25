import { base44 } from "@/api/base44Client";

// Standard balance-sheet Chart of Account records that connect ledger postings
// to Balance Sheet line items. Seeding is idempotent (matched by name, case-insensitive).
export const STANDARD_BS_ACCOUNTS = [
  { account_code: "1000", account_name: "Cash in Bank", account_type: "asset", category: "current_assets" },
  { account_code: "1100", account_name: "Accounts Receivable", account_type: "asset", category: "current_assets" },
  { account_code: "1150", account_name: "Funding & Loans Receivable", account_type: "asset", category: "current_assets" },
  { account_code: "1500", account_name: "Property, Plant & Equipment", account_type: "asset", category: "non_current_assets" },
  { account_code: "2000", account_name: "Accounts Payable", account_type: "liability", category: "current_liabilities" },
  { account_code: "2010", account_name: "Other Payables", account_type: "liability", category: "current_liabilities" },
  { account_code: "2100", account_name: "Withholding Tax Payable", account_type: "liability", category: "current_liabilities" },
  { account_code: "2200", account_name: "Current Portion of Loans", account_type: "liability", category: "current_liabilities" },
  { account_code: "2500", account_name: "Long-Term Loans", account_type: "liability", category: "non_current_liabilities" },
  { account_code: "3000", account_name: "Owned Capital", account_type: "equity", category: "other" },
  { account_code: "3100", account_name: "Retained Earnings", account_type: "equity", category: "other" },
];

export const BS_ACCOUNT_NAMES = {
  cash: "Cash in Bank",
  receivable: "Accounts Receivable",
  fundingReceivable: "Funding & Loans Receivable",
  ppe: "Property, Plant & Equipment",
  payable: "Accounts Payable",
  otherPayable: "Other Payables",
  withholdingTax: "Withholding Tax Payable",
  currentLoans: "Current Portion of Loans",
  longTermLoans: "Long-Term Loans",
};

// Expense accounts that Payment Approvals posts expense recognition against.
export const STANDARD_PR_EXPENSE_ACCOUNTS = [
  { account_code: "5000", account_name: "Subcontractor Expense", account_type: "expense", category: "subcontractor" },
  { account_code: "5010", account_name: "Direct Labor", account_type: "expense", category: "labor" },
  { account_code: "5020", account_name: "Equipment Expense", account_type: "expense", category: "equipment" },
  { account_code: "5030", account_name: "Operating Expense", account_type: "expense", category: "overhead" },
  { account_code: "5040", account_name: "Utilities Expense", account_type: "expense", category: "overhead" },
  { account_code: "5050", account_name: "General Expense", account_type: "expense", category: "other" },
];

const norm = (v) => (v || "").trim().toLowerCase();

/** Creates any missing accounts from the given list. Idempotent — returns created names. */
export async function seedAccounts(accountList, existingAccounts = []) {
  const existing = new Set(existingAccounts.map(a => norm(a.account_name)));
  const missing = accountList.filter(a => !existing.has(norm(a.account_name)));
  if (missing.length === 0) return [];
  await base44.entities.ChartOfAccount.bulkCreate(missing.map(a => ({ ...a, is_active: true })));
  return missing.map(a => a.account_name);
}

/** Creates any missing standard balance-sheet and posting accounts. Returns the created names. */
export function seedBalanceSheetAccounts(existingAccounts = []) {
  return seedAccounts([...STANDARD_BS_ACCOUNTS, ...STANDARD_PR_EXPENSE_ACCOUNTS], existingAccounts);
}

/** Case-insensitive lookup of a Chart of Account record by name. */
export function findAccount(chartOfAccounts = [], name) {
  if (!name) return null;
  return chartOfAccounts.find(a => norm(a.account_name) === norm(name)) || null;
}

/**
 * Validates that a posting's chart_of_account exists in the Chart of Accounts and,
 * when expectedType is given, that its account_type matches.
 * Returns an error message string, or null when valid.
 */
export function validatePostingAccount(chartOfAccounts, name, expectedType) {
  const account = findAccount(chartOfAccounts, name);
  if (!account) {
    return `Chart of Account "${name}" does not exist. Add it in Chart of Accounts before posting.`;
  }
  if (expectedType && account.account_type !== expectedType) {
    return `Chart of Account "${name}" is typed as ${account.account_type} but must be ${expectedType} for this posting.`;
  }
  return null;
}

/**
 * Aggregates Transaction postings into signed general-ledger balances per
 * balance-sheet Chart of Account, up to and including asOfDate.
 * Asset balance = expense postings − income postings (debits increase assets).
 * Liability / equity balance = income postings − expense postings.
 */
export function buildGeneralLedger(transactions = [], chartOfAccounts = [], asOfDate) {
  const bsAccounts = chartOfAccounts.filter(a => ["asset", "liability", "equity"].includes(a.account_type));
  const byName = new Map(bsAccounts.map(a => [norm(a.account_name), a]));
  const ledger = new Map();

  transactions.forEach(t => {
    if (!t.chart_of_account) return;
    if (asOfDate && t.date && t.date > asOfDate) return;
    const account = byName.get(norm(t.chart_of_account));
    if (!account) return;
    const key = norm(account.account_name);
    if (!ledger.has(key)) {
      ledger.set(key, { account, accountName: account.account_name, balance: 0, transactions: [] });
    }
    const entry = ledger.get(key);
    const amount = t.amount || 0;
    const debit = t.type === "expense";
    const signed = account.account_type === "asset"
      ? (debit ? amount : -amount)
      : (debit ? -amount : amount);
    entry.balance += signed;
    entry.transactions.push(t);
  });

  return ledger;
}

/** Sums the GL balance and postings across one or more account names. */
export function glFor(ledger, names) {
  const list = Array.isArray(names) ? names : [names];
  let balance = 0;
  let transactions = [];
  let matched = false;
  list.forEach(name => {
    const entry = ledger.get(norm(name));
    if (!entry) return;
    matched = true;
    balance += entry.balance;
    transactions = transactions.concat(entry.transactions);
  });
  return { balance, transactions, matched };
}