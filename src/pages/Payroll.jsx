import { useState } from "react";
import EmployeesTab from "@/components/payroll/EmployeesTab";
import PayrollPeriodsTab from "@/components/payroll/PayrollPeriodsTab";

export default function Payroll() {
  const [activeTab, setActiveTab] = useState("periods");

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Payroll</h1>
        <p className="text-muted-foreground mt-1">Record labor costs, process payroll, and forward payables</p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "periods", label: "Payroll Periods", emoji: "🗓️" },
          { key: "employees", label: "Employees", emoji: "👤" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.key
                ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "periods" && <PayrollPeriodsTab />}
      {activeTab === "employees" && <EmployeesTab />}
    </div>
  );
}