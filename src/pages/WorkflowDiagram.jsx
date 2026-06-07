import React, { useState } from "react";

const COLORS = {
  procurement: { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-800", dot: "bg-blue-500", header: "bg-blue-500" },
  accounting: { bg: "bg-emerald-50", border: "border-emerald-300", text: "text-emerald-800", dot: "bg-emerald-500", header: "bg-emerald-500" },
  disbursement: { bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-800", dot: "bg-purple-500", header: "bg-purple-500" },
  realestate: { bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-800", dot: "bg-orange-500", header: "bg-orange-500" },
  finance: { bg: "bg-rose-50", border: "border-rose-300", text: "text-rose-800", dot: "bg-rose-500", header: "bg-rose-500" },
  reporting: { bg: "bg-slate-50", border: "border-slate-300", text: "text-slate-800", dot: "bg-slate-500", header: "bg-slate-600" },
};

const flows = [
  {
    id: "procurement",
    title: "Procurement Flow",
    subtitle: "Purchase Order → Receiving → Payable",
    color: "procurement",
    steps: [
      { label: "Purchase Request", desc: "User submits a Purchase Order with line items, supplier, category & project", role: "Procurement" },
      { label: "PO Approval", desc: "PO goes through multi-step workflow: Submitted → Reviewed → Approved / Rejected", role: "Admin / Reviewer" },
      { label: "Goods / Services Received", desc: "Receiving team logs delivered items against the PO (full or partial)", role: "Procurement" },
      { label: "Convert PO → Payable", desc: "Approved PO is converted into a Payable. Double-entry posted: Dr Expense/Asset · Cr Accounts Payable", role: "Accounting" },
      { label: "Payable Created", desc: "Supplier invoice tracked in Payables with status: Unpaid / Partially Paid / Paid", role: "Disbursement" },
    ],
    arrows: true,
  },
  {
    id: "payables",
    title: "Payables & Payment Flow",
    subtitle: "Invoice → Payment → Ledger",
    color: "disbursement",
    steps: [
      { label: "Payable / Invoice Received", desc: "Payable created manually or converted from an approved PO", role: "Accounting / Disbursement" },
      { label: "Payment Request (Optional)", desc: "A formal Payment Request can be raised and approved before disbursing funds", role: "Disbursement" },
      { label: "Mark as Paid", desc: "Payment recorded with method, bank account, reference, and amount. Supports partial payments", role: "Disbursement" },
      { label: "Double-Entry Posted", desc: "Dr Accounts Payable · Cr Bank / Cash — transaction recorded in the general ledger", role: "System (Auto)" },
      { label: "Supplier Statement", desc: "Monthly statement generated per supplier showing opening balance, invoices, payments, and closing balance", role: "Admin / Accounting" },
    ],
    arrows: true,
  },
  {
    id: "receivables",
    title: "Receivables & Billing Flow",
    subtitle: "Billing Cycle → Invoice → Collection",
    color: "accounting",
    steps: [
      { label: "Billing Cycle Created", desc: "Billing cycle defined with contract amount, accomplishment %, change orders, retention, and deductions", role: "Accounting" },
      { label: "Billing Approval", desc: "Billing cycle reviewed and approved before issuing the invoice to the client", role: "Admin" },
      { label: "Receivable Created", desc: "Approved billing cycle auto-creates a Receivable linked to the project and client", role: "System (Auto)" },
      { label: "Collection Recorded", desc: "Payment collections logged with bank account, date, and reference. Partial collections supported", role: "Accounting" },
      { label: "Status Updated", desc: "Receivable status: Outstanding → Partially Paid → Paid. Transaction posted to income ledger", role: "System (Auto)" },
    ],
    arrows: true,
  },
  {
    id: "payments",
    title: "Payment Approval Workflow",
    subtitle: "Request → Review → Approve → Disburse",
    color: "finance",
    steps: [
      { label: "Payment Request Submitted", desc: "Requestor submits a payment request with payee, amount, category, and project allocation", role: "Any Staff" },
      { label: "Under Review", desc: "Reviewer checks documentation and request details before escalating to approver", role: "Reviewer" },
      { label: "Approved / Rejected", desc: "Final approver grants or rejects payment. Notes and audit trail recorded at each step", role: "Admin / Finance" },
      { label: "Payment Disbursed", desc: "Approved request is paid — status updated to 'Paid' and linked to bank account transaction", role: "Disbursement" },
      { label: "Audit Log Entry", desc: "Every action (submit, review, approve, reject, pay) is logged with actor, timestamp, and notes", role: "System (Auto)" },
    ],
    arrows: true,
  },
  {
    id: "realestate",
    title: "Real Estate Portfolio Flow",
    subtitle: "Units → Listings → Tenants / Buyers",
    color: "realestate",
    steps: [
      { label: "Unit Setup", desc: "Condo units created with type, area, price/sqm, rent rate, VAT, and closing fees", role: "Admin / Marketing" },
      { label: "Listing Created", desc: "Unit listed For Sale or For Lease with asking price and assigned agent", role: "Marketing" },
      { label: "Negotiation & Closing", desc: "Listing status moves: Active → Under Negotiation → Sold / Leased. Final price recorded", role: "Marketing" },
      { label: "Tenant / Buyer Linked", desc: "Active tenants linked to units with lease dates, monthly rent, deposit, and association dues", role: "Admin" },
      { label: "Portfolio Reports", desc: "Occupancy rates, revenue, and portfolio summary tracked across all buildings and unit types", role: "Admin / Marketing" },
    ],
    arrows: true,
  },
  {
    id: "reporting",
    title: "Reporting & Compliance",
    subtitle: "Ledger → Reports → Reconciliation",
    color: "reporting",
    steps: [
      { label: "Transactions Posted", desc: "All income and expense transactions recorded per project, category, and bank account", role: "Accounting" },
      { label: "Bank Reconciliation", desc: "Monthly reconciliation of bank statement vs. book balance. Tracks deposits-in-transit and outstanding checks", role: "Accounting" },
      { label: "Income Statement", desc: "P&L report aggregating revenue, costs, and project-level profitability", role: "Admin / Accounting" },
      { label: "Balance Sheet", desc: "Assets, liabilities, and equity snapshot derived from Chart of Accounts", role: "Admin" },
      { label: "Audit Trail", desc: "Full immutable log of every create / update / delete action across all entities with before/after snapshots", role: "Admin" },
    ],
    arrows: true,
  },
];

const roleColors = {
  "Procurement": "bg-blue-100 text-blue-700",
  "Admin / Reviewer": "bg-slate-100 text-slate-700",
  "Accounting": "bg-emerald-100 text-emerald-700",
  "Disbursement": "bg-purple-100 text-purple-700",
  "Accounting / Disbursement": "bg-teal-100 text-teal-700",
  "Admin": "bg-slate-100 text-slate-700",
  "System (Auto)": "bg-amber-100 text-amber-700",
  "Admin / Finance": "bg-rose-100 text-rose-700",
  "Any Staff": "bg-gray-100 text-gray-700",
  "Reviewer": "bg-indigo-100 text-indigo-700",
  "Admin / Marketing": "bg-orange-100 text-orange-700",
  "Marketing": "bg-orange-100 text-orange-700",
  "Admin / Accounting": "bg-green-100 text-green-700",
};

function FlowCard({ flow }) {
  const [expanded, setExpanded] = useState(true);
  const c = COLORS[flow.color];

  return (
    <div className={`rounded-2xl border-2 ${c.border} ${c.bg} overflow-hidden shadow-sm`}>
      <button
        className={`w-full flex items-center justify-between px-5 py-4 ${c.header} text-white`}
        onClick={() => setExpanded(v => !v)}
      >
        <div className="text-left">
          <div className="font-bold text-base">{flow.title}</div>
          <div className="text-xs opacity-80 mt-0.5">{flow.subtitle}</div>
        </div>
        <span className="text-lg">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="p-5">
          <div className="flex flex-col gap-0">
            {flow.steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                {/* Left timeline */}
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full ${c.dot} text-white flex items-center justify-center text-sm font-bold flex-shrink-0 shadow`}>
                    {i + 1}
                  </div>
                  {i < flow.steps.length - 1 && (
                    <div className={`w-0.5 flex-1 my-1 ${c.dot} opacity-30`} style={{ minHeight: 24 }} />
                  )}
                </div>

                {/* Step card */}
                <div className="bg-white/80 border border-white rounded-xl p-3 mb-3 flex-1 shadow-sm">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <span className={`font-semibold text-sm ${c.text}`}>{step.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${roleColors[step.role] || "bg-gray-100 text-gray-600"}`}>
                      {step.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const roleMatrix = [
  { role: "Admin", modules: ["All modules — full read/write/approve access"] },
  { role: "Accounting", modules: ["Projects", "Billing Cycles", "Receivables", "Payables", "Transactions", "Bank Reconciliation", "Payment Approvals", "Chart of Accounts"] },
  { role: "Disbursement", modules: ["Bank Accounts", "Transactions", "Payment Approvals", "Payables", "Billing Cycles", "Chart of Accounts"] },
  { role: "Procurement", modules: ["Purchase Orders", "Payment Approvals", "Payees", "Receiving Items", "Materials History"] },
  { role: "Marketing", modules: ["Condo Units", "Tenants", "Listings", "Portfolio Reports"] },
];

export default function WorkflowDiagram() {
  const [activeTab, setActiveTab] = useState("flows");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">FCLDC Finance System</h1>
          <p className="text-slate-500 mt-1 text-sm">Application Workflow & Process Overview</p>
          <div className="flex justify-center gap-2 mt-4">
            <button
              onClick={() => setActiveTab("flows")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${activeTab === "flows" ? "bg-slate-800 text-white shadow" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
            >
              Process Flows
            </button>
            <button
              onClick={() => setActiveTab("roles")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${activeTab === "roles" ? "bg-slate-800 text-white shadow" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
            >
              Role & Access Matrix
            </button>
            <button
              onClick={() => setActiveTab("entities")}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${activeTab === "entities" ? "bg-slate-800 text-white shadow" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
            >
              Data Model
            </button>
          </div>
        </div>

        {/* Process Flows Tab */}
        {activeTab === "flows" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {flows.map(f => <FlowCard key={f.id} flow={f} />)}
          </div>
        )}

        {/* Roles Tab */}
        {activeTab === "roles" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-800 text-white px-6 py-4">
                <h2 className="font-bold text-lg">Role-Based Access Control</h2>
                <p className="text-xs text-slate-400 mt-0.5">Each role sees only the modules relevant to their function</p>
              </div>
              <div className="divide-y divide-slate-100">
                {roleMatrix.map((r, i) => (
                  <div key={i} className="flex gap-4 px-6 py-4 items-start">
                    <div className="w-32 flex-shrink-0">
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${
                        r.role === "Admin" ? "bg-slate-800 text-white" :
                        r.role === "Accounting" ? "bg-emerald-100 text-emerald-700" :
                        r.role === "Disbursement" ? "bg-purple-100 text-purple-700" :
                        r.role === "Procurement" ? "bg-blue-100 text-blue-700" :
                        "bg-orange-100 text-orange-700"
                      }`}>{r.role}</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {r.modules.map((m, j) => (
                        <span key={j} className="text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded-lg px-2.5 py-1">{m}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Legend */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-semibold text-slate-700 mb-3 text-sm">Key Principles</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                {[
                  ["🔐 Admin Override", "Admin role can access, approve, and modify anything across the system."],
                  ["📋 Approval Chain", "Purchase Orders and Payment Requests follow multi-step approval workflows with audit logs."],
                  ["🔄 Auto-Posting", "Payments and collections automatically generate double-entry ledger transactions."],
                  ["📊 Read Separation", "Reporting pages are accessible to Admin and Accounting; operational pages to respective roles."],
                ].map(([title, desc], i) => (
                  <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="font-semibold text-slate-700 mb-1">{title}</p>
                    <p>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Data Model Tab */}
        {activeTab === "entities" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  group: "Procurement",
                  color: "blue",
                  entities: [
                    { name: "PurchaseOrder", desc: "PO with line items, approval workflow, and delivery tracking" },
                    { name: "ReceivingItem", desc: "Goods receipt record linked to a PO" },
                    { name: "Payee", desc: "Supplier / vendor master list with bank details and VAT status" },
                  ]
                },
                {
                  group: "Accounts Payable",
                  color: "purple",
                  entities: [
                    { name: "Payable", desc: "Supplier invoice / liability with payment history" },
                    { name: "PaymentRequest", desc: "Formal payment request with multi-step approval" },
                  ]
                },
                {
                  group: "Accounts Receivable",
                  color: "emerald",
                  entities: [
                    { name: "Receivable", desc: "Client invoice with collection history" },
                    { name: "BillingCycle", desc: "Progress billing with accomplishment %, change orders, retention" },
                  ]
                },
                {
                  group: "Projects",
                  color: "teal",
                  entities: [
                    { name: "Project", desc: "Construction / development project with contract details" },
                    { name: "ChangeOrder", desc: "Additive or deductive scope changes linked to a project" },
                  ]
                },
                {
                  group: "Finance & Accounting",
                  color: "rose",
                  entities: [
                    { name: "Transaction", desc: "General ledger income / expense entries" },
                    { name: "ChartOfAccount", desc: "Account code master list by type and category" },
                    { name: "BankAccount", desc: "Company bank accounts with running balances" },
                    { name: "BankReconciliation", desc: "Monthly bank vs. book reconciliation" },
                  ]
                },
                {
                  group: "Loans & Assets",
                  color: "amber",
                  entities: [
                    { name: "WorkingCapitalLoan", desc: "Short-term credit lines and working capital facilities" },
                    { name: "BankLoan", desc: "Long-term bank loans with amortization details" },
                    { name: "Debt", desc: "General debt / liability records" },
                  ]
                },
                {
                  group: "Fixed Assets (PPE)",
                  color: "amber",
                  entities: [
                    { name: "PPEAsset", desc: "Fixed assets with acquisition cost, useful life, depreciation method, and book value tracking" },
                  ]
                },
                {
                  group: "Real Estate",
                  color: "orange",
                  entities: [
                    { name: "CondoUnit", desc: "Unit master with pricing, area, and status" },
                    { name: "Tenant", desc: "Active and historical lease records" },
                    { name: "PropertyListing", desc: "For-sale or for-lease listings with agents" },
                  ]
                },
                {
                  group: "System",
                  color: "slate",
                  entities: [
                    { name: "AuditLog", desc: "Immutable log of all entity changes with before/after snapshots" },
                  ]
                },
              ].map((group, gi) => (
                <div key={gi} className={`rounded-2xl border overflow-hidden shadow-sm border-${group.color}-200`}>
                  <div className={`bg-${group.color}-500 px-4 py-3`}>
                    <h3 className="font-bold text-white text-sm">{group.group}</h3>
                  </div>
                  <div className="bg-white divide-y divide-slate-100">
                    {group.entities.map((e, ei) => (
                      <div key={ei} className="px-4 py-3">
                        <p className={`font-semibold text-xs text-${group.color}-700 font-mono`}>{e.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{e.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Key relationships */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-semibold text-slate-700 mb-3 text-sm">Key Entity Relationships</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  ["PurchaseOrder", "→", "ReceivingItem", "PO fulfilled by one or more receiving records"],
                  ["PurchaseOrder", "→", "Payable", "Approved PO converted into a supplier payable"],
                  ["Payable", "→", "Transaction", "Payment auto-posts Dr AP / Cr Bank to ledger"],
                  ["BillingCycle", "→", "Receivable", "Approved billing cycle creates client invoice"],
                  ["Receivable", "→", "Transaction", "Collection auto-posts Dr Bank / Cr Revenue to ledger"],
                  ["Project", "→", "ChangeOrder", "Projects can have multiple additive/deductive COs"],
                  ["PaymentRequest", "→", "Payable", "Approved payment requests link to payable records"],
                  ["CondoUnit", "→", "Tenant", "Unit occupancy tracked through tenant lease records"],
                ["PPEAsset", "→", "Transaction", "Asset acquisition posts Dr Asset / Cr Bank; depreciation posts Dr Depreciation Expense / Cr Accumulated Depreciation"],
                ].map(([from, arrow, to, desc], i) => (
                  <div key={i} className="flex items-start gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
                    <span className="font-mono text-blue-700 font-semibold whitespace-nowrap">{from}</span>
                    <span className="text-slate-400">{arrow}</span>
                    <span className="font-mono text-emerald-700 font-semibold whitespace-nowrap">{to}</span>
                    <span className="text-slate-500 leading-relaxed">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}