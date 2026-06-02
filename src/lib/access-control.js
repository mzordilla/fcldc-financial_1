// Define which routes each role can access
export const roleAccess = {
  admin: "*", // full access
  // Real estate routes are admin-only by default
  disbursement: ["/", "/bank-accounts", "/bank-reconciliation", "/transactions", "/payees", "/payment-approvals", "/payables", "/chart-of-accounts", "/billing-cycles", "/receiving-items"],
  accounting: ["/", "/projects", "/project-pnl", "/billing-cycles", "/receivables", "/payables", "/bank-reconciliation", "/transactions", "/payees", "/payment-approvals", "/chart-of-accounts", "/receiving-items"],
  procurement: ["/", "/purchase-orders", "/payment-approvals", "/payees", "/receiving-items"],
};

export const navItemsByRole = {
  admin: "all",
  disbursement: ["/", "/bank-accounts", "/bank-reconciliation", "/transactions", "/payees", "/payment-approvals", "/payables", "/chart-of-accounts", "/billing-cycles", "/receiving-items"],
  accounting: ["/", "/projects", "/project-pnl", "/billing-cycles", "/receivables", "/payables", "/bank-reconciliation", "/transactions", "/payees", "/payment-approvals", "/chart-of-accounts", "/receiving-items"],
  procurement: ["/", "/purchase-orders", "/payment-approvals", "/payees", "/receiving-items"],
};

export function canAccess(role, path) {
  const normalizedRole = role?.toLowerCase();
  if (normalizedRole === "admin") return true;
  if (!normalizedRole) return false;
  const allowed = roleAccess[normalizedRole];
  if (!allowed) return false;
  if (allowed === "*") return true;
  // Check exact match or prefix match (for nested routes like /projects/:id)
  return allowed.some((route) => path === route || (route !== "/" && path.startsWith(route + "/")));
}