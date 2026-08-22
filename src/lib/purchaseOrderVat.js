export const VAT_RATE = 12;

export function calculatePurchaseOrderVat(baseAmount, treatment = "non_vat") {
  const enteredAmount = Number(baseAmount) || 0;

  if (treatment === "vat_inclusive") {
    const subtotal = enteredAmount / (1 + VAT_RATE / 100);
    return { subtotal, vatAmount: enteredAmount - subtotal, total: enteredAmount };
  }

  if (treatment === "vat_exclusive") {
    const vatAmount = enteredAmount * (VAT_RATE / 100);
    return { subtotal: enteredAmount, vatAmount, total: enteredAmount + vatAmount };
  }

  return { subtotal: enteredAmount, vatAmount: 0, total: enteredAmount };
}

export function vatTreatmentLabel(treatment) {
  return {
    vat_inclusive: "VAT Inclusive",
    vat_exclusive: "VAT Exclusive",
    non_vat: "Non-VAT",
  }[treatment] || "Non-VAT";
}