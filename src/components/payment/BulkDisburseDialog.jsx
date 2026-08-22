import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Banknote, CheckCircle, Loader2, Printer } from "lucide-react";
import useCheckWriter from "@/hooks/useCheckWriter";
import { numberToWords } from "@/lib/checkUtils";

const today = new Date().toISOString().split("T")[0];

export default function BulkDisburseDialog({ open, onOpenChange, requests = [], onConfirm }) {
  const [bankAccountId, setBankAccountId] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(today);
  const [printedCheck, setPrintedCheck] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const writer = useCheckWriter();
  const requestIds = requests.map(request => request.id);
  const storedCheck = writer.checks.find(check => check.status === "printed" && requestIds.length > 0 && requestIds.every(id => check.payment_request_ids?.includes(id)) && check.payment_request_ids?.length === requestIds.length);
  const activeCheck = printedCheck || storedCheck;

  useEffect(() => {
    if (open) { setBankAccountId(""); setPaymentReference(""); setPaymentDate(today); setPrintedCheck(null); setError(""); }
  }, [open]);

  const total = requests.reduce((sum, request) => sum + ((request.amount || 0) - (request.withholding_tax_amount || 0) + (request.vat_amount || 0)), 0);

  const handlePrint = async () => {
    if (!bankAccountId || !paymentReference.trim()) return setError("Select a bank account and enter the check number first.");
    setError("");
    const printWindow = window.open("", "_blank", "width=950,height=650");
    if (!printWindow) return setError("Please allow pop-ups to print checks.");
    try {
      const check = await writer.save({
        bank_account_id: bankAccountId,
        payee: requests[0]?.payee || "",
        amount: total,
        amount_in_words: numberToWords(total),
        check_number: paymentReference.trim(),
        check_date: paymentDate,
        memo: `Combined payment for ${requests.length} approved requests`,
        source: "payment_approval",
        payment_request_ids: requestIds,
        payment_request_numbers: requests.map(request => request.request_number || request.invoice_number || request.id),
      }, true, printWindow);
      setPrintedCheck(check);
    } catch (printError) {
      printWindow?.close();
      setError(printError?.message || "Unable to save and print the check.");
    }
  };

  const handleConfirm = async () => {
    if (!activeCheck) return;
    setSaving(true);
    setError("");
    try { await onConfirm({ bankAccountId: activeCheck.bank_account_id, paymentReference: activeCheck.check_number, paymentDate: activeCheck.check_date }); }
    catch (confirmError) { setError(confirmError?.message || "Unable to complete the disbursement."); }
    finally { setSaving(false); }
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><Banknote className="w-5 h-5 text-chart-2" /> Disburse {requests.length} Requests as One Check</DialogTitle></DialogHeader>
      <div className="space-y-4">
        <div className="bg-muted/50 rounded-xl p-4 space-y-1"><p className="font-semibold">{requests[0]?.payee}</p>{requests.map(request => <div key={request.id} className="flex items-center justify-between text-sm text-muted-foreground"><span>{request.request_number || request.invoice_number || request.id.slice(-6)}</span><span>₱{((request.amount || 0) - (request.withholding_tax_amount || 0) + (request.vat_amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span></div>)}<p className="text-xl font-bold mt-1 pt-1 border-t border-border">Total: ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p></div>
        <div className="space-y-1.5"><Label>Check Date</Label><Input type="date" value={activeCheck?.check_date || paymentDate} onChange={event => setPaymentDate(event.target.value)} disabled={!!activeCheck} /></div>
        <div className="space-y-1.5"><Label>Bank Account</Label><Select value={activeCheck?.bank_account_id || bankAccountId} onValueChange={setBankAccountId} disabled={!!activeCheck}><SelectTrigger><SelectValue placeholder="Select bank account..." /></SelectTrigger><SelectContent>{writer.bankAccounts.map(account => <SelectItem key={account.id} value={account.id}>{account.account_name} – {account.bank_name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label>Check Number</Label><Input placeholder="e.g. CHK-0012345" value={activeCheck?.check_number || paymentReference} onChange={event => setPaymentReference(event.target.value)} disabled={!!activeCheck} /></div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button variant={activeCheck ? "secondary" : "outline"} className="w-full gap-2" onClick={handlePrint} disabled={!!activeCheck || writer.saving}>{activeCheck ? <CheckCircle /> : <Printer />}{activeCheck ? `Printed — Check ${activeCheck.check_number}` : writer.saving ? "Saving Check..." : "Save & Print Combined Check"}</Button>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={handleConfirm} disabled={saving || !activeCheck} className="bg-chart-2 hover:bg-chart-2/90 text-white" title={!activeCheck ? "Save and print the combined check first" : undefined}>{saving ? <Loader2 className="animate-spin" /> : <Banknote />}{saving ? "Disbursing..." : "Confirm Disbursement"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}