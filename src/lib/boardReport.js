import { format, endOfMonth, subMonths, parseISO } from "date-fns";
import { buildPeriod } from "@/components/reports/comparativeIncomeStatementUtils";
import { receivablesHealth, projectPerformance, changePercent } from "@/lib/executiveMetrics";
import { buildAging } from "@/lib/payablesAging";
import { getLoanBalance } from "@/lib/loanBalance";

export const peso = (v) => `₱${Math.round(v || 0).toLocaleString()}`;
export const pesoShort = (v) => {
  const n = v || 0;
  const a = Math.abs(n);
  const s = a >= 1e9 ? `${(a / 1e9).toFixed(2)}B` : a >= 1e6 ? `${(a / 1e6).toFixed(2)}M` : a >= 1e3 ? `${(a / 1e3).toFixed(1)}K` : a.toFixed(0);
  return `${n < 0 ? "-" : ""}₱${s}`;
};

const range = (key) => {
  const start = parseISO(`${key}-01`);
  return { from: `${key}-01`, to: format(endOfMonth(start), "yyyy-MM-dd"), label: format(start, "MMMM yyyy"), short: format(start, "MMM yy") };
};
const inRange = (d, r) => !!d && d.slice(0, 10) >= r.from && d.slice(0, 10) <= r.to;
const sum = (arr, f) => arr.reduce((s, x) => s + (f(x) || 0), 0);
const topGroups = (rows, keyFn, valFn, n = 8) => {
  const map = {};
  rows.forEach((r) => { const k = keyFn(r) || "Unspecified"; map[k] = (map[k] || 0) + valFn(r); });
  return Object.entries(map).map(([name, value]) => ({ name, value })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value).slice(0, n);
};

export function buildBoardReport(monthKey, d) {
  const month = range(monthKey);
  const prevKey = format(subMonths(parseISO(`${monthKey}-01`), 1), "yyyy-MM");
  const prev = range(prevKey);
  const period = (from, to) => buildPeriod(d.transactions, from, to, d.coaMap, d.ppeAssets);

  const cur = period(month.from, month.to);
  const prior = period(prev.from, prev.to);
  const ytd = period(`${monthKey.slice(0, 4)}-01-01`, month.to);

  const trend = Array.from({ length: 6 }, (_, i) => {
    const r = range(format(subMonths(parseISO(`${monthKey}-01`), 5 - i), "yyyy-MM"));
    const p = period(r.from, r.to);
    return { label: r.short, revenue: p.totalRevenue, costs: p.totalCOGS + p.totalOpex, net: p.incomeBeforeTax };
  });

  const expenseEntries = [...Object.entries(cur.buckets.cogs), ...Object.entries(cur.buckets.opex)]
    .map(([name, value]) => ({ name, value })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);
  const expenses = expenseEntries.length > 7
    ? [...expenseEntries.slice(0, 7), { name: "Others", value: sum(expenseEntries.slice(7), (x) => x.value) }]
    : expenseEntries;
  const revenueAccounts = Object.entries(cur.buckets.revenue).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Cash
  const banks = d.bankAccounts.filter((b) => b.status !== "closed")
    .map((b) => ({ name: `${b.bank_name} ${b.account_number ? `•${String(b.account_number).slice(-4)}` : ""}`.trim(), account: b.account_name, value: b.current_balance || 0 }))
    .sort((a, b) => b.value - a.value);
  const bankTx = d.transactions.filter((t) => t.bank_account_id && inRange(t.date, month) && t.type !== "fund_transfer" && t.category !== "fund_transfer");
  const cashIn = sum(bankTx.filter((t) => t.type === "income"), (t) => t.amount);
  const cashOut = sum(bankTx.filter((t) => t.type === "expense"), (t) => t.amount);

  // Receivables
  const openRec = d.receivables.filter((r) => r.status !== "paid");
  const recOut = (r) => Math.max(0, (r.amount || 0) - (r.amount_paid || 0));
  const recHealth = receivablesHealth(d.receivables);
  const collections = d.receivables.flatMap((r) => (r.payment_history || []).filter((p) => !p.is_advance_payment && inRange(p.collection_date, month)));
  const receivables = {
    ...recHealth,
    count: openRec.length,
    aging: [
      { name: "Current", value: recHealth.buckets.current }, { name: "1-30 days", value: recHealth.buckets.d30 },
      { name: "31-60 days", value: recHealth.buckets.d60 }, { name: "Over 60 days", value: recHealth.buckets.d90 },
    ],
    byType: topGroups(openRec, (r) => ({ project: "Project billings", funding_loan: "Funding / loans", employee: "Employee" }[r.receivable_type || "project"]), recOut, 4),
    topClients: topGroups(openRec, (r) => r.client_name, recOut, 8),
    collected: sum(collections, (p) => p.amount),
    collectionCount: collections.length,
  };

  // Payables
  const openPay = d.payables.filter((p) => p.status !== "paid");
  const payNet = (p) => Math.max(0, (p.amount || 0) - (p.withholding_tax_amount || 0) + (p.vat_amount || 0) - (p.amount_paid || 0));
  const aging = buildAging(d.payables);
  const today = new Date();
  const overduePay = openPay.filter((p) => p.due_date && new Date(p.due_date) < today);
  const payments = d.payables.flatMap((p) => (p.payment_history || []).filter((h) => inRange(h.payment_date, month)));
  const payables = {
    total: aging.total,
    count: openPay.length,
    overdueAmount: sum(overduePay, payNet),
    overdueCount: overduePay.length,
    aging: [
      { name: "Current", value: aging.buckets.current }, { name: "1-30 days", value: aging.buckets.days30 },
      { name: "31-60 days", value: aging.buckets.days60 }, { name: "61-90 days", value: aging.buckets.days90 },
      { name: "Over 90 days", value: aging.buckets.days90plus },
    ],
    topSuppliers: topGroups(openPay, (p) => p.supplier_name, payNet, 8),
    paid: sum(payments, (h) => h.amount),
    paymentCount: payments.length,
  };

  // Loans
  const activeLoans = d.loans.filter((l) => l.status !== "paid_off");
  const ledger = d.loans.flatMap((l) => (l.ledger_entries || []).filter((e) => inRange(e.entry_date, month)));
  const loans = {
    balance: sum(activeLoans, getLoanBalance),
    granted: sum(activeLoans, (l) => l.amount_granted || l.total_amount),
    count: activeLoans.length,
    byCreditor: topGroups(activeLoans, (l) => l.creditor, getLoanBalance, 8),
    paidThisMonth: sum(ledger.filter((e) => e.entry_type === "payment"), (e) => e.amount),
    availedThisMonth: sum(ledger.filter((e) => e.entry_type === "availment"), (e) => e.amount),
  };

  // Other highlights
  const monthPOs = d.purchaseOrders.filter((p) => inRange(p.requested_date || p.created_date, month) && p.approval_status !== "draft");
  const highlights = {
    poCount: monthPOs.length,
    poAmount: sum(monthPOs, (p) => p.amount),
    poApproved: sum(monthPOs.filter((p) => p.approval_status === "approved"), (p) => p.amount),
    poPending: d.purchaseOrders.filter((p) => p.approval_status === "pending").length,
    advancesAvailable: sum(d.advances.filter((a) => a.status !== "fully_applied"), (a) => a.available_balance ?? a.amount - (a.applied_amount || 0)),
    advanceCount: d.advances.filter((a) => a.status !== "fully_applied").length,
  };

  const cashTotal = sum(banks, (b) => b.value);
  const netMargin = cur.totalRevenue ? (cur.incomeBeforeTax / cur.totalRevenue) * 100 : 0;
  const takeaways = [
    `Revenue of ${pesoShort(cur.totalRevenue)}, ${changePercent(cur.totalRevenue, prior.totalRevenue) >= 0 ? "up" : "down"} ${Math.abs(changePercent(cur.totalRevenue, prior.totalRevenue)).toFixed(1)}% from ${prev.label}.`,
    `Net income of ${pesoShort(cur.incomeBeforeTax)} at a ${netMargin.toFixed(1)}% net margin.`,
    `Collected ${pesoShort(receivables.collected)} from clients; ${pesoShort(recHealth.overdueAmount)} of receivables (${recHealth.overdueCount} accounts) are overdue.`,
    `Paid ${pesoShort(payables.paid)} to suppliers; ${pesoShort(payables.overdueAmount)} of payables (${payables.overdueCount} bills) are overdue.`,
    `Cash on hand of ${pesoShort(cashTotal)} against ${pesoShort(loans.balance)} of outstanding loans.`,
  ];

  return {
    month, prev, cur, prior, ytd, trend, expenses, revenueAccounts,
    cash: { banks, total: cashTotal, cashIn, cashOut },
    receivables, payables, loans, highlights, takeaways, netMargin,
    projects: projectPerformance(d.projects, d.transactions).slice(0, 8),
    change: (a, b) => changePercent(a, b),
  };
}