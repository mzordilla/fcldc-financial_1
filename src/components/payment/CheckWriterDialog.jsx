import { useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { format } from "date-fns";

// Convert number to words for the amount line
function numberToWords(amount) {
  if (!amount || isNaN(amount)) return "ZERO PESOS";
  const ones = ["", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE",
    "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"];
  const tens = ["", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"];

  function convertHundreds(n) {
    let result = "";
    if (n >= 100) { result += ones[Math.floor(n / 100)] + " HUNDRED "; n %= 100; }
    if (n >= 20) { result += tens[Math.floor(n / 10)] + " "; n %= 10; }
    if (n > 0) result += ones[n] + " ";
    return result.trim();
  }

  function convert(n) {
    if (n === 0) return "ZERO";
    let result = "";
    if (n >= 1000000000) { result += convertHundreds(Math.floor(n / 1000000000)) + " BILLION "; n %= 1000000000; }
    if (n >= 1000000) { result += convertHundreds(Math.floor(n / 1000000)) + " MILLION "; n %= 1000000; }
    if (n >= 1000) { result += convertHundreds(Math.floor(n / 1000)) + " THOUSAND "; n %= 1000; }
    if (n > 0) result += convertHundreds(n);
    return result.trim();
  }

  const pesos = Math.floor(amount);
  const centavos = Math.round((amount - pesos) * 100);
  let words = convert(pesos) + " PESOS";
  if (centavos > 0) words += ` AND ${centavos}/100`;
  else words += " ONLY";
  return words;
}

export default function CheckWriterDialog({ open, onOpenChange, paymentRequest, bankAccount, paymentDate, paymentReference }) {
  const checkRef = useRef();

  if (!paymentRequest) return null;

  const wht = paymentRequest.withholding_tax_amount || 0;
  const vat = paymentRequest.vat_amount || 0;
  const netAmount = (paymentRequest.amount || 0) - wht + vat;
  const checkDate = paymentDate || new Date().toISOString().split("T")[0];
  const bankName = bankAccount ? `${bankAccount.account_name} — ${bankAccount.bank_name}` : "— Select Bank Account —";
  const checkNumber = paymentReference || "CHK-______";

  const handlePrint = () => {
    const printContents = checkRef.current.innerHTML;
    const win = window.open("", "_blank", "width=900,height=500");
    win.document.write(`
      <html>
        <head>
          <title>Check — ${paymentRequest.payee}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', monospace; background: #fff; }
            .check-body { width: 8.5in; height: 3.5in; position: relative; }
            @page { size: 8.5in 3.5in; margin: 0; }
          </style>
        </head>
        <body>
          <div class="check-body">${printContents}</div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="w-4 h-4" /> Check Writer
          </DialogTitle>
        </DialogHeader>

        {/* Scaled preview wrapper — the ref below stays at true check size (8.5in x 3.5in)
            so print output matches Philippine bank check dimensions exactly. */}
        <div className="overflow-x-auto flex justify-center bg-muted/30 py-4 rounded-lg">
          <div
            ref={checkRef}
            className="border-2 border-border bg-white font-mono text-foreground relative shadow-inner"
            style={{ width: "8.5in", height: "3.5in", fontSize: "10px" }}
          >
            {/* Drawn from / bank info — top left */}
            <div style={{ position: "absolute", top: "0.2in", left: "0.3in" }}>
              <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Drawn From</p>
              <p className="font-bold text-foreground text-sm leading-tight">{bankAccount?.bank_name || "________________"}</p>
              <p className="text-[9px] text-muted-foreground">{bankAccount?.account_name || ""}</p>
              {bankAccount?.account_number && (
                <p className="text-[9px] text-muted-foreground">Acct No: {bankAccount.account_number}</p>
              )}
            </div>

            {/* Check No. and Date — top right */}
            <div style={{ position: "absolute", top: "0.2in", right: "0.3in" }} className="text-right space-y-1">
              <div className="flex items-center justify-end gap-2">
                <span className="text-[9px] text-muted-foreground">Check No.</span>
                <span className="border-b border-foreground px-3 font-bold tracking-wider">{checkNumber}</span>
              </div>
              <div className="flex items-center justify-end gap-2">
                <span className="text-[9px] text-muted-foreground">Date</span>
                <span className="border-b border-foreground px-3">{checkDate ? format(new Date(checkDate), "MM-dd-yyyy") : "__-__-____"}</span>
              </div>
            </div>

            {/* Pay to the order of — with amount box on the same line */}
            <div style={{ position: "absolute", top: "1.3in", left: "0.3in", right: "0.3in" }} className="flex items-end gap-2">
              <span className="text-[9px] text-muted-foreground whitespace-nowrap">PAY TO THE ORDER OF</span>
              <span className="flex-1 border-b border-foreground font-bold text-foreground px-2 pb-0.5">{paymentRequest.payee}</span>
              <div className="border-2 border-foreground rounded px-3 py-1 font-bold text-base whitespace-nowrap">
                ₱ {netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </div>
            </div>

            {/* Amount in words */}
            <div style={{ position: "absolute", top: "1.75in", left: "0.3in", right: "0.3in" }} className="border-b border-foreground/30 pb-1">
              <span className="text-[9px] uppercase tracking-wide">{numberToWords(netAmount)}</span>
            </div>

            {/* Memo / breakdown — bottom left */}
            <div style={{ position: "absolute", bottom: "0.25in", left: "0.3in" }} className="text-[9px] text-muted-foreground space-y-0.5">
              <div className="flex gap-2">
                <span className="text-muted-foreground">FOR:</span>
                <span className="text-foreground">{paymentRequest.description || "—"}</span>
              </div>
              {paymentRequest.invoice_number && (
                <div className="flex gap-2">
                  <span className="text-muted-foreground">Invoice:</span>
                  <span className="text-foreground">{paymentRequest.invoice_number}</span>
                </div>
              )}
              {wht > 0 && (
                <div className="flex gap-2 text-destructive">
                  <span>Gross: ₱{(paymentRequest.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  <span>WHT ({paymentRequest.withholding_tax_percentage}%): -₱{wht.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {vat > 0 && (
                <div className="flex gap-2 text-blue-600">
                  <span>VAT ({paymentRequest.vat_percentage}%): +₱{vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
            </div>

            {/* Signature line — bottom right */}
            <div style={{ position: "absolute", bottom: "0.25in", right: "0.3in", width: "2.2in" }} className="text-right border-t border-foreground pt-1">
              <p className="text-[9px] text-muted-foreground">Authorized Signature</p>
            </div>

            {/* MICR-style bottom bar */}
            <div style={{ position: "absolute", bottom: "0.02in", left: "0.3in", right: "0.3in" }} className="border-t border-dashed border-muted-foreground/30 pt-1 flex justify-between text-[9px] text-muted-foreground tracking-widest font-mono">
              <span>⑆ {bankAccount?.account_number ? bankAccount.account_number.replace(/./g, "●") : "●●●●●●●●●●"} ⑆</span>
              <span>⑈ {checkNumber} ⑈</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-1" /> Close
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-1" /> Print Check
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}