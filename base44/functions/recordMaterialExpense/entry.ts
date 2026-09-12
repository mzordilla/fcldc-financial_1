import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const receivingItemId = body.receiving_item_id || body.data?.id || body.event?.entity_id;
    if (!receivingItemId) return Response.json({ error: 'receiving_item_id is required' }, { status: 400 });

    const receivingItem = await base44.asServiceRole.entities.ReceivingItem.get(receivingItemId);
    if (!receivingItem) return Response.json({ error: 'Receiving item not found' }, { status: 404 });

    const existing = await base44.asServiceRole.entities.Transaction.filter({ receiving_item_id: receivingItemId });
    if (existing.length > 0) return Response.json({ skipped: true, reason: 'Already recorded' });

    const po = receivingItem.po_id
      ? await base44.asServiceRole.entities.PurchaseOrder.get(receivingItem.po_id)
      : null;
    const amount = receivingItem.total_amount || 0;
    if (amount <= 0) return Response.json({ skipped: true, reason: 'No amount to record' });

    const categoryMap = {
      materials: 'material_cost',
      equipment: 'equipment',
      subcontractor: 'subcontractor',
      services: 'other',
      utilities: 'overhead',
      other: 'other'
    };
    const transaction = await base44.asServiceRole.entities.Transaction.create({
      description: `Material cost — PO ${receivingItem.po_number || ''} (${receivingItem.supplier_name || 'Supplier'})`,
      amount,
      type: 'expense',
      category: categoryMap[po?.category] || po?.category || 'material_cost',
      chart_of_account: po?.chart_of_account || '',
      project_code: po?.project_code || po?.project_name || receivingItem.project_name || '',
      date: receivingItem.received_date || new Date().toISOString().split('T')[0],
      status: 'completed',
      receiving_item_id: receivingItemId
    });

    return Response.json({ success: true, transaction });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}