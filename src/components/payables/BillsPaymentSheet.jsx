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
      const projectName = line.project_name !== "none" ? (line.project_name || p?.project_name || "") : "";

      if (header.bank_account_id && header.bank_account_id !== "none") {
        await base44.entities.Transaction.create({
          description: `Bill payment – ${supplierName}${p?.invoice_number ? ` (${p.invoice_number})` : ""}`,
          amount: paid,
          type: "expense",
          category: "other",
          chart_of_account: line.chart_of_account !== "none" ? (line.chart_of_account || "") : "",
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
      {/* Full-width sheet via custom class override */}
      <SheetContent
        side="right"
        className="!w-screen !max-w-[95vw] overflow-y-auto flex flex-col gap-0 p-0"
        style={{ width: "95vw", maxWidth: "95vw" }}
      >
        <SheetHeader className="px-8 py-5 border-b border-border bg-card">
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
          <div className="flex-1 overflow-y-auto p-8 space-y-8">

            {/* Payment Header */}
            <div className="bg-card border border-border rounded-xl p-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">Payment Details</p>
              <div className="grid grid-cols-4 gap-4">
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
                <div className="space-y-1.5">
                  <Label>Bank Account</Label>
                  <Select value={header.bank_account_id} onValueChange={v => setHeader(h => ({ ...h, bank_account_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select bank account..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— None / Cash —</SelectItem>
                      {bankAccounts.filter(a => a.status !== "closed").map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.account_name} – {a.bank_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {header.payment_method === "check" ? (
                  <div className="space-y-1.5">
                    <Label>Check Number</Label>
                    <Input value={header.check_number} onChange={e => setHeader(h => ({ ...h, check_number: e.target.value }))} placeholder="CHK-001234" />
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label>Reference #</Label>
                    <Input value={header.reference} onChange={e => setHeader(h => ({ ...h, reference: e.target.value }))} placeholder="TRF-2026-001" />
                  </div>
                )}
                {header.payment_method === "check" && (
                  <div className="space-y-1.5">
                    <Label>Reference #</Label>
                    <Input value={header.reference} onChange={e => setHeader(h => ({ ...h, reference: e.target.value }))} placeholder="TRF-2026-001" />
                  </div>
                )}
                <div className="space-y-1.5 col-span-2">
                  <Label>General Notes</Label>
                  <Input value={header.notes} onChange={e => setHeader(h => ({ ...h, notes: e.target.value }))} placeholder="Applied to multiple projects..." />
                </div>
              </div>
            </div>

            {/* Bills Table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bills to Pay</p>
                <Button variant="outline" size="sm" onClick={addLine}>
                  <Plus className="w-4 h-4 mr-1.5" /> Add Line
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-6">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide min-w-[180px]">Payable / Bill</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide min-w-[160px]">Supplier</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide min-w-[160px]">Project</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide min-w-[180px]">Chart of Account</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide min-w-[140px]">Amount (₱)</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide min-w-[140px]">Notes</th>
                      <th className="px-4 py-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {lines.map((line, i) => {
                      const payable = payables.find(x => x.id === line.payable_id);
                      const remaining = payable ? (payable.amount || 0) - (payable.amount_paid || 0) : 0;
                      const isLinked = !!payable;

                      return (
                        <tr key={i} className="hover:bg-muted/20 transition-colors">
                          {/* Row number */}
                          <td className="px-4 py-3 text-muted-foreground text-xs font-medium">{i + 1}</td>

                          {/* Payable selector */}
                          <td className="px-4 py-3">
                            <Select value={line.payable_id} onValueChange={v => handlePayableSelect(i, v)}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Choose bill..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="manual">— Manual Entry —</SelectItem>
                                {unpaidPayables.map(p => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.supplier_name}{p.invoice_number ? ` (${p.invoice_number})` : ""} — ₱{((p.amount || 0) - (p.amount_paid || 0)).toLocaleString()}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {payable && (
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {payable.invoice_number && <Badge variant="outline" className="text-xs py-0">{payable.invoice_number}</Badge>}
                                {payable.due_date && <Badge variant="outline" className="text-xs py-0">Due {format(new Date(payable.due_date), "MMM d")}</Badge>}
                                <span className="text-xs text-muted-foreground">Bal: ₱{fmt(remaining)}</span>
                              </div>
                            )}
                          </td>

                          {/* Supplier */}
                          <td className="px-4 py-3">
                            {isLinked ? (
                              <Input value={line.supplier_name} readOnly className="h-8 text-xs bg-muted/40 cursor-default" />
                            ) : (
                              <Select value={line.supplier_name} onValueChange={v => updateLine(i, "supplier_name", v)}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Select supplier..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {payees.map(py => (
                                    <SelectItem key={py.id} value={py.name}>{py.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </td>

                          {/* Project */}
                          <td className="px-4 py-3">
                            {isLinked ? (
                              <Input value={line.project_name} readOnly className="h-8 text-xs bg-muted/40 cursor-default" />
                            ) : (
                              <Select value={line.project_name} onValueChange={v => updateLine(i, "project_name", v)}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue placeholder="Select project..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">— None —</SelectItem>
                                  {projects.map(pr => (
                                    <SelectItem key={pr.id} value={pr.project_name}>{pr.project_name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          </td>

                          {/* Chart of Account */}
                          <td className="px-4 py-3">
                            <Select value={line.chart_of_account} onValueChange={v => updateLine(i, "chart_of_account", v)}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="Select account..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">— None —</SelectItem>
                                {expenseAccounts.map(a => (
                                  <SelectItem key={a.id} value={a.account_name}>
                                    {a.account_code ? `${a.account_code} – ` : ""}{a.account_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>

                          {/* Amount */}
                          <td className="px-4 py-3">
                            <Input
                              type="number"
                              value={line.amount}
                              onChange={e => updateLine(i, "amount", e.target.value)}
                              placeholder="0.00"
                              className="h-8 text-xs text-right"
                              max={remaining || undefined}
                            />
                          </td>

                          {/* Notes */}
                          <td className="px-4 py-3">
                            <Input
                              value={line.notes}
                              onChange={e => updateLine(i, "notes", e.target.value)}
                              placeholder="e.g. partial payment"
                              className="h-8 text-xs"
                            />
                          </td>

                          {/* Remove */}
                          <td className="px-4 py-3 text-center">
                            {lines.length > 1 && (
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => removeLine(i)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Table footer — total */}
              <div className="border-t border-border bg-muted/30 px-6 py-4 flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={addLine}>
                  <Plus className="w-4 h-4 mr-1.5" /> Add Another Bill
                </Button>
                <div className="flex items-center gap-6">
                  <span className="text-sm font-semibold text-muted-foreground">Total Payment</span>
                  <span className="text-2xl font-bold text-foreground">₱{fmt(totalPayment)}</span>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3 pb-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={saving || !canSave} className="px-8">
                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Confirm Payment"}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}