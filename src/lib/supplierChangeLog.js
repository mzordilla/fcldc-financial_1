import { base44 } from "@/api/base44Client";

const IGNORED = ["id", "created_date", "updated_date", "created_by_id", "created_by", "payee_id"];

const toText = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export function diffFields(before = {}, after = {}) {
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  const changes = [];
  keys.forEach((key) => {
    if (IGNORED.includes(key)) return;
    const from = toText(before?.[key]);
    const to = toText(after?.[key]);
    if (from !== to) changes.push({ field: key, from: from.slice(0, 400), to: to.slice(0, 400) });
  });
  return changes;
}

export async function logSupplierChange({ payee, record_type, record_id = "", action, changes = [], summary = "" }) {
  const me = await base44.auth.me().catch(() => null);
  return base44.entities.SupplierChangeLog.create({
    payee_id: payee?.id || "",
    supplier_name: payee?.name || payee?.supplier_name || "",
    record_type,
    record_id,
    action,
    summary,
    changes,
    actor: me?.full_name || me?.email || "",
  });
}