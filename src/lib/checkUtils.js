const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));

export function numberToWords(amount) {
  if (!amount || Number.isNaN(Number(amount))) return "ZERO PESOS ONLY";
  const ones = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
  const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];
  const hundreds = n => { let out = ""; if (n >= 100) { out += `${ones[Math.floor(n / 100)]} HUNDRED `; n %= 100; } if (n >= 20) { out += `${tens[Math.floor(n / 10)]} `; n %= 10; } return `${out}${n ? ones[n] : ""}`.trim(); };
  const convert = n => { if (!n) return "ZERO"; let out = ""; [[1000000000, "BILLION"], [1000000, "MILLION"], [1000, "THOUSAND"]].forEach(([size, label]) => { if (n >= size) { out += `${hundreds(Math.floor(n / size))} ${label} `; n %= size; } }); return `${out}${n ? hundreds(n) : ""}`.trim(); };
  const value = Number(amount), pesos = Math.floor(value), centavos = Math.round((value - pesos) * 100);
  return `${convert(pesos)} PESOS${centavos ? ` AND ${String(centavos).padStart(2, "0")}/100` : " ONLY"}`;
}

function checkMarkup(check) {
  const date = check.check_date ? `${check.check_date.slice(5, 7)}  ${check.check_date.slice(8, 10)}  ${check.check_date.slice(0, 4)}` : "";
  const amount = Number(check.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `<section class="check"><div class="date">${date}</div><div class="payee">${escapeHtml(check.payee)}</div><div class="amount">₱ ${amount}</div><div class="words">${escapeHtml(check.amount_in_words || numberToWords(check.amount))}</div><div class="memo">${escapeHtml(check.memo || "")}</div></section>`;
}

export function printChecks(checks, targetWindow) {
  const win = targetWindow || window.open("", "_blank", "width=950,height=650");
  if (!win) throw new Error("Please allow pop-ups to print checks.");
  win.document.write(`<html><head><title>Check Print</title><style>*{box-sizing:border-box}body{margin:0;font-family:'Courier New',monospace}.check{width:8.5in;height:3.5in;position:relative;page-break-after:always}.date{position:absolute;top:.58in;right:.64in;font-size:17px;letter-spacing:6.75px}.payee{position:absolute;top:1.02in;left:1.55in;right:2.15in;font-size:17px;font-weight:bold;white-space:nowrap;overflow:hidden}.amount{position:absolute;top:.98in;right:.42in;font-size:18px;font-weight:bold}.words{position:absolute;top:1.38in;left:.55in;right:.45in;font-size:14px;font-weight:bold}.memo{position:absolute;bottom:.48in;left:.55in;max-width:4.5in;font-size:13px}@page{size:8.5in 3.5in;margin:0}@media print{.check:last-child{page-break-after:auto}}</style></head><body>${checks.map(checkMarkup).join("")}</body></html>`);
  win.document.close(); win.focus(); setTimeout(() => win.print(), 250);
  return win;
}