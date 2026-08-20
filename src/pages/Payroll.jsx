import { useState } from "react";
import { CalendarDays, Users } from "lucide-react";
import { ExecutiveSegmentBar } from "@/components/shared/ExecutiveTabs";
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

      <ExecutiveSegmentBar
        items={[{ key: "periods", label: "Payroll Periods", icon: CalendarDays }, { key: "employees", label: "Employees", icon: Users }]}
        activeKey={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "periods" && <PayrollPeriodsTab />}
      {activeTab === "employees" && <EmployeesTab />}
    </div>
  );
}