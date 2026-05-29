import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { event, data, old_data } = body;

    if (!event) {
      return Response.json({ error: 'No event provided' }, { status: 400 });
    }

    const action = event.type; // create | update | delete
    const entityName = event.entity_name;
    const entityId = event.entity_id;

    // Determine actor from data — for updates use updated_by (who made the change),
    // for creates use created_by, for deletes fall back to old_data.created_by
    let actor = 'system';
    if (action === 'create') {
      actor = data?.created_by || 'system';
    } else if (action === 'update') {
      actor = data?.updated_by || data?.created_by || old_data?.created_by || 'system';
    } else if (action === 'delete') {
      actor = old_data?.updated_by || old_data?.created_by || 'system';
    }

    // Build summary
    let summary = '';
    if (action === 'create') {
      summary = buildCreateSummary(entityName, data);
    } else if (action === 'update') {
      summary = buildUpdateSummary(entityName, data, old_data);
    } else if (action === 'delete') {
      summary = buildDeleteSummary(entityName, old_data || data);
    }

    // Determine changed fields for updates
    let changedFields = [];
    if (action === 'update' && data && old_data) {
      changedFields = Object.keys(data).filter(k => {
        if (['updated_date'].includes(k)) return false;
        return JSON.stringify(data[k]) !== JSON.stringify(old_data[k]);
      });
    }

    const logEntry = {
      entity_name: entityName,
      entity_id: entityId,
      action,
      actor,
      timestamp: new Date().toISOString(),
      summary,
      before: old_data ? JSON.stringify(old_data) : null,
      after: data ? JSON.stringify(data) : null,
      changed_fields: changedFields,
    };

    await base44.asServiceRole.entities.AuditLog.create(logEntry);

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function getLabel(entityName, record) {
  if (!record) return entityName;
  return (
    record.description ||
    record.project_name ||
    record.payee ||
    record.supplier_name ||
    record.client_name ||
    record.account_name ||
    record.name ||
    record.billing_number ||
    record.po_number ||
    record.request_number ||
    record.invoice_number ||
    record.creditor ||
    record.lender ||
    record.loan_name ||
    entityName
  );
}

function buildCreateSummary(entityName, data) {
  const label = getLabel(entityName, data);
  const amount = data?.amount || data?.contract_amount || data?.total_amount || data?.billing_amount;
  const amountStr = amount ? ` — ₱${Number(amount).toLocaleString()}` : '';
  return `Created ${entityName}: "${label}"${amountStr}`;
}

function buildUpdateSummary(entityName, data, old_data) {
  const label = getLabel(entityName, data || old_data);
  const changed = Object.keys(data || {}).filter(k => {
    if (['updated_date'].includes(k)) return false;
    return JSON.stringify((data || {})[k]) !== JSON.stringify((old_data || {})[k]);
  });
  const fieldsStr = changed.length > 0 ? ` (${changed.slice(0, 5).join(', ')})` : '';
  return `Updated ${entityName}: "${label}"${fieldsStr}`;
}

function buildDeleteSummary(entityName, data) {
  const label = getLabel(entityName, data);
  return `Deleted ${entityName}: "${label}"`;
}