// Categories that belong on the balance sheet, not the income statement
const BALANCE_SHEET_CATEGORIES = [
  "bank_reconciliation", "fund_transfer",
  "current_assets", "non_current_assets",
  "current_liabilities", "non_current_liabilities",
];

// Chart of Account names classified as asset / liability / equity
export function balanceSheetAccountNames(chartOfAccounts = []) {
  return new Set(
    chartOfAccounts
      .filter(a => ["asset", "liability", "equity"].includes(a.account_type))
      .map(a => a.account_name)
  );
}

function classify(t, balanceSheetAccounts) {
  if (BALANCE_SHEET_CATEGORIES.includes(t.category)) return null;
  if (t.chart_of_account && balanceSheetAccounts.has(t.chart_of_account)) return null;
  if (t.type === "income") return "revenue";
  if (["material_cost", "labor", "direct_labor", "equipment", "subcontractor"].includes(t.category)) return "cogs";
  if (["overhead", "operating_expense", "permits", "insurance"].includes(t.category)) return "opex";
  return "otherExpense";
}

export function buildPeriod(transactions, from, to, balanceSheetAccounts = new Set()) {
  const txs = transactions.filter(t => t.date && t.date >= from && t.date <= to);
  const buckets = { revenue: {}, cogs: {}, opex: {}, otherIncome: {}, otherExpense: {} };
  const bucketTx = { revenue: {}, cogs: {}, opex: {}, otherIncome: {}, otherExpense: {} };

  txs.forEach(t => {
    const section = classify(t, balanceSheetAccounts);
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