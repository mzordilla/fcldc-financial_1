export const calculateCondoSaleBreakdown = (units = []) => units.reduce((totals, unit) => {
  const finalPrice = Number(unit.selling_price || 0);
  const vatRate = Number(unit.vat_percentage || 12);
  const closingRate = Number(unit.closing_fees_percentage || 8);

  totals.base += finalPrice;
  totals.vat += finalPrice * vatRate / 100;
  totals.closing += finalPrice * closingRate / 100;
  totals.total += finalPrice * (1 + (vatRate + closingRate) / 100);
  return totals;
}, { base: 0, vat: 0, closing: 0, total: 0 });