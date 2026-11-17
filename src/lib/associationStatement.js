import { format, endOfMonth } from "date-fns";

export const PERIOD_TYPES = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

const num = (v) => Number(v) || 0;

// Philippine Peso, accounting style: negatives in parentheses
export const peso = (v) => {
  const s = `₱${Math.abs(num(v)).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return num(v) < 0 ? `(${s})` : s;
};

const DEFAULT_SECTIONS = [
  { title: "Association Dues and Other Income", type: "income", lines: ["Association Dues", "Penalties and Surcharges", "Move-in / Move-out Fees", "Other Income"] },
  { title: "Manpower and Personnel Expenses", type: "expense", lines: ["Property Management Staff Salaries", "Security Services", "Janitorial Services", "Government Contributions (SSS, PhilHealth, Pag-IBIG)", "13th Month Pay and Benefits"] },
  { title: "Repairs and Maintenance Expenses", type: "expense", lines: ["Elevator Maintenance", "Generator Maintenance", "Plumbing and Electrical Repairs", "Building and Common Area Repairs", "Maintenance Supplies and Materials"] },
  { title: "Utilities and Administrative Expenses", type: "expense", lines: ["Electricity - Common Areas", "Water - Common Areas", "Telephone and Internet", "Office Supplies", "Insurance", "Professional Fees", "Taxes and Licenses"] },
].map((s) => ({ ...s, lines: s.lines.map((description) => ({ description, amount: "" })) }));

const lastMonth = (s) => (s.period_type === "monthly" ? num(s.period_number) || 1 : s.period_type === "quarterly" ? (num(s.period_number) || 1) * 3 : 12);
const monthSpan = (s) => (s.period_type === "monthly" ? 1 : s.period_type === "quarterly" ? 3 : 12);
export const periodEnd = (s) => endOfMonth(new Date(num(s.year), lastMonth(s) - 1, 1));
export const periodStart = (s) => new Date(num(s.year), lastMonth(s) - monthSpan(s), 1);

export const periodLabel = (s) =>
  s.period_type === "monthly" ? `${MONTHS[lastMonth(s) - 1]} ${s.year}` : s.period_type === "quarterly" ? `Q${num(s.period_number) || 1} ${s.year}` : `FY ${s.year}`;

export const periodHeading = (s) => {
  const unit = s.period_type === "monthly" ? "Month" : s.period_type === "quarterly" ? "Quarter" : "Year";
  return `For the ${unit} Ended ${format(periodEnd(s), "MMMM d, yyyy")}`;
};

export const formatLongDate = (d) => (d ? format(new Date(`${d}T00:00:00`), "MMMM d, yyyy") : "");

export function computeTotals(sections = []) {
  const withTotals = sections.map((s) => ({ ...s, total: (s.lines || []).reduce((sum, l) => sum + num(l.amount), 0) }));
  const sumOf = (type) => withTotals.filter((s) => s.type === type).reduce((sum, s) => sum + s.total, 0);
  const totalIncome = sumOf("income");
  const totalExpenses = sumOf("expense");
  return { sections: withTotals, totalIncome, totalExpenses, net: totalIncome - totalExpenses };
}

// A new statement keeps the categories and signatories of the most recent one, with blank amounts.
export function newStatement(previous, user) {
  const now = new Date();
  return {
    condominium_name: previous?.condominium_name || "",
    period_type: previous?.period_type || "monthly",
    year: now.getFullYear(),
    period_number: previous?.period_type === "quarterly" ? Math.ceil((now.getMonth() + 1) / 3) : now.getMonth() + 1,
    preparation_date: format(now, "yyyy-MM-dd"),
    prepared_by: previous?.prepared_by || user?.full_name || "",
    prepared_by_position: previous?.prepared_by_position || "",
    checked_by: previous?.checked_by || "",
    checked_by_position: previous?.checked_by_position || "",
    approved_by: previous?.approved_by || "",
    approved_by_position: previous?.approved_by_position || "",
    sections: (previous?.sections || DEFAULT_SECTIONS).map((s) => ({ title: s.title, type: s.type, lines: (s.lines || []).map((l) => ({ description: l.description, amount: "" })) })),
    notes: "",
  };
}

export function toPayload(s) {
  const t = computeTotals(s.sections);
  return {
    condominium_name: s.condominium_name.trim(),
    period_type: s.period_type,
    year: num(s.year),
    period_number: s.period_type === "annual" ? 0 : num(s.period_number) || 1,
    period_label: periodLabel(s),
    period_start: format(periodStart(s), "yyyy-MM-dd"),
    period_end: format(periodEnd(s), "yyyy-MM-dd"),
    preparation_date: s.preparation_date,
    prepared_by: s.prepared_by, prepared_by_position: s.prepared_by_position,
    checked_by: s.checked_by, checked_by_position: s.checked_by_position,
    approved_by: s.approved_by, approved_by_position: s.approved_by_position,
    sections: s.sections.map((sec) => ({ title: sec.title, type: sec.type, lines: sec.lines.map((l) => ({ description: l.description, amount: num(l.amount) })) })),
    total_income: t.totalIncome, total_expenses: t.totalExpenses, net_surplus: t.net,
    notes: s.notes,
  };
}

const key = (v) => (v || "").trim().toLowerCase();

// Lines up several statements side by side, matching categories and line items by name.
export function buildComparison(list) {
  const sections = [];
  const blank = () => list.map(() => 0);
  list.forEach((st, i) => (st.sections || []).forEach((sec) => {
    let row = sections.find((x) => key(x.title) === key(sec.title) && x.type === sec.type);
    if (!row) { row = { title: sec.title, type: sec.type, lines: [], totals: blank() }; sections.push(row); }
    (sec.lines || []).forEach((l) => {
      let line = row.lines.find((x) => key(x.description) === key(l.description));
      if (!line) { line = { description: l.description, amounts: blank() }; row.lines.push(line); }
      line.amounts[i] += num(l.amount);
      row.totals[i] += num(l.amount);
    });
  }));
  sections.sort((a, b) => (a.type === b.type ? 0 : a.type === "income" ? -1 : 1));
  const sumOf = (type) => list.map((_, i) => sections.filter((s) => s.type === type).reduce((sum, s) => sum + s.totals[i], 0));
  const totalIncome = sumOf("income");
  const totalExpenses = sumOf("expense");
  return { sections, totalIncome, totalExpenses, net: totalIncome.map((v, i) => v - totalExpenses[i]) };
}