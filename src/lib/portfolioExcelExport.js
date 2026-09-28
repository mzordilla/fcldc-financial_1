import * as XLSX from "xlsx";

const NUM_FMT = "#,##0.00";

// Builds a sheet with title, date, header row, data rows, totals row, peso number format and column widths.
function buildSheet(title, columns, rows) {
  const today = new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" });
  const aoa = [[title], [`As of ${today}`], [], columns.map(c => c.label)];
  rows.forEach(r => aoa.push(columns.map(c => r[c.key] ?? "")));
  const totalRow = columns.map((c, i) => (i === 0 ? "TOTAL" : c.money ? rows.reduce((s, r) => s + (Number(r[c.key]) || 0), 0) : ""));
  aoa.push([], totalRow);

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: columns.length - 1 } }];
  ws["!cols"] = columns.map(c => ({ wch: c.width || 16 }));
  ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 3, c: 0 }, e: { r: 3 + rows.length, c: columns.length - 1 } }) };
  columns.forEach((c, ci) => {
    if (!c.money) return;
    for (let r = 4; r < aoa.length; r++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c: ci })];
      if (cell && cell.t === "n") cell.z = NUM_FMT;
    }
  });
  return ws;
}

export function exportPortfolioReport(filename, sheets) {
  const wb = XLSX.utils.book_new();
  sheets.forEach(s => XLSX.utils.book_append_sheet(wb, buildSheet(s.title, s.columns, s.rows), s.name));
  XLSX.writeFile(wb, filename);
}

const today = () => new Date().toISOString().split("T")[0];
const daysPast = (d) => (d ? Math.max(0, Math.floor((Date.now() - new Date(d)) / 86400000)) : 0);

export function exportLeaseReceivables(collections) {
  const rows = collections.filter(c => !c.collected).sort((a, b) => (a.tenant_name || "").localeCompare(b.tenant_name || "") || (a.month || "").localeCompare(b.month || "")).map(c => ({
    tenant: c.tenant_name, building: c.building, unit: c.unit_number, month: c.month,
    rent: c.rent_amount || 0, dues: c.association_dues || 0, amount: c.amount || 0, notes: c.notes,
  }));
  exportPortfolioReport(`Lease_Receivables_${today()}.xlsx`, [{
    name: "Lease Receivables", title: "LEASE RECEIVABLES REPORT", rows,
    columns: [
      { key: "tenant", label: "Tenant", width: 28 }, { key: "building", label: "Building", width: 16 },
      { key: "unit", label: "Unit", width: 10 }, { key: "month", label: "Billing Month", width: 14 },
      { key: "rent", label: "Rent", money: true }, { key: "dues", label: "Assoc. Dues", money: true },
      { key: "amount", label: "Amount Due", money: true }, { key: "notes", label: "Notes", width: 30 },
    ],
  }]);
}

export function exportCondoSalesReceivables(receivables) {
  const rows = receivables.filter(r => r.property_listing_id && r.status !== "paid").map(r => ({
    client: r.client_name, project: r.project_name, invoice: r.invoice_number, due: r.due_date,
    amount: r.amount || 0, paid: r.amount_paid || 0, balance: (r.amount || 0) - (r.amount_paid || 0),
    status: (r.status || "").replace(/_/g, " "), days: r.status === "paid" ? 0 : daysPast(r.due_date),
  }));
  exportPortfolioReport(`Condo_Sales_Receivables_${today()}.xlsx`, [{
    name: "Condo Sales Receivables", title: "CONDO SALES RECEIVABLES REPORT", rows,
    columns: [
      { key: "client", label: "Buyer", width: 28 }, { key: "project", label: "Property / Unit", width: 26 },
      { key: "invoice", label: "Invoice #", width: 14 }, { key: "due", label: "Due Date", width: 12 },
      { key: "amount", label: "Contract Amount", money: true, width: 18 }, { key: "paid", label: "Amount Paid", money: true },
      { key: "balance", label: "Balance", money: true }, { key: "status", label: "Status", width: 14 },
      { key: "days", label: "Days Past Due", width: 14 },
    ],
  }]);
}

export function exportListings(listings) {
  const rows = listings.map(l => {
    const paid = (l.payment_history || []).reduce((s, p) => s + (p.amount || 0), 0);
    return {
      units: (l.units || []).map(u => [u.building, u.unit_number].filter(Boolean).join(" ")).join(", "),
      type: (l.listing_type || "").replace(/_/g, " "), status: (l.status || "").replace(/_/g, " "),
      client: l.buyer_tenant_name, agent: l.agent, listed: l.date_listed, closed: l.date_closed,
      asking: l.asking_price || 0, final: l.final_price || 0, paid,
    };
  });
  exportPortfolioReport(`Listings_Report_${today()}.xlsx`, [{
    name: "Listings", title: "PROPERTY LISTINGS REPORT", rows,
    columns: [
      { key: "units", label: "Unit(s)", width: 26 }, { key: "type", label: "Type", width: 10 },
      { key: "status", label: "Status", width: 12 }, { key: "client", label: "Buyer / Tenant", width: 26 },
      { key: "agent", label: "Agent", width: 18 }, { key: "listed", label: "Date Listed", width: 12 },
      { key: "closed", label: "Date Closed", width: 12 }, { key: "asking", label: "Asking Price", money: true, width: 18 },
      { key: "final", label: "Final Price", money: true, width: 18 }, { key: "paid", label: "Payments Received", money: true, width: 18 },
    ],
  }]);
}