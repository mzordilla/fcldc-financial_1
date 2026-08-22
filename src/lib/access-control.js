const STORAGE_KEY = "fcldc_role_access_v1";

const DEFAULT_ACCESS = {
  disbursement: ["/", "/receivables", "/bank-accounts", "/bank-reconciliation", "/transactions", "/payees", "/payment-approvals", "/payables", "/chart-of-accounts", "/billing-cycles", "/receiving-items"],
  accounting: ["/", "/projects", "/project-pnl", "/billing-cycles", "/receivables", "/payables", "/bank-reconciliation", "/transactions", "/payees", "/payment-approvals", "/chart-of-accounts", "/receiving-items", "/payroll"],
  procurement: ["/", "/purchase-orders", "/payment-approvals", "/payees", "/receiving-items", "/materials-history"],
  marketing: ["/re/portfolio", "/re/units", "/re/tenants", "/re/listings", "/re/reports"],
};

function getAccessConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_ACCESS;
    const config = JSON.parse(saved);
    if (config.disbursement && !config.disbursement.includes("/receivables")) {
      config.disbursement = ["/receivables", ...config.disbursement];
    }
    return config;
  } catch {
    return DEFAULT_ACCESS;
  }
}

// Define which routes each role can access
export const roleAccess = {
  admin: "*",
  get disbursement() { return getAccessConfig().disbursement || DEFAULT_ACCESS.disbursement; },
  get accounting() { return getAccessConfig().accounting || DEFAULT_ACCESS.accounting; },
  get procurement() { return getAccessConfig().procurement || DEFAULT_ACCESS.procurement; },
  get marketing() { return getAccessConfig().marketing || DEFAULT_ACCESS.marketing; },
};

export const navItemsByRole = {
  admin: "all",
  get disbursement() { return getAccessConfig().disbursement || DEFAULT_ACCESS.disbursement; },
  get accounting() { return getAccessConfig().accounting || DEFAULT_ACCESS.accounting; },
  get procurement() { return getAccessConfig().procurement || DEFAULT_ACCESS.procurement; },
  get marketing() { return getAccessConfig().marketing || DEFAULT_ACCESS.marketing; },
};

export function canAccess(role, path) {
  const normalizedRole = role?.toLowerCase();
  if (normalizedRole === "admin") return true;
  if (!normalizedRole) return false;
  const config = getAccessConfig();
  const allowed = config[normalizedRole] || DEFAULT_ACCESS[normalizedRole];
  if (!allowed) return false;
  // Check exact match or prefix match (for nested routes like /projects/:id)
  return allowed.some((route) => path === route || (route !== "/" && path.startsWith(route + "/")));
}