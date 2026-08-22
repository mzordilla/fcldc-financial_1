import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculatePurchaseOrderVat } from "@/lib/purchaseOrderVat";

const money = (value) => `₱${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function POVatBreakdown({ baseAmount, treatment, onTreatmentChange, hasLineItems, manualAmount, onManualAmountChange }) {
  const breakdown = calculatePurchaseOrderVat(baseAmount, treatment);

  return (
    <div className="space-y-2 md:col-span-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-slate-700">VAT Treatment</Label>
          <Select value={treatment} onValueChange={onTreatmentChange}>
            <SelectTrigger className="h-9 rounded-sm border-slate-300 bg-white shadow-none"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="vat_inclusive">VAT Inclusive</SelectItem>
              <SelectItem value="vat_exclusive">VAT Exclusive</SelectItem>
              <SelectItem value="non_vat">Non-VAT</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {!hasLineItems && <div className="space-y-1.5"><Label className="text-xs font-semibold text-slate-700">Entered Amount</Label><Input required type="number" step="0.01" min="0" value={manualAmount} onChange={onManualAmountChange} className="h-9 rounded-sm border-slate-300 shadow-none" /></div>}
      </div>
      <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-sm border border-slate-300 bg-slate-50 text-xs">
        <div className="p-2"><p className="text-slate-500">Subtotal</p><p className="font-semibold">{money(breakdown.subtotal)}</p></div>
        <div className="p-2"><p className="text-slate-500">VAT (12%)</p><p className="font-semibold">{money(breakdown.vatAmount)}</p></div>
        <div className="p-2"><p className="text-slate-500">Grand Total</p><p className="font-bold text-primary">{money(breakdown.total)}</p></div>
      </div>
    </div>
  );
}