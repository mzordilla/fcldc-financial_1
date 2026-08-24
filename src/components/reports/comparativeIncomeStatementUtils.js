function classify(t) {
  if (t.category === "bank_reconciliation" || t.category === "fund_transfer") return null;
  if (t.type === "income") return "revenue";
  if (["material_cost", "labor", "direct_labor", "equipment", "subcontractor"].includes(t.category)) return "cogs";
  if (["overhead", "operating_expense", "permits", "insurance"].includes(t.category)) return "opex";
  return "otherExpense";
}

export function buildPeriod(transactions, from, to) {
  const txs = transactions.filter(t => t.date && t.date >= from && t.date <= to);
  const buckets = { revenue: {}, cogs: {}, opex: {}, otherIncome: {}, otherExpense: {} };
  const bucketTx = { revenue: {}, cogs: {}, opex: {}, otherIncome: {}, otherExpense: {} };

  txs.forEach(t => {
    const section = classify(t);
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