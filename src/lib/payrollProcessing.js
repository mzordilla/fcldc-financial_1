import { base44 } from "@/api/base44Client";

// Generates project labor cost Transactions + Payables (net salaries + statutory remittances)
// for all approved entries in a payroll period, then marks the period/entries as processed.
export async function processPayroll(period, approvedEntries) {
  const payDate = period.pay_date || period.period_end;

  const projectGroups = {};
  approvedEntries.forEach((entry) => {
    const key = entry.project_code || "unassigned";
    if (!projectGroups[key]) {
      projectGroups[key] = { project_code: entry.project_code, project_name: entry.project_name, chart_of_account: entry.chart_of_account, total: 0 };
    }
    projectGroups[key].total += entry.gross_pay || 0;
  });

  await Promise.all(
    Object.values(projectGroups).map((group) =>
      base44.entities.Transaction.create({
        description: `Payroll - ${group.project_name || group.project_code || "Unassigned"} (${period.period_label})`,
        amount: group.total,
        type: "expense",
        category: "direct_labor",
        chart_of_account: group.chart_of_account || undefined,
        project_code: group.project_code || undefined,
        date: payDate,
        status: "completed",
      })
    )
  );

  const totalNetPay = approvedEntries.reduce((s, e) => s + (e.net_pay || 0), 0);
  if (totalNetPay > 0) {
    await base44.entities.Payable.create({
      supplier_name: `Employees - ${period.period_label}`,
      description: `Net salaries for ${period.period_label} (${approvedEntries.length} employee${approvedEntries.length !== 1 ? "s" : ""})`,
      amount: totalNetPay,
      due_date: payDate,
      category: "payroll",
      status: "unpaid",
    });
  }

  const statutoryTotals = {
    "SSS": approvedEntries.reduce((s, e) => s + (e.sss_contribution || 0), 0),
    "PhilHealth": approvedEntries.reduce((s, e) => s + (e.philhealth_contribution || 0), 0),
    "Pag-IBIG (HDMF)": approvedEntries.reduce((s, e) => s + (e.pagibig_contribution || 0), 0),
    "BIR - Withholding Tax": approvedEntries.reduce((s, e) => s + (e.withholding_tax || 0), 0),
  };

  await Promise.all(
    Object.entries(statutoryTotals)
      .filter(([, amount]) => amount > 0)
      .map(([agency, amount]) =>
        base44.entities.Payable.create({
          supplier_name: agency,
          description: `Statutory remittance for ${period.period_label}`,
          amount,
          due_date: payDate,
          category: "payroll",
          status: "unpaid",
        })
      )
  );

  await base44.entities.PayrollEntry.bulkUpdate(
    approvedEntries.map((e) => ({ id: e.id, approval_status: "processed" }))
  );

  await base44.entities.PayrollPeriod.update(period.id, { status: "processed" });
}