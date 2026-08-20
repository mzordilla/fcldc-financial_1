import { Newspaper, Gauge, LineChart, Wallet, Landmark, CreditCard, Scale, ClipboardList, FolderTree, CalendarDays, CalendarRange, BookOpen, RefreshCw, FileBox, PiggyBank } from "lucide-react";
import { ExecutiveSegmentBar } from "@/components/shared/ExecutiveTabs";

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
    <ExecutiveSegmentBar
      items={GROUPS.flatMap((group) => group.tabs)}
      activeKey={activeTab}
      onChange={onChange}
    />
  );
}