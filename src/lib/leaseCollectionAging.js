import { differenceInDays, endOfMonth, parseISO } from "date-fns";

export const leaseDueDate = (month) => endOfMonth(parseISO(`${month}-01`));

export function agingBucket(month) {
  const days = differenceInDays(new Date(), leaseDueDate(month));
  if (days <= 0) return "current";
  if (days <= 30) return "days30";
  if (days <= 60) return "days60";
  if (days <= 90) return "days90";
  return "days90plus";
}

export function buildLeaseClientGroups(tenants, monthOptions, collections) {
  const grouped = tenants.reduce((groups, tenant) => {
    const key = tenant.full_name?.trim().toLowerCase() || "—";
    (groups[key] ||= []).push(tenant);
    return groups;
  }, {});

  return Object.values(grouped).map((clientTenants) => {
    const rows = monthOptions.map(({ value, label }) => {
      const applicable = clientTenants.filter((t) => !t.lease_start || value >= t.lease_start.slice(0, 7));
      if (!applicable.length) return null;
      const records = applicable.map((t) => collections.find((c) => c.tenant_id === t.id && c.month === value));
      const billed = applicable.reduce((sum, t, i) => sum + (records[i]?.amount ?? (t.monthly_rent || 0) + (t.association_dues || 0)), 0);
      const collected = applicable.reduce((sum, t, i) => sum + (records[i]?.collected ? (records[i].amount || 0) : 0), 0);
      return { month: value, label, tenants: applicable, records, billed, collected, balance: billed - collected };
    }).filter(Boolean);
    const buckets = { current: 0, days30: 0, days60: 0, days90: 0, days90plus: 0 };
    rows.forEach((row) => { if (row.balance > 0) buckets[agingBucket(row.month)] += row.balance; });
    return { client: clientTenants[0].full_name, rows, buckets, total: rows.reduce((sum, row) => sum + row.balance, 0) };
  }).sort((a, b) => a.client.localeCompare(b.client));
}