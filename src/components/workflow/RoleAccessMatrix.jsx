import React, { useEffect, useState } from "react";
import { Check, Save, RotateCcw } from "lucide-react";
import useRoleAccess from "@/hooks/useRoleAccess";

const ALL_MODULES = [
  { label: "Dashboard", path: "/" },
  { label: "Projects", path: "/projects" },
  { label: "Project P&L", path: "/project-pnl" },
  { label: "Purchase Orders", path: "/purchase-orders" },
  { label: "Payment Approvals", path: "/payment-approvals" },
  { label: "Receivables", path: "/receivables" },
  { label: "Payables", path: "/payables" },
  { label: "Billing Cycles", path: "/billing-cycles" },
  { label: "Transactions", path: "/transactions" },
  { label: "Bank Accounts", path: "/bank-accounts" },
  { label: "Bank Reconciliation", path: "/bank-reconciliation" },
  { label: "Chart of Accounts", path: "/chart-of-accounts" },
  { label: "Payees", path: "/payees" },
  { label: "Receiving Items", path: "/receiving-items" },
  { label: "Materials History", path: "/materials-history" },
  { label: "PPE Assets", path: "/ppe-assets" },
  { label: "Working Capital Loans", path: "/working-capital-loans" },
  { label: "Reports", path: "/reports" },
  { label: "Audit Trail", path: "/audit-trail" },
  { label: "Receipt Scanner", path: "/receipt-scanner" },
  { label: "RE Portfolio", path: "/re/portfolio" },
  { label: "RE Units", path: "/re/units" },
  { label: "RE Tenants", path: "/re/tenants" },
  { label: "RE Listings", path: "/re/listings" },
  { label: "RE Reports", path: "/re/reports" },
];

const ROLES = ["disbursement", "accounting", "procurement", "marketing"];

const ROLE_COLORS = {
  disbursement: { badge: "bg-purple-100 text-purple-700 border-purple-200", check: "bg-purple-500" },
  accounting: { badge: "bg-emerald-100 text-emerald-700 border-emerald-200", check: "bg-emerald-500" },
  procurement: { badge: "bg-blue-100 text-blue-700 border-blue-200", check: "bg-blue-500" },
  marketing: { badge: "bg-orange-100 text-orange-700 border-orange-200", check: "bg-orange-500" },
};

export default function RoleAccessMatrix() {
  const { config, isLoading, saveAccess, copyDefaults } = useRoleAccess();
  const [access, setAccess] = useState(config);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setAccess(config), [config]);

  const toggle = (role, path) => {
    setAccess(prev => {
      const current = prev[role] || [];
      const has = current.includes(path);
      return {
        ...prev,
        [role]: has ? current.filter(p => p !== path) : [...current, path],
      };
    });
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await saveAccess(access);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e.message || "Unable to save access settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    const defaults = copyDefaults();
    setAccess(defaults);
    setSaved(false);
    setError("");
    setSaving(true);
    try {
      await saveAccess(defaults);
    } catch (e) {
      setError(e.message || "Unable to reset access settings.");
    } finally {
      setSaving(false);
    }
  };

  const toggleAllForRole = (role) => {
    const current = access[role] || [];
    const allPaths = ALL_MODULES.map(m => m.path);
    const hasAll = allPaths.every(p => current.includes(p));
    setAccess(prev => ({ ...prev, [role]: hasAll ? [] : allPaths }));
    setSaved(false);
  };

  const toggleAllForModule = (path) => {
    const allHave = ROLES.every(r => (access[r] || []).includes(path));
    setAccess(prev => {
      const next = { ...prev };
      ROLES.forEach(r => {
        const cur = next[r] || [];
        next[r] = allHave ? cur.filter(p => p !== path) : cur.includes(path) ? cur : [...cur, path];
      });
      return next;
    });
    setSaved(false);
  };

  if (isLoading) return <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">Loading access settings...</div>;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">Role-Based Access Control</h2>
          <p className="text-xs text-slate-400 mt-0.5">Check to grant module access per role. Admin always has full access.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={saving}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50 ${saved ? "bg-emerald-500 text-white" : "bg-primary text-white hover:bg-primary/90"}`}
          >
            {saved ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
            {saved ? "Saved!" : "Save Changes"}
          </button>
        </div>
      </div>

      {error && <div className="px-6 py-2 bg-red-50 border-b border-red-100 text-xs text-red-700">{error}</div>}

      {/* Admin note */}
      <div className="px-6 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
        <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-800 text-white">Admin</span>
        <span className="text-xs text-slate-500">Full access to all modules — not configurable</span>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 w-48">Module</th>
              {ROLES.map(role => (
                <th key={role} className="px-3 py-3 text-center text-xs font-semibold text-slate-600 min-w-[110px]">
                  <div className="flex flex-col items-center gap-1.5">
                    <span className={`px-2.5 py-1 rounded-full border font-bold capitalize ${ROLE_COLORS[role].badge}`}>{role}</span>
                    <button
                      onClick={() => toggleAllForRole(role)}
                      className="text-[10px] text-slate-400 hover:text-slate-600 underline underline-offset-2"
                    >
                      {ALL_MODULES.every(m => (access[role] || []).includes(m.path)) ? "Deselect all" : "Select all"}
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ALL_MODULES.map((mod) => {
              const allHave = ROLES.every(r => (access[r] || []).includes(mod.path));
              return (
                <tr key={mod.path} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-2.5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleAllForModule(mod.path)}
                        title="Toggle all roles"
                        className={`w-4 h-4 rounded text-[10px] flex items-center justify-center border transition-colors ${allHave ? "bg-slate-700 border-slate-700 text-white" : "border-slate-300 hover:border-slate-400"}`}
                      >
                        {allHave && <Check className="w-2.5 h-2.5" />}
                      </button>
                      <span className="text-xs font-medium text-slate-700">{mod.label}</span>
                    </div>
                  </td>
                  {ROLES.map(role => {
                    const has = (access[role] || []).includes(mod.path);
                    const c = ROLE_COLORS[role];
                    return (
                      <td key={role} className="px-3 py-2.5 text-center">
                        <button
                          onClick={() => toggle(role, mod.path)}
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center mx-auto transition-all ${
                            has
                              ? `${c.check} border-transparent text-white shadow-sm`
                              : "border-slate-200 hover:border-slate-400 bg-white"
                          }`}
                        >
                          {has && <Check className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer summary */}
      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex flex-wrap gap-4">
        {ROLES.map(role => (
          <div key={role} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span className={`capitalize font-semibold ${ROLE_COLORS[role].badge.split(" ")[1]}`}>{role}:</span>
            <span>{(access[role] || []).length} module{(access[role] || []).length !== 1 ? "s" : ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}