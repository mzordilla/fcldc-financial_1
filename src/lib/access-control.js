export const DEFAULT_ACCESS = {
  disbursement: ["/", "/receivables", "/bank-accounts", "/bank-reconciliation", "/transactions", "/payees", "/payment-approvals", "/payables", "/chart-of-accounts", "/billing-cycles", "/receiving-items"],
  accounting: ["/", "/projects", "/project-pnl", "/billing-cycles", "/receivables", "/payables", "/bank-reconciliation", "/transactions", "/payees", "/payment-approvals", "/chart-of-accounts", "/receiving-items", "/payroll"],
  procurement: ["/", "/purchase-orders", "/payment-approvals", "/payees", "/receiving-items", "/materials-history"],
  marketing: ["/re/portfolio", "/re/units", "/re/tenants", "/re/listings", "/re/reports"],
};

export function getAllowedRoutes(role, config = DEFAULT_ACCESS) {
  const normalizedRole = role?.toLowerCase();
  if (normalizedRole === "admin") return "all";
  return config[normalizedRole] || DEFAULT_ACCESS[normalizedRole] || [];
}

export function canAccess(role, path, config = DEFAULT_ACCESS) {
  const allowed = getAllowedRoutes(role, config);
  if (allowed === "all") return true;
  return allowed.some(route => path === route || (route !== "/" && path.startsWith(`${route}/`)));
}