import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const { event, data, old_data } = payload;
    const eventType = event?.type; // "create", "update", "delete"

    const base44Service = base44.asServiceRole;

    // Helper: adjust a bank account balance
    async function adjustBalance(accountId, delta) {
      if (!accountId) return;
      const accounts = await base44Service.entities.BankAccount.filter({ id: accountId });
      if (!accounts || accounts.length === 0) return;
      const account = accounts[0];
      const newBalance = (account.current_balance ?? 0) + delta;
      await base44Service.entities.BankAccount.update(accountId, { current_balance: newBalance });
    }

    if (eventType === "create") {
      // New transaction: add income, subtract expense
      if (data?.bank_account_id && data?.amount) {
        const delta = data.type === "income" ? data.amount : -data.amount;
        await adjustBalance(data.bank_account_id, delta);
      }
    } else if (eventType === "update") {
      // Revert old transaction effect, apply new transaction effect
      if (old_data?.bank_account_id && old_data?.amount) {
        const oldDelta = old_data.type === "income" ? -old_data.amount : old_data.amount;
        await adjustBalance(old_data.bank_account_id, oldDelta);
      }
      if (data?.bank_account_id && data?.amount) {
        const newDelta = data.type === "income" ? data.amount : -data.amount;
        await adjustBalance(data.bank_account_id, newDelta);
      }
    } else if (eventType === "delete") {
      // Revert the deleted transaction's effect
      if (old_data?.bank_account_id && old_data?.amount) {
        const delta = old_data.type === "income" ? -old_data.amount : old_data.amount;
        await adjustBalance(old_data.bank_account_id, delta);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});