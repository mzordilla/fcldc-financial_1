import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CreditCard, Loader2, CheckCircle2 } from "lucide-react";

const today = format(new Date(), "yyyy-MM-dd");
const fmt = (n) => (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 });

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "check", label: "Check" },
  { value: "cash", label: "Cash" },
  { value: "credit_card", label: "Credit Card" },
  { value: "other", label: "Other" },
];

const defaultLine = () => ({
  payable_id: "",
  supplier_name: "",
  project_name: "",
  chart_of_account: "",
  amount: "",
  notes: "",
});

export default function BillsPaymentSheet({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const [header, setHeader] = useState({
    payment_date: today,
    payment_method: "bank_transfer",
    bank_account_id: "",
    check_number: "",
    reference: "",
    notes: "",
  });

  const [lines, setLines] = useState([defaultLine()]);

  const { data: payables = [] } = useQuery({
    queryKey: ["payables"],
    queryFn: () => base44.entities.Payable.list("-due_date", 200),
    enabled: open,
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankaccounts"],
    queryFn: () => base44.entities.BankAccount.list("-created_date", 100),
    enabled: open,
  });

  const { data: payees = [] } = useQuery({
    queryKey: ["payees"],
    queryFn: () => base44.entities.Payee.list("name", 200),
    enabled: open,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("project_name", 200),
    enabled: open,
  });

  const { data: chartOfAccounts = [] } = useQuery({
    queryKey: ["chartofaccounts"],
    queryFn: () => base44.entities.ChartOfAccount.filter({ is_active: true }, "account_name", 200),
    enabled: open,
  });

  useEffect(() => {
    if (open) {
      setHeader({ payment_date: today, payment_method: "bank_transfer", bank_account_id: "", check_number: "", reference: "", notes: "" });
      setLines([defaultLine()]);
      setDone(false);
    }
  }, [open]);

  const unpaidPayables = payables.filter(p => p.status !== "paid");
  const expenseAccounts = chartOfAccounts.filter(a => a.account_type === "expense");

  const totalPayment = lines.reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);

  const addLine = () => setLines(prev => [...prev, defaultLine()]);
  const removeLine = (i) => setLines(prev => prev.filter((_, idx) => idx !== i));
  const updateLine = (i, field, val) => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: val } : l));

  const handlePayableSelect = (i, payableId) => {
    if (payableId === "manual") {
      setLines(prev => prev.map((l, idx) => idx === i ? { ...l, payable_id: "manual", supplier_name: "", project_name: "", amount: "", chart_of_account: "" } : l));
      return;
    }
    const p = payables.find(x => x.id === payableId);
    if (p) {
      const remaining = (p.amount || 0) - (p.amount_paid || 0);
      setLines(prev => prev.map((l, idx) => idx === i ? {
        ...l,
        payable_id: payableId,
        supplier_name: p.supplier_name || "",
        project_name: p.project_name || "",
        amount: String(remaining > 0 ? remaining : ""),
        chart_of_account: l.chart_of_account || "",
      } : l));
    }
  };

  const canSave = lines.some(l => (l.payable_id || l.supplier_name) && parseFloat(l.amount) > 0);

  const handleSubmit = async () => {
    setSaving(true);
    const validLines = lines.filter(l => (l.payable_id || l.supplier_name) && parseFloat(l.amount) > 0);

    await Promise.all(validLines.map(async (line) => {
      const paid = parseFloat(line.amount);
      const refStr = header.reference || (header.check_number ? `Check #${header.check_number}` : "");
      const historyEntry = {
        payment_date: header.payment_date,
        amount: paid,
        payment_method: header.payment_method,
        bank_account_id: header.bank_account_id || null,
        reference: refStr,
        notes: line.notes || header.notes,
      };

      // Update linked payable (if not manual)
      if (line.payable_id && line.payable_id !== "manual") {
        const p = payables.find(x => x.id === line.payable_id);
        if (p) {
          const newAmountPaid = (p.amount_paid || 0) + paid;
          const isFullyPaid = newAmountPaid >= (p.amount || 0);
          await base44.entities.Payable.update(p.id, {
            amount_paid: newAmountPaid,
            status: isFullyPaid ? "paid" : "partially_paid",
            payment_history: [...(p.payment_history || []), historyEntry],
            payment_date: header.payment_date,
            payment_method: header.payment_method,
            payment_reference: refStr,
          });
        }
      }

      const p = line.payable_id && line.payable_id !== "manual" ? payables.find(x => x.id === line.payable_id) : null;
      const supplierName = line.supplier_name || p?.supplier_name || "";
      const projectName = line.project_name || p?.project_name || "";

      // Record expense transaction if bank account selected
      if (header.bank_account_id && header.bank_account_id !== "none") {
        await base44.entities.Transaction.create({
          description: `Bill payment – ${supplierName}${p?.invoice_number ? ` (${p.invoice_number})` : ""}`,
          amount: paid,
          type: "expense",
          category: "other",
          chart_of_account: line.chart_of_account || "",
          project_name: projectName,
          bank_account_id: header.bank_account_id,
          date: header.payment_date,
          status: "completed",
        });
      }
    }));

    queryClient.invalidateQueries({ queryKey: ["payables"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    setSaving(false);
    setDone(true);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-5 border-b border-border">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <CreditCard className="w-5 h-5 text-primary" />
            Bills Payment
          </SheetTitle>
          <SheetDescription>
            Record one payment covering multiple bills / projects at once.
          </SheetDescription>
        </SheetHeader>

        {done ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-4 p-10 text-center">
            <CheckCircle2 className="w-16 h-16 text-primary" />
            <h2 className="text-xl font-bold">Payment Recorded</h2>
            <p className="text-muted-foreground text-sm">
              ₱{fmt(totalPayment)} applied across {lines.filter(l => (l.payable_id || l.supplier_name) && parseFloat(l.amount) > 0).length} bill(s).
            </p>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">

            {/* Payment Header */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Payment Details</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Payment Date</Label>
                  <Input type="date" value={header.payment_date} onChange={e => setHeader(h => ({ ...h, payment_date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Payment Method</Label>
                  <Select value={header.payment_method} onValueChange={v => setHeader(h => ({ ...h, payment_method: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 col-span-2">
                  <Label>Bank Account <span className="text-muted-foreground font-normal">(for expense transaction)</span></Label>
                  <Select value={header.bank_account_id} onValueChange={v => setHeader(h => ({ ...h, bank_account_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select bank account (optional)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None / Cash —</SelectItem>
                      {bankAccounts.filter(a => a.status !== "closed").map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.account_name} – {a.bank_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {header.payment_method === "check" && (
                  <div className="space-y-1.5">
                    <Label>Check Number</Label>
                    <Input value={header.check_number} onChange={e => setHeader(h => ({ ...h, check_number: e.target.value }))} placeholder="e.g. CHK-001234" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label>Reference # <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input value={header.reference} onChange={e => setHeader(h => ({ ...h, reference: e.target.value }))} placeholder="e.g. TRF-2026-001" />
                </div>
                <div className={`space-y-1.5 ${header.payment_method === "check" ? "" : "col-span-2"}`}>
                  <Label>General Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input value={header.notes} onChange={e => setHeader(h => ({ ...h, notes: e.target.value }))} placeholder="Applied to multiple projects..." />
                </div>
              </div>
            </div>

            {/* Bill Lines */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Bills to Pay</p>
              <div className="space-y-3">
                {lines.map((line, i) => {
                  const payable = payables.find(x => x.id === line.payable_id);
                  const remaining = payable ? (payable.amount || 0) - (payable.amount_paid || 0) : 0;
                  const isLinked = !!payable;

                  return (
                    <div key={i} className="border border-border rounded-xl p-4 space-y-3 bg-card">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">Line {i + 1}</span>
                        {lines.length > 1 && (
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeLine(i)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>

                      {/* Link to existing payable */}
                      <div className="space-y-1.5">
                        <Label>Select Bill / Payable</Label>
                        <Select value={line.payable_id} onValueChange={v => handlePayableSelect(i, v)}>
                          <SelectTrigger><SelectValue placeholder="Choose a payable or manual entry..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">— Manual Entry —</SelectItem>
                            {unpaidPayables.map(p => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.supplier_name}{p.project_name ? ` · ${p.project_name}` : ""} — ₱{((p.amount || 0) - (p.amount_paid || 0)).toLocaleString()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Supplier (Payee masterlist) & Project */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Supplier</Label>
                          {isLinked ? (
                            <Input value={line.supplier_name} readOnly className="bg-muted/40 cursor-default" />
                          ) : (
                            <Select value={line.supplier_name} onValueChange={v => updateLine(i, "supplier_name", v)}>
                              <SelectTrigger><SelectValue placeholder="Select supplier..." /></SelectTrigger>
                              <SelectContent>
                                {payees.map(py => (
                                  <SelectItem key={py.id} value={py.name}>{py.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <Label>Project</Label>
                          {isLinked ? (
                            <Input value={line.project_name} readOnly className="bg-muted/40 cursor-default" />
                          ) : (
                            <Select value={line.project_name} onValueChange={v => updateLine(i, "project_name", v)}>
                              <SelectTrigger><SelectValue placeholder="Select project..." /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">— None —</SelectItem>
                                {projects.map(pr => (
                                  <SelectItem key={pr.id} value={pr.project_name}>{pr.project_name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>

                      {/* Chart of Accounts */}
                      <div className="space-y-1.5">
                        <Label>Chart of Account</Label>
                        <Select value={line.chart_of_account} onValueChange={v => updateLine(i, "chart_of_account", v)}>
                          <SelectTrigger><SelectValue placeholder="Select account..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">— None —</SelectItem>
                            {expenseAccounts.map(a => (
                              <SelectItem key={a.id} value={a.account_name}>
                                {a.account_code ? `${a.account_code} – ` : ""}{a.account_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {payable && (
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-3 px-1">
                          {payable.invoice_number && <span>Invoice: {payable.invoice_number}</span>}
                          <span>Balance: <span className="font-semibold text-foreground">₱{fmt(remaining)}</span></span>
                          {payable.due_date && (
                            <Badge variant="outline" className="text-xs">
                              Due {format(new Date(payable.due_date), "MMM d, yyyy")}
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Amount to Pay (₱)</Label>
                          <Input
                            type="number"
                            value={line.amount}
                            onChange={e => updateLine(i, "amount", e.target.value)}
                            placeholder="0.00"
                            max={remaining || undefined}
                          />
                          {payable && <p className="text-xs text-muted-foreground">Max: ₱{fmt(remaining)}</p>}
                        </div>
                        <div className="space-y-1.5">
                          <Label>Line Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
                          <Input value={line.notes} onChange={e => updateLine(i, "notes", e.target.value)} placeholder="e.g. partial payment" />
                        </div>
                      </div>
                    </div>
                  );
                })}

                <Button variant="outline" size="sm" className="w-full" onClick={addLine}>
                  <Plus className="w-4 h-4 mr-2" /> Add Another Bill
                </Button>
              </div>
            </div>

            {/* Total */}
            {totalPayment > 0 && (
              <div className="bg-muted/40 rounded-xl px-5 py-4 flex justify-between items-center">
                <span className="text-sm font-semibold text-muted-foreground">Total Payment</span>
                <span className="text-xl font-bold text-foreground">₱{fmt(totalPayment)}</span>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end gap-3 pt-2 pb-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving || !canSave}>
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Confirm Payment"}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}