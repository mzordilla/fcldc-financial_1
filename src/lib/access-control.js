// Define which routes each role can access
export const roleAccess = {
  admin: "*", // full access
  disbursement: ["/bank-accounts", "/transactions"],
  accounting: ["/projects", "/project-pnl", "/receivables", "/payables"],
  procurement: ["/purchase-orders", "/payment-approvals", "/payees"],
};

export const navItemsByRole = {
  admin: "all",
  disbursement: ["/bank-accounts", "/transactions"],
  accounting: ["/projects", "/project-pnl", "/receivables", "/payables"],
  procurement: ["/purchase-orders", "/payment-approvals", "/payees"],
};

export function canAccess(role, path) {
  if (!role || role === "admin") return true;
  const allowed = roleAccess[role];
  if (!allowed || allowed === "*") return true;
  return allowed.includes(path);
}