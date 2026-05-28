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
  if (role === "admin") return true;
  if (!role) return false; // no role = no access
  const allowed = roleAccess[role];
  if (!allowed) return false;
  if (allowed === "*") return true;
  // Check exact match or prefix match (for nested routes like /projects/:id)
  return allowed.some((route) => path === route || (route !== "/" && path.startsWith(route + "/")));
}