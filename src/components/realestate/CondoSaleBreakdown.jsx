const fmt = (amount) => `₱${Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CondoSaleBreakdown({ totalPrice, breakdown }) {
  const basePrice = breakdown?.base ?? Number(totalPrice || 0) / 1.19;
  const closingFees = breakdown?.closing ?? basePrice * 0.07;
  const vat = breakdown?.vat ?? basePrice * 0.12;

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3">
      <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Sale Price Breakdown</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div><p className="text-xs text-muted-foreground">Base Selling Price</p><p className="font-semibold">{fmt(basePrice)}</p></div>
        <div><p className="text-xs text-muted-foreground">Closing Fees (7%)</p><p className="font-semibold">{fmt(closingFees)}</p></div>
        <div><p className="text-xs text-muted-foreground">VAT (12%)</p><p className="font-semibold">{fmt(vat)}</p></div>
        <div><p className="text-xs text-muted-foreground">Total Sale Price</p><p className="font-bold text-primary">{fmt(breakdown?.total ?? totalPrice)}</p></div>
      </div>
    </div>
  );
}