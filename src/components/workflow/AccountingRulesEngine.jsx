import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Save, RotateCcw, Plus, Trash2, ChevronDown, ChevronUp, BookOpen, ArrowRight } from "lucide-react";

const STORAGE_KEY = "fcldc_accounting_rules_v1";

// Default double-entry rules per transaction event
const DEFAULT_RULES = [
  {
    id: "po_expense",
    event: "PO → Payable (Expense)",
    description: "When an approved PO is converted to a Payable for an expense (materials, labor, services)",
    entries: [
      { side: "debit", account_type: "expense", category: "material_cost", label: "Dr — Cost / Expense Account", notes: "Records the cost incurred" },
      { side: "credit", account_type: "liability", category: "current_liabilities", label: "Cr — Accounts Payable", notes: "Creates the liability to the supplier" },
    ],
  },
  {
    id: "po_asset",
    event: "PO → Payable (Asset)",
    description: "When an approved PO is converted to a Payable for an asset purchase (equipment, fixtures)",
    entries: [
      { side: "debit", account_type: "asset", category: "non_current_assets", label: "Dr — Asset Account", notes: "Capitalizes the purchased asset" },
      { side: "credit", account_type: "liability", category: "current_liabilities", label: "Cr — Accounts Payable", notes: "Creates the liability to the supplier" },
    ],
  },
  {
    id: "payable_payment",
    event: "Payable → Mark as Paid",
    description: "When a supplier payable is settled via bank transfer, check, or cash",
    entries: [
      { side: "debit", account_type: "liability", category: "current_liabilities", label: "Dr — Accounts Payable", notes: "Clears the liability" },
      { side: "credit", account_type: "asset", category: "current_assets", label: "Cr — Bank / Cash Account", notes: "Reduces bank balance" },
    ],
  },
  {
    id: "billing_receivable",
    event: "Billing Cycle → Receivable",
    description: "When an approved billing cycle auto-creates a client receivable / invoice",
    entries: [
      { side: "debit", account_type: "asset", category: "current_assets", label: "Dr — Accounts Receivable", notes: "Records amount owed by client" },
      { side: "credit", account_type: "income", category: "project_payment", label: "Cr — Revenue Account", notes: "Recognizes contract revenue" },
    ],
  },
  {
    id: "receivable_collection",
    event: "Receivable → Collection Recorded",
    description: "When a client payment is received and logged against an outstanding receivable",
    entries: [
      { side: "debit", account_type: "asset", category: "current_assets", label: "Dr — Bank / Cash Account", notes: "Records cash received" },
      { side: "credit", account_type: "asset", category: "current_assets", label: "Cr — Accounts Receivable", notes: "Clears the receivable" },
    ],
  },
  {
    id: "ppe_acquisition",
    event: "PPE Asset Acquisition",
    description: "When a fixed asset is acquired (equipment, vehicle, building improvement)",
    entries: [
      { side: "debit", account_type: "asset", category: "non_current_assets", label: "Dr — Fixed Asset Account", notes: "Capitalizes at cost" },
      { side: "credit", account_type: "asset", category: "current_assets", label: "Cr — Bank / Cash Account", notes: "Reduces cash paid" },
    ],
  },
  {
    id: "ppe_depreciation",
    event: "PPE Depreciation (Monthly)",
    description: "Monthly depreciation charge on fixed assets using straight-line or declining balance method",
    entries: [
      { side: "debit", account_type: "expense", category: "overhead", label: "Dr — Depreciation Expense", notes: "Charges period depreciation" },
      { side: "credit", account_type: "asset", category: "non_current_assets", label: "Cr — Accumulated Depreciation", notes: "Reduces book value of asset" },
    ],
  },
  {
    id: "withholding_tax",
    event: "Payable — Withholding Tax",
    description: "When withholding tax is deducted from a supplier payment (EWT / BIR compliance)",
    entries: [
      { side: "debit", account_type: "liability", category: "current_liabilities", label: "Dr — Accounts Payable (Gross)", notes: "Clears full gross liability" },
      { side: "credit", account_type: "liability", category: "current_liabilities", label: "Cr — Withholding Tax Payable", notes: "Records tax withheld" },
      { side: "credit", account_type: "asset", category: "current_assets", label: "Cr — Bank / Cash (Net Payment)", notes: "Net cash disbursed to supplier" },
    ],
  },
];

const ACCOUNT_TYPES = ["asset", "liability", "equity", "income", "expense"];
const CATEGORIES = [
  "project_payment", "material_cost", "labor", "equipment", "subcontractor",
  "overhead", "permits", "insurance", "bank_reconciliation", "non_current_assets",
  "current_assets", "current_liabilities", "non_current_liabilities",
  "repair_and_maintenance", "fixtures", "other",
];

const SIDE_STYLES = {
  debit: "bg-blue-50 border-blue-200 text-blue-800",
  credit: "bg-emerald-50 border-emerald-200 text-emerald-800",
};

function loadRules() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_RULES;
  } catch {
    return DEFAULT_RULES;
  }
}

function EntryRow({ entry, onChange, onDelete, coaAccounts }) {
  return (
    <div className={`flex flex-wrap items-start gap-2 p-3 rounded-xl border ${SIDE_STYLES[entry.side]} relative`}>
      {/* Side */}
      <select
        value={entry.side}
        onChange={e => onChange({ ...entry, side: e.target.value })}
        className="text-xs font-bold px-2 py-1 rounded-lg border border-current/20 bg-white/70 focus:outline-none w-20"
      >
        <option value="debit">Dr (Debit)</option>
        <option value="credit">Cr (Credit)</option>
      </select>

      {/* Label */}
      <input
        value={entry.label}
        onChange={e => onChange({ ...entry, label: e.target.value })}
        placeholder="Label (e.g. Dr — Cost of Goods)"
        className="flex-1 text-xs px-2 py-1 rounded-lg border border-current/20 bg-white/70 focus:outline-none min-w-[180px]"
      />

      {/* Account Type */}
      <select
        value={entry.account_type}
        onChange={e => onChange({ ...entry, account_type: e.target.value })}
        className="text-xs px-2 py-1 rounded-lg border border-current/20 bg-white/70 focus:outline-none w-28"
      >
        {ACCOUNT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
      </select>

      {/* Category */}
      <select
        value={entry.category}
        onChange={e => onChange({ ...entry, category: e.target.value })}
        className="text-xs px-2 py-1 rounded-lg border border-current/20 bg-white/70 focus:outline-none w-36"
      >
        {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
      </select>

      {/* Linked COA Account (optional) */}
      <select
        value={entry.coa_account_id || ""}
        onChange={e => onChange({ ...entry, coa_account_id: e.target.value })}
        className="text-xs px-2 py-1 rounded-lg border border-current/20 bg-white/70 focus:outline-none w-44"
      >
        <option value="">— Link COA Account —</option>
        {coaAccounts
          .filter(a => a.account_type === entry.account_type)
          .map(a => <option key={a.id} value={a.id}>{a.account_code ? `${a.account_code} · ` : ""}{a.account_name}</option>)}
      </select>

      {/* Notes */}
      <input
        value={entry.notes}
        onChange={e => onChange({ ...entry, notes: e.target.value })}
        placeholder="Notes..."
        className="flex-1 text-xs px-2 py-1 rounded-lg border border-current/20 bg-white/70 focus:outline-none min-w-[120px]"
      />

      <button onClick={onDelete} className="text-red-400 hover:text-red-600 p-1 flex-shrink-0">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function RuleCard({ rule, onChange, onDelete, coaAccounts }) {
  const [expanded, setExpanded] = useState(true);

  const updateEntry = (idx, updated) => {
    const entries = [...rule.entries];
    entries[idx] = updated;
    onChange({ ...rule, entries });
  };

  const deleteEntry = (idx) => {
    onChange({ ...rule, entries: rule.entries.filter((_, i) => i !== idx) });
  };

  const addEntry = () => {
    onChange({ ...rule, entries: [...rule.entries, { side: "debit", account_type: "asset", category: "current_assets", label: "", notes: "" }] });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div
        className="flex items-start justify-between px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <BookOpen className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-bold text-sm text-slate-800">{rule.event}</span>
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{rule.entries.length} entr{rule.entries.length === 1 ? "y" : "ies"}</span>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{rule.description}</p>
        </div>
        <div className="flex items-center gap-2 ml-3 flex-shrink-0">
          <button
            onClick={e => { e.stopPropagation(); onDelete(); }}
            className="text-slate-300 hover:text-red-500 transition-colors p-1"
            title="Delete rule"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-slate-100 pt-4">
          {/* Editable event name & description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Event Name</label>
              <input
                value={rule.event}
                onChange={e => onChange({ ...rule, event: e.target.value })}
                className="mt-1 w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-slate-50"
                onClick={e => e.stopPropagation()}
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Description</label>
              <input
                value={rule.description}
                onChange={e => onChange({ ...rule, description: e.target.value })}
                className="mt-1 w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-slate-50"
                onClick={e => e.stopPropagation()}
              />
            </div>
          </div>

          {/* Double-entry visualization */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Journal Entries</span>
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-[10px] text-slate-400">Debits = Credits</span>
          </div>

          <div className="space-y-2">
            {rule.entries.map((entry, idx) => (
              <EntryRow
                key={idx}
                entry={entry}
                onChange={updated => updateEntry(idx, updated)}
                onDelete={() => deleteEntry(idx)}
                coaAccounts={coaAccounts}
              />
            ))}
          </div>

          <button
            onClick={addEntry}
            className="flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-semibold mt-2 px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Journal Entry Line
          </button>

          {/* Visual T-account summary */}
          {rule.entries.length >= 2 && (
            <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">T-Account View</p>
              <div className="flex gap-4 flex-wrap">
                <div className="flex-1 min-w-[140px]">
                  <p className="text-[10px] font-bold text-blue-600 mb-1 uppercase">Debits</p>
                  {rule.entries.filter(e => e.side === "debit").map((e, i) => (
                    <div key={i} className="text-xs text-slate-700 py-0.5 border-b border-slate-200 last:border-0 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3 text-blue-400 flex-shrink-0" />
                      <span>{e.label || e.account_type}</span>
                    </div>
                  ))}
                </div>
                <div className="w-px bg-slate-300 self-stretch" />
                <div className="flex-1 min-w-[140px]">
                  <p className="text-[10px] font-bold text-emerald-600 mb-1 uppercase">Credits</p>
                  {rule.entries.filter(e => e.side === "credit").map((e, i) => (
                    <div key={i} className="text-xs text-slate-700 py-0.5 border-b border-slate-200 last:border-0 flex items-center gap-1">
                      <ArrowRight className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                      <span>{e.label || e.account_type}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AccountingRulesEngine() {
  const [rules, setRules] = useState(loadRules);
  const [coaAccounts, setCoaAccounts] = useState([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    base44.entities.ChartOfAccount.filter({ is_active: true }).then(setCoaAccounts).catch(() => {});
  }, []);

  const updateRule = (idx, updated) => {
    setRules(prev => prev.map((r, i) => i === idx ? updated : r));
    setSaved(false);
  };

  const deleteRule = (idx) => {
    setRules(prev => prev.filter((_, i) => i !== idx));
    setSaved(false);
  };

  const addRule = () => {
    setRules(prev => [...prev, {
      id: `rule_${Date.now()}`,
      event: "New Accounting Event",
      description: "Describe when this rule applies",
      entries: [
        { side: "debit", account_type: "asset", category: "current_assets", label: "Dr — Account", notes: "" },
        { side: "credit", account_type: "liability", category: "current_liabilities", label: "Cr — Account", notes: "" },
      ],
    }]);
    setSaved(false);
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setRules(DEFAULT_RULES);
    localStorage.removeItem(STORAGE_KEY);
    setSaved(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-emerald-700 text-white px-6 py-4 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-bold text-lg flex items-center gap-2"><BookOpen className="w-5 h-5" /> Accounting Rules Engine</h2>
            <p className="text-xs text-emerald-200 mt-0.5">Define double-entry journal rules per transaction event. Link each entry to a Chart of Accounts.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-emerald-200 transition-colors"
            >
              <RotateCcw className="w-3 h-3" /> Reset to Defaults
            </button>
            <button
              onClick={addRule}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <Plus className="w-3 h-3" /> Add Rule
            </button>
            <button
              onClick={handleSave}
              className={`flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg font-semibold transition-colors ${saved ? "bg-white text-emerald-700" : "bg-white/20 hover:bg-white/30 text-white"}`}
            >
              <Save className="w-3 h-3" /> {saved ? "Saved!" : "Save Rules"}
            </button>
          </div>
        </div>

        {/* COA summary bar */}
        <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center gap-3 flex-wrap">
          <span className="text-xs text-emerald-700 font-semibold">{coaAccounts.length} active COA accounts loaded</span>
          <span className="text-xs text-slate-400">·</span>
          {["asset", "liability", "equity", "income", "expense"].map(t => (
            <span key={t} className="text-[10px] text-slate-500">
              <span className="font-semibold capitalize">{t}:</span> {coaAccounts.filter(a => a.account_type === t).length}
            </span>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {[
          { color: "blue", label: "Debit (Dr)", desc: "Increases assets & expenses; decreases liabilities, equity & income" },
          { color: "emerald", label: "Credit (Cr)", desc: "Increases liabilities, equity & income; decreases assets & expenses" },
          { color: "slate", label: "Balance Rule", desc: "Total Debits must always equal Total Credits for each transaction" },
          { color: "amber", label: "COA Link", desc: "Each entry can be pinned to a specific Chart of Account for reporting" },
        ].map((item, i) => (
          <div key={i} className={`bg-${item.color}-50 border border-${item.color}-200 rounded-xl p-3`}>
            <p className={`font-bold text-${item.color}-700 mb-1`}>{item.label}</p>
            <p className="text-slate-500 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Rules */}
      <div className="space-y-3">
        {rules.map((rule, idx) => (
          <RuleCard
            key={rule.id || idx}
            rule={rule}
            onChange={updated => updateRule(idx, updated)}
            onDelete={() => deleteRule(idx)}
            coaAccounts={coaAccounts}
          />
        ))}
      </div>

      {rules.length === 0 && (
        <div className="text-center py-16 text-slate-400">
          <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No accounting rules defined.</p>
          <button onClick={addRule} className="mt-3 text-xs text-emerald-600 hover:underline font-semibold">+ Add your first rule</button>
        </div>
      )}
    </div>
  );
}