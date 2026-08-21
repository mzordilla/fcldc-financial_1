import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function agingBucketKey(dueDateStr, today) {
  if (!dueDateStr) return null;
  const due = new Date(dueDateStr);
  const days = Math.floor((today.getTime() - due.getTime()) / 86400000);
  if (days <= 0) return 'current';
  if (days <= 30) return 'days30';
  if (days <= 60) return 'days60';
  if (days <= 90) return 'days90';
  return 'days90plus';
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payables = await base44.entities.Payable.list('-due_date', 5000);
    const today = new Date();

    const overall = { current: 0, days30: 0, days60: 0, days90: 0, days90plus: 0 };
    let overdueCount = 0;

    const supplierMap = {};

    for (const p of payables) {
      if (p.payable_type === 'other' || p.status === 'paid') continue;
      const net = (p.amount || 0) - (p.withholding_tax_amount || 0) + (p.vat_amount || 0);
      const remaining = Math.max(0, net - (p.amount_paid || 0));
      if (remaining <= 0.01) continue;
      if (p.status === 'overdue') overdueCount += 1;
      const bucket = agingBucketKey(p.due_date, today);
      if (!bucket) continue;

      overall[bucket] += remaining;

      const supplier = p.supplier_name || 'Unknown Supplier';
      if (!supplierMap[supplier]) {
        supplierMap[supplier] = { supplier, count: 0, categories: [], buckets: { current: 0, days30: 0, days60: 0, days90: 0, days90plus: 0 } };
      }
      const cat = p.category || 'other';
      if (!supplierMap[supplier].categories.includes(cat)) supplierMap[supplier].categories.push(cat);
      supplierMap[supplier].count += 1;
      supplierMap[supplier].buckets[bucket] += remaining;
    }

    const suppliers = Object.values(supplierMap).map((s) => ({
      ...s,
      total: Object.values(s.buckets).reduce((a, b) => a + b, 0),
    })).sort((a, b) => b.total - a.total);

    const overallTotal = Object.values(overall).reduce((a, b) => a + b, 0);

    return Response.json({ overall, overallTotal, overdueCount, suppliers });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}