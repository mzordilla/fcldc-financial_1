import { depreciationExpenseForPeriod } from "@/lib/ppeDepreciation";

const COGS_GROUPS = ["material_cost", "labor", "direct_labor", "equipment", "subcontractor"];
const OPEX_GROUPS = ["overhead", "operating_expense", "permits", "insurance", "repair_and_maintenance", "fixtures"];

// Only Chart of Account entries typed as income or expense belong on the income statement.
// Section placement follows the account's own group, not the transaction category.
export const UNCLASSIFIED_EXPENSE = "Unclassified Expense";

export function incomeStatementAccountNames(chartOfAccounts = [], bankAccounts = []) {
  const map = new Map();
  chartOfAccounts
    .filter(a => ["income", "expense"].includes(a.account_type))
    .forEach(a => map.set(a.account_name, a));
  // Balance-sheet accounts (and bank account labels used on cash legs) are tracked so their
  // postings are not counted as expenses a second time on top of the expense-recognition leg.
  map.balanceSheetNames = new Set([
    ...chartOfAccounts.filter(a => ["asset", "liability", "equity"].includes(a.account_type)).map(a => a.account_name),
    ...bankAccounts.map(a => `${a.account_name} – ${a.bank_name}`),
  ]);
  // Bank labels may have been renamed since a cash leg was posted, so also match either side of the label.
  map.bankNameParts = new Set(bankAccounts.flatMap(a => [a.account_name, a.bank_name]).filter(Boolean));
  return map;
}

// Cash legs of a disbursement (the bank side of a payment) are balance-sheet postings, never expenses.
function isCashLeg(t, allowedAccounts) {
  if (/^Cash Payment –/.test(t.description || "")) return true;
  if (allowedAccounts.balanceSheetNames?.has(t.chart_of_account)) return true;
  const parts = (t.chart_of_account || "").split(" – ");
  return parts.length === 2 && parts.some(p => allowedAccounts.bankNameParts?.has(p.trim()));
}

// Expense transactions not coded to any Chart of Account (or coded to a name that isn't in the chart)
// surface as "Unclassified Expense" so they aren't silently dropped.
function isUnclassifiedExpense(t, allowedAccounts) {
  if (t.type !== "expense" || t.category === "fund_transfer") return false;
  if (isCashLeg(t, allowedAccounts)) return false;
  return true;
}

function classify(t, allowedAccounts) {
  const account = t.chart_of_account ? allowedAccounts.get(t.chart_of_account) : null;
  if (!account) return isUnclassifiedExpense(t, allowedAccounts) ? "unclassified" : null;
  if (account.account_type === "income") return "revenue";
  if (COGS_GROUPS.includes(account.category)) return "cogs";
  return "opex";
}

export function buildPeriod(transactions, from, to, allowedAccounts = new Map(), ppeAssets = []) {
  const txs = transactions.filter(t => t.date && t.date >= from && t.date <= to);
  const buckets = { revenue: {}, cogs: {}, opex: {} };
  const bucketTx = { revenue: {}, cogs: {}, opex: {} };

  txs.forEach(t => {
    const classified = classify(t, allowedAccounts);
    if (!classified) return;
    const section = classified === "unclassified" ? "opex" : classified;
    const acct = classified === "unclassified" ? UNCLASSIFIED_EXPENSE : t.chart_of_account;
    buckets[section][acct] = (buckets[section][acct] || 0) + (t.amount || 0);
    if (!bucketTx[section][acct]) bucketTx[section][acct] = [];
    bucketTx[section][acct].push(t);
  });

  const depreciation = depreciationExpenseForPeriod(ppeAssets, from, to);
  if (depreciation > 0) {
    buckets.opex["Depreciation Expense"] = depreciation;
    bucketTx.opex["Depreciation Expense"] = [];
  }

  const sum = (obj) => Object.values(obj).reduce((s, v) => s + v, 0);
  const totalRevenue = sum(buckets.revenue);
  const totalCOGS = sum(buckets.cogs);
  const grossProfit = totalRevenue - totalCOGS;
  const totalOpex = sum(buckets.opex);
  const operatingIncome = grossProfit - totalOpex;
  const incomeBeforeTax = operatingIncome;

  return {
    buckets, bucketTx,
    totalRevenue, totalCOGS, grossProfit,
    totalOpex, operatingIncome,
    incomeBeforeTax,
  };
}