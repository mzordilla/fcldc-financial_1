const COGS_GROUPS = ["material_cost", "labor", "direct_labor", "equipment", "subcontractor"];
const OPEX_GROUPS = ["overhead", "operating_expense", "permits", "insurance", "repair_and_maintenance", "fixtures"];

// Only Chart of Account entries typed as income or expense belong on the income statement.
// Section placement follows the account's own group, not the transaction category.
export function incomeStatementAccountNames(chartOfAccounts = []) {
  const map = new Map();
  chartOfAccounts
    .filter(a => ["income", "expense"].includes(a.account_type))
    .forEach(a => map.set(a.account_name, a));
  return map;
}

function classify(t, allowedAccounts) {
  const account = t.chart_of_account ? allowedAccounts.get(t.chart_of_account) : null;
  if (!account) return null;
  if (account.account_type === "income") return "revenue";
  if (COGS_GROUPS.includes(account.category)) return "cogs";
  if (OPEX_GROUPS.includes(account.category)) return "opex";
  return "otherExpense";
}

export function buildPeriod(transactions, from, to, allowedAccounts = new Map()) {
  const txs = transactions.filter(t => t.date && t.date >= from && t.date <= to);
  const buckets = { revenue: {}, cogs: {}, opex: {}, otherIncome: {}, otherExpense: {} };
  const bucketTx = { revenue: {}, cogs: {}, opex: {}, otherIncome: {}, otherExpense: {} };

  txs.forEach(t => {
    const section = classify(t, allowedAccounts);
    if (!section) return;
    const acct = t.chart_of_account || "Unclassified";
    buckets[section][acct] = (buckets[section][acct] || 0) + (t.amount || 0);
    if (!bucketTx[section][acct]) bucketTx[section][acct] = [];
    bucketTx[section][acct].push(t);
  });

  const sum = (obj) => Object.values(obj).reduce((s, v) => s + v, 0);
  const totalRevenue = sum(buckets.revenue);
  const totalCOGS = sum(buckets.cogs);
  const grossProfit = totalRevenue - totalCOGS;
  const totalOpex = sum(buckets.opex);
  const operatingIncome = grossProfit - totalOpex;
  const totalOtherIncome = sum(buckets.otherIncome);
  const totalOtherExpense = sum(buckets.otherExpense);
  const incomeBeforeTax = operatingIncome + totalOtherIncome - totalOtherExpense;

  return {
    buckets, bucketTx,
    totalRevenue, totalCOGS, grossProfit,
    totalOpex, operatingIncome,
    totalOtherIncome, totalOtherExpense,
    incomeBeforeTax,
  };
}