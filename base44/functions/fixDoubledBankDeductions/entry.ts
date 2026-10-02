import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

  const { confirm } = await req.json().catch(() => ({}));
  const svc = base44.asServiceRole;

  const txns = await svc.entities.Transaction.filter({
    type: 'expense',
    chart_of_account: 'Accounts Payable',
    bank_account_id: { $nin: ['', null] },
  }, '-date', 5000);
  const affected = txns.filter((t) => t.bank_account_id && t.amount);

  const accounts = await svc.entities.BankAccount.list();
  const byBank = {};
  for (const t of affected) {
    const acc = accounts.find((a) => a.id === t.bank_account_id);
    if (!acc) continue;
    byBank[acc.id] ??= { bank_account_id: acc.id, name: `${acc.bank_name} – ${acc.account_name}`, before: acc.current_balance ?? 0, correction: 0, count: 0 };
    byBank[acc.id].correction += t.amount;
    byBank[acc.id].count += 1;
  }
  const banks = Object.values(byBank).map((b) => ({ ...b, after: b.before + b.correction }));

  if (confirm) {
    // Clearing bank_account_id makes the Sync Bank Balance workflow add the amount back.
    for (const t of affected) {
      if (byBank[t.bank_account_id]) await svc.entities.Transaction.update(t.id, { bank_account_id: '' });
    }
  }

  return Response.json({ applied: !!confirm, transaction_count: banks.reduce((s, b) => s + b.count, 0), banks });
});