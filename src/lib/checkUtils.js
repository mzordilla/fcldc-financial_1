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
  const date = check.check_date ? new Date(`${check.check_date}T00:00:00`).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : "";
  const amount = Number(check.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `<section class="check"><div class="bank"><b>${escapeHtml(check.bank_name)}</b><small>${escapeHtml(check.account_name)}</small><small>Acct No: ${escapeHtml(check.account_number)}</small></div><div class="meta"><span>Check No. <b>${escapeHtml(check.check_number)}</b></span><span>Date <b>${date}</b></span></div><div class="pay"><label>PAY TO THE ORDER OF</label><strong>${escapeHtml(check.payee)}</strong><b class="amount">₱ ${amount}</b></div><div class="words">${escapeHtml(check.amount_in_words || numberToWords(check.amount))}</div><div class="memo">FOR: ${escapeHtml(check.memo || "—")}</div><div class="signature">Authorized Signature</div><div class="micr">⑆ ${escapeHtml(check.account_number || "").replace(/./g, "●")} ⑆ <span>⑈ ${escapeHtml(check.check_number)} ⑈</span></div></section>`;
}

export function printChecks(checks, targetWindow) {
  const win = targetWindow || window.open("", "_blank", "width=950,height=650");
  if (!win) throw new Error("Please allow pop-ups to print checks.");
  win.document.write(`<html><head><title>Check Print</title><style>*{box-sizing:border-box}body{margin:0;font-family:'Courier New',monospace}.check{width:8.5in;height:3.5in;position:relative;page-break-after:always;padding:.2in .3in}.bank{position:absolute;top:.2in;left:.3in;display:flex;flex-direction:column}.bank small{font-size:9px}.meta{position:absolute;top:.2in;right:.3in;display:flex;flex-direction:column;gap:8px;text-align:right;font-size:10px}.meta b{border-bottom:1px solid;padding:0 12px}.pay{position:absolute;top:1.3in;left:.3in;right:.3in;display:flex;align-items:end;gap:10px}.pay label{font-size:9px;white-space:nowrap}.pay strong{flex:1;border-bottom:1px solid;padding:4px 8px}.amount{border:2px solid;padding:6px 12px;font-size:16px}.words{position:absolute;top:1.78in;left:.3in;right:.3in;border-bottom:1px solid #aaa;padding-bottom:5px;font-size:10px}.memo{position:absolute;bottom:.35in;left:.3in;font-size:9px;max-width:4.5in}.signature{position:absolute;bottom:.35in;right:.3in;width:2.2in;border-top:1px solid;text-align:right;padding-top:4px;font-size:9px}.micr{position:absolute;bottom:.05in;left:.3in;right:.3in;border-top:1px dashed #aaa;padding-top:3px;font-size:9px;letter-spacing:2px}.micr span{float:right}@page{size:8.5in 3.5in;margin:0}@media print{.check:last-child{page-break-after:auto}}</style></head><body>${checks.map(checkMarkup).join("")}</body></html>`);
  win.document.close(); win.focus(); setTimeout(() => win.print(), 250);
  return win;
}