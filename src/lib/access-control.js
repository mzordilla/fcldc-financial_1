// Define which routes each role can access
export const roleAccess = {
  admin: "*", // full access
  disbursement: ["/", "/bank-accounts", "/bank-reconciliation", "/transactions", "/payees", "/payment-approvals", "/payables", "/chart-of-accounts"],
  accounting: ["/", "/projects", "/project-pnl", "/receivables", "/payables", "/bank-reconciliation", "/transactions", "/payees", "/payment-approvals", "/chart-of-accounts"],
  procurement: ["/", "/purchase-orders", "/payment-approvals", "/payees"],
};

export const navItemsByRole = {
  admin: "all",
  disbursement: ["/", "/bank-accounts", "/bank-reconciliation", "/transactions", "/payees", "/payment-approvals", "/payables", "/chart-of-accounts"],
  accounting: ["/", "/projects", "/project-pnl", "/receivables", "/payables", "/bank-reconciliation", "/transactions", "/payees", "/payment-approvals", "/chart-of-accounts"],
  procurement: ["/", "/purchase-orders", "/payment-approvals", "/payees"],
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