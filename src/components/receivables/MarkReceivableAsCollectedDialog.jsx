import { useState, useEffect } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Banknote, CheckCircle2, Upload, X, ImageIcon, FileImage } from "lucide-react";

const today = format(new Date(), "yyyy-MM-dd");

export default function MarkReceivableAsCollectedDialog({ open, onOpenChange, receivable, onConfirm }) {
  const [form, setForm] = useState({
    collection_date: today,
    amount_collected: "",
    bank_account_id: "",
    reference: "",
    notes: "",
    receipt_url: "",
    check_image_url: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingCheck, setUploadingCheck] = useState(false);

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankaccounts"],
    queryFn: () => base44.entities.BankAccount.list("-created_date", 100),
    enabled: open,
  });

  useEffect(() => {
    if (receivable) {
      const remaining = (receivable.amount || 0) - (receivable.amount_paid || 0);
      setForm({
        collection_date: today,
        amount_collected: String(remaining > 0 ? remaining : ""),
        bank_account_id: "",
        reference: "",
        notes: "",
        receipt_url: "",
        check_image_url: "",
      });
    }
  }, [receivable]);

  if (!receivable) return null;

  const totalAmount = receivable.amount || 0;
  const alreadyPaid = receivable.amount_paid || 0;
  const remaining = totalAmount - alreadyPaid;
  const thisCollection = parseFloat(form.amount_collected) || 0;
  const newTotalPaid = alreadyPaid + thisCollection;
  const paidPct = totalAmount ? Math.min((alreadyPaid / totalAmount) * 100, 100) : 0;
  const history = receivable.payment_history || [];

  const handleReceiptUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, receipt_url: file_url }));
    setUploading(false);
  };

  const handleCheckUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCheck(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, check_image_url: file_url }));
    setUploadingCheck(false);
  };

  const handleSubmit = async () => {
    setSaving(true);

    const isUndeposited = form.bank_account_id === "undeposited";
    const newEntry = {
      collection_date: form.collection_date,
      amount: thisCollection,
      bank_account_id: isUndeposited ? null : form.bank_account_id,
      undeposited: isUndeposited,
      reference: form.reference,
      notes: form.notes,
      receipt_url: form.receipt_url,
      check_image_url: form.check_image_url,
    };

    const updatedHistory = [...history, newEntry];
    const updatedAmountPaid = alreadyPaid + thisCollection;
    const isFullyPaid = updatedAmountPaid >= totalAmount;

    await onConfirm({
      status: isFullyPaid ? "paid" : "partially_paid",
      amount_paid: updatedAmountPaid,
      payment_history: updatedHistory,
    });

    // Collection entry: DR Bank (cash in) — reduces AR balance tracked on the receivable record itself
    // No separate CR revenue entry — revenue was already recognized when the receivable was created
    if (form.bank_account_id && !isUndeposited) {
      const desc = `Collection — ${receivable.client_name}${receivable.invoice_number ? ` (${receivable.invoice_number})` : ""}${form.reference ? ` · ${form.reference}` : ""}`;
      await base44.entities.Transaction.create({
        description: desc,
        amount: thisCollection,
        type: "income",
        category: "project_payment",
        project_code: receivable.project_code || "",
        chart_of_account: "Cash and Cash Equivalents",
        bank_account_id: form.bank_account_id,
        date: form.collection_date,
        status: "completed",
      });
    }

    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record Collection</DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="space-y-2 bg-muted/40 rounded-lg px-4 py-3 text-sm">
          <p className="font-semibold text-foreground">{receivable.client_name}</p>
          {receivable.project_name && <p className="text-muted-foreground">{receivable.project_name}</p>}
          {receivable.invoice_number && <p className="text-muted-foreground">Invoice: {receivable.invoice_number}</p>}
          <div className="flex justify-between items-center mt-2">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold">₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          <Progress value={paidPct} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Collected: ₱{alreadyPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span>Remaining: ₱{remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Collection History */}
        {history.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Collection History</p>
            <div className="rounded-lg border border-border divide-y divide-border">
              {history.map((h, i) => (
                <div key={i} className="px-3 py-2 text-sm space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Banknote className="w-3.5 h-3.5 text-muted-foreground" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          {h.reference && <span className="font-medium text-xs">{h.reference}</span>}
                          {h.is_advance_payment && (
                            <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary rounded px-1.5 py-0.5 font-medium">Advance applied</span>
                          )}
                          {h.undeposited && (
                            <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 font-medium">
                              📥 Undeposited
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {h.collection_date ? format(new Date(h.collection_date), "MMM d, yyyy") : ""}
                          {h.notes ? ` · ${h.notes}` : ""}
                        </div>
                      </div>
                    </div>
                    <span className="font-semibold text-primary">₱{(h.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  {(h.receipt_url || h.check_image_url) && (
                    <div className="grid grid-cols-2 gap-2">
                      {h.receipt_url && (
                        <a href={h.receipt_url} target="_blank" rel="noopener noreferrer" className="block">
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Receipt</p>
                          <img src={h.receipt_url} alt="Receipt" className="rounded-md border border-border max-h-28 object-contain bg-muted w-full hover:opacity-80 transition-opacity" />
                        </a>
                      )}
                      {h.check_image_url && (
                        <a href={h.check_image_url} target="_blank" rel="noopener noreferrer" className="block">
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><FileImage className="w-3 h-3" /> Check</p>
                          <img src={h.check_image_url} alt="Check" className="rounded-md border border-border max-h-28 object-contain bg-muted w-full hover:opacity-80 transition-opacity" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
              <div className="flex justify-between px-3 py-2 bg-muted/30 text-sm font-semibold">
                <span>Total Collected</span>
                <span>₱{alreadyPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        )}

        {/* Fully paid state */}
        {remaining <= 0 ? (
          <>
            <div className="flex items-center gap-2 text-primary bg-primary/10 rounded-lg px-4 py-3 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              This receivable is fully collected.
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New Collection</p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Amount Collecting Now</Label>
                  <Input
                    type="number"
                    value={form.amount_collected}
                    onChange={e => setForm(f => ({ ...f, amount_collected: e.target.value }))}
                    placeholder="0.00"
                    max={remaining}
                  />
                  <p className="text-xs text-muted-foreground">Max: ₱{remaining.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Collection Date</Label>
                  <Input
                    type="date"
                    value={form.collection_date}
                    onChange={e => setForm(f => ({ ...f, collection_date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Deposit To <span className="text-muted-foreground font-normal">(bank account or undeposited)</span></Label>
                <Select value={form.bank_account_id} onValueChange={v => setForm(f => ({ ...f, bank_account_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="undeposited">
                      <span className="flex items-center gap-2">📥 Undeposited Collections</span>
                    </SelectItem>
                    {bankAccounts.filter(a => a.status !== "closed").map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.account_name} – {a.bank_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.bank_account_id === "undeposited" && (
                  <p className="text-xs text-muted-foreground">Collection will be recorded but not posted to any bank account yet.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Reference # <span className="text-muted-foreground font-normal">(OR no., transfer ref., etc.)</span></Label>
                <Input
                  value={form.reference}
                  onChange={e => setForm(f => ({ ...f, reference: e.target.value }))}
                  placeholder="e.g. OR-00123 or TRF-2026-0501"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Any additional notes..."
                />
              </div>

              {/* Receipt / Image Upload */}
              <div className="space-y-1.5">
                <Label>Receipt / Image <span className="text-muted-foreground font-normal">(optional)</span></Label>
                {form.receipt_url ? (
                  <div className="relative group rounded-lg overflow-hidden border border-border w-full">
                    <img src={form.receipt_url} alt="Receipt" className="w-full max-h-48 object-contain bg-muted" />
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, receipt_url: "" }))}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className={`flex items-center justify-center gap-2 border border-dashed border-border rounded-lg px-4 py-4 text-sm text-muted-foreground cursor-pointer hover:bg-muted/40 transition-colors ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                    {uploading ? <Upload className="w-4 h-4 animate-bounce" /> : <ImageIcon className="w-4 h-4" />}
                    {uploading ? "Uploading..." : "Click to upload receipt or image"}
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleReceiptUpload} />
                  </label>
                )}
              </div>

              {/* Check Image Upload */}
              <div className="space-y-1.5">
                <Label>Check Image <span className="text-muted-foreground font-normal">(optional)</span></Label>
                {form.check_image_url ? (
                  <div className="relative group rounded-lg overflow-hidden border border-border w-full">
                    <img src={form.check_image_url} alt="Check" className="w-full max-h-48 object-contain bg-muted" />
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, check_image_url: "" }))}
                      className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className={`flex items-center justify-center gap-2 border border-dashed border-border rounded-lg px-4 py-4 text-sm text-muted-foreground cursor-pointer hover:bg-muted/40 transition-colors ${uploadingCheck ? "opacity-50 pointer-events-none" : ""}`}>
                    {uploadingCheck ? <Upload className="w-4 h-4 animate-bounce" /> : <FileImage className="w-4 h-4" />}
                    {uploadingCheck ? "Uploading..." : "Click to upload check image"}
                    <input type="file" accept="image/*" className="hidden" onChange={handleCheckUpload} />
                  </label>
                )}
              </div>

              {/* Preview */}
              {thisCollection > 0 && (
                <div className="bg-muted/40 rounded-lg px-4 py-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">After this collection</span>
                    <span className="font-semibold">₱{newTotalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })} / ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className={`font-semibold ${newTotalPaid >= totalAmount ? "text-primary" : "text-chart-3"}`}>
                      {newTotalPaid >= totalAmount ? "Fully Collected" : "Partially Collected"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving || thisCollection <= 0}>
                {saving ? "Saving..." : "Confirm Collection"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}