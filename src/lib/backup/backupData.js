import { base44 } from "@/api/base44Client";

// Every app table. User is exported for reference but never restored; BackupRecord is never restored.
export const BACKUP_ENTITIES = [
  "Transaction", "BankAccount", "BankTransferRequest", "BankReconciliation", "Check", "PaymentRequest",
  "PurchaseOrder", "ReceivingItem", "Payable", "Receivable", "CustomerAdvance", "BillingCycle", "ChangeOrder",
  "Contract", "Project", "Client", "Payee", "SupplierAccreditation", "SupplierEvaluation", "SupplierChangeLog",
  "ChartOfAccount", "WorkingCapitalLoan", "WorkingCapitalSetting", "LoanPayment", "BankLoan", "Debt", "PPEAsset",
  "Employee", "PayrollPeriod", "PayrollEntry", "CondoUnit", "Tenant", "LeaseBillingCycle", "LeaseCollection",
  "PropertyListing", "CorporateDocument", "CompanySignature", "ActivityNote", "ChatMessage", "RoleAccessConfig",
  "AuditLog", "BackupRecord",
];
export const NON_RESTORABLE = ["User", "BackupRecord"];
export const SYSTEM_FIELDS = ["id", "created_date", "updated_date", "created_by_id", "created_by", "is_sample"];

export async function fetchAllRecords(name) {
  const rows = [];
  let cursor;
  do {
    const page = await base44.entities[name].list({ sort: "created_date", limit: 500, cursor });
    rows.push(...page.items);
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return rows;
}

export function toCsv(rows) {
  if (!rows.length) return "";
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const esc = (v) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "\uFEFF" + [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\r\n");
}

const FILE_URL = /^https:\/\/(base44\.app\/api\/apps\/|media\.base44\.com\/)/;

export function collectFileUrls(value, out) {
  if (typeof value === "string") { if (FILE_URL.test(value)) out.add(value); }
  else if (Array.isArray(value)) value.forEach((v) => collectFileUrls(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => collectFileUrls(v, out));
}

export const formatBytes = (n = 0) =>
  n < 1024 ? `${n} B` : n < 1048576 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1048576).toFixed(2)} MB`;