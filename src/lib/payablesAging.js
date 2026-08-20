export function agingBucketKey(dueDateStr, today = new Date()) {
  if (!dueDateStr) return null;
  const days = Math.floor((today.getTime() - new Date(dueDateStr).getTime()) / 86400000);
  if (days <= 0) return "current";
  if (days <= 30) return "days30";
  if (days <= 60) return "days60";
  if (days <= 90) return "days90";
  return "days90plus";
}

export function buildAging(payables) {
  const buckets = { current: 0, days30: 0, days60: 0, days90: 0, days90plus: 0 };
  const today = new Date();
  payables.forEach((p) => {
    if (p.status === "paid") return;
    const key = agingBucketKey(p.due_date, today);
    if (!key) return;
    const net = (p.amount || 0) - (p.withholding_tax_amount || 0) + (p.vat_amount || 0);
    buckets[key] += Math.max(0, net - (p.amount_paid || 0));
  });
  const total = Object.values(buckets).reduce((a, b) => a + b, 0);
  return { buckets, total };
}