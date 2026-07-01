import { base44 } from "@/api/base44Client";

// Generates project labor cost Transactions + Payables (net salaries + statutory remittances)
// for all approved entries in a payroll period, then marks the period/entries as processed.
export async function processPayroll(period, approvedEntries) {
  const payDate = period.pay_date || period.period_end;

  await Promise.all(
    approvedEntries.map((entry) =>
      base44.entities.Transaction.create({
        description: `Payroll - ${entry.employee_name} (${period.period_label})`,
        amount: entry.gross_pay || 0,
        type: "expense",
        category: "direct_labor",
        project_code: entry.project_code || undefined,
        date: payDate,
        status: "completed",
      })
    )
  );

  await Promise.all(
    approvedEntries.map((entry) =>
      base44.entities.Payable.create({
        supplier_name: entry.employee_name,
        description: `Net salary - ${period.period_label}`,
        amount: entry.net_pay || 0,
        due_date: payDate,
        project_name: entry.project_name || undefined,
        category: "payroll",
        status: "unpaid",
      })
    )
  );

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