import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const VALID_CATEGORIES = [
  "materials", "equipment", "subcontractor", "services", "utilities", "other",
  "project_payment", "material_cost", "labor", "overhead", "permits", "insurance",
  "bank_reconciliation", "non_current_assets", "current_assets", "current_liabilities",
  "non_current_liabilities", "repair_and_maintenance", "fixtures"
];

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const payload = await req.json();
  const { event, data } = payload;

  const poId = event?.entity_id;
  const category = data?.category;

  // Enforce: category must be a single string value (not an array)
  if (Array.isArray(category)) {
    // Reject by resetting to first element or clearing — log the violation
    const corrected = category[0] || null;
    await base44.asServiceRole.entities.PurchaseOrder.update(poId, { category: corrected });
    console.warn(`[validatePurchaseOrder] PO ${poId} had multiple categories assigned. Corrected to: ${corrected}`);
    return Response.json({ corrected: true, category: corrected });
  }

  // Enforce: category must be one of the valid enum values (if provided)
  if (category !== undefined && category !== null && category !== "" && !VALID_CATEGORIES.includes(category)) {
    await base44.asServiceRole.entities.PurchaseOrder.update(poId, { category: null });
    console.warn(`[validatePurchaseOrder] PO ${poId} had invalid category "${category}". Cleared.`);
    return Response.json({ corrected: true, category: null });
  }

  return Response.json({ valid: true, category: category ?? null });
});