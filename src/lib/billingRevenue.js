// Revenue earned on a billing cycle: gross accomplishment billing plus additive rows
// (change orders, cost plus) less deductive rows. Advance payments applied are cash
// credits, not a reduction of revenue, so they are left out.
export function billingRevenue(bc) {
  const sum = (rows) => (rows || []).reduce((s, r) => s + (Number(r.amount) || 0), 0);
  const deductions = sum((bc.deductive_rows || []).filter((r) => !/advance/i.test(r.description || "")));
  return (bc.billing_amount || 0) + sum(bc.additive_rows) - deductions;
}