import { Newspaper, Gauge, LineChart, Wallet, Landmark, CreditCard, Scale, ClipboardList, FolderTree, CalendarDays, CalendarRange, BookOpen, RefreshCw, FileBox, PiggyBank } from "lucide-react";

const GROUPS = [
  {
    label: "Overview",
    tabs: [
      { key: "weekly_collated", label: "Weekly Collated", icon: Newspaper },
      { key: "efficiency", label: "Efficiency Dashboard", icon: Gauge },
      { key: "trend", label: "Trend Analysis", icon: LineChart },
    ],
  },
  {
    label: "Financial Statements",
    tabs: [
      { key: "pnl", label: "P&L / Cash Flow", icon: Wallet },
      { key: "balance_sheet", label: "Balance Sheet", icon: Scale },
      { key: "income_statement", label: "Income Statement", icon: ClipboardList },
      { key: "comparative_income_statement", label: "Comparative Income", icon: FolderTree },
      { key: "changes_in_equity", label: "Changes in Equity", icon: PiggyBank },
    ],
  },
  {
    label: "Transactions",
    tabs: [
      { key: "daily_transactions", label: "Daily", icon: CalendarDays },
      { key: "monthly_transactions", label: "Monthly", icon: CalendarRange },
      { key: "bank_transactions", label: "Bank Transactions", icon: CreditCard },
    ],
  },
  {
    label: "Other",
    tabs: [
      { key: "wc_loans", label: "Working Capital Loans", icon: Landmark },
      { key: "chart_of_accounts", label: "Chart of Accounts", icon: BookOpen },
      { key: "wht_sync", label: "WHT Sheets Sync", icon: RefreshCw },
      { key: "corporate_docs", label: "Corporate Documents", icon: FileBox },
    ],
  },
];

export default function ReportsTabs({ activeTab, onChange }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
      {GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-40 shrink-0">
            {group.label}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {group.tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => onChange(tab.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-transparent text-muted-foreground border-border hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}