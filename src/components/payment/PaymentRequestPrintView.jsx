import { format } from "date-fns";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const categoryLabels = {
  supplier_invoice: "Supplier Invoice",
  material_cost: "Material Cost",
  subcontractor: "Subcontractor",
  labor: "Labor",
  equipment: "Equipment",
  expense_reimbursement: "Expense Reimbursement",
  utilities: "Utilities",
  other: "Other",
};

export default function PaymentRequestPrintView({ open, onOpenChange, data }) {
  if (!open || !data) return null;

  const allocations = (data.allocations || []).filter(a => a.project_name);
  const netAmount = (data.totalAmount || 0) - (data.withholdingTaxAmount || 0) + (data.vatAmount || 0);

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 overflow-y-auto">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #pr-print-content, #pr-print-content * { visibility: visible; }
          #pr-print-content { position: absolute; left: 0; top: 0; width: 210mm; }
          @page { size: A4; margin: 15mm; }
        }
      `}</style>

      <div className="print:hidden sticky top-0 z-10 bg-background border-b border-border flex items-center justify-end gap-2 px-4 py-3">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" /> Print
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
          <X className="w-4 h-4 mr-2" /> Close
        </Button>
      </div>

      <div className="flex justify-center py-8 px-4">
        <div id="pr-print-content" className="w-[210mm] min-h-[297mm] bg-white text-black p-[15mm] shadow-lg">
          {/* Company Header */}
          <div className="mb-6">
            <h2 className="text-xl font-bold tracking-tight">Your Company Name</h2>
            <p className="text-xs text-gray-600 mt-0.5">123 Business Street, City, Country</p>
            <p className="text-xs text-gray-600">Phone: (000) 000-0000 · Email: info@company.com</p>
          </div>

          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">PAYMENT REQUEST</h1>
              <p className="text-sm text-gray-600 mt-1">Request for disbursement authorization</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold">Request #: {data.request_number || "—"}</p>
              <p className="text-gray-600">Date: {format(new Date(), "MMM d, yyyy")}</p>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p className="text-gray-500 font-semibold uppercase text-xs">Payee</p>
              <p className="font-medium">{data.payee || "—"}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-xs">Category</p>
              <p className="font-medium">{categoryLabels[data.category] || data.category || "—"}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-xs">Payment Method</p>
              <p className="font-medium capitalize">{(data.payment_method || "—").replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-xs">Requested By</p>
              <p className="font-medium">{data.requested_by || "—"}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-xs">Invoice / Ref #</p>
              <p className="font-medium">{data.invoice_number || "—"}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-xs">Invoice Date</p>
              <p className="font-medium">{data.invoice_date ? format(new Date(data.invoice_date), "MMM d, yyyy") : "—"}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-xs">Payment Due Date</p>
              <p className="font-medium">{data.due_date ? format(new Date(data.due_date), "MMM d, yyyy") : "—"}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-xs">Supporting Docs</p>
              <p className="font-medium">{data.supporting_docs || "—"}</p>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <p className="text-gray-500 font-semibold uppercase text-xs mb-1">Description / Reason</p>
            <p className="text-sm">{data.description || "—"}</p>
          </div>

          {/* Project allocations */}
          <table className="w-full text-sm border-collapse mb-6">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-2">#</th>
                <th className="text-left py-2">Project</th>
                <th className="text-left py-2">Category</th>
                <th className="text-right py-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {allocations.length > 0 ? (
                allocations.map((a, idx) => (
                  <tr key={idx} className="border-b border-gray-300">
                    <td className="py-2">{idx + 1}</td>
                    <td className="py-2">{a.project_name}</td>
                    <td className="py-2">{a.category || "—"}</td>
                    <td className="py-2 text-right">₱{(parseFloat(a.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-2 text-gray-500">No project allocations</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-64 text-sm space-y-1.5">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-medium">₱{(data.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
              {data.withholdingTaxAmount > 0 && (
                <div className="flex justify-between">
                  <span>Withholding Tax ({data.withholding_tax_percentage}%):</span>
                  <span className="font-medium">-₱{data.withholdingTaxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              {data.vatAmount > 0 && (
                <div className="flex justify-between">
                  <span>VAT ({data.vat_percentage}%):</span>
                  <span className="font-medium">+₱{data.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold border-t-2 border-black pt-1.5">
                <span>Net Amount:</span>
                <span>₱{netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>

          {/* Signature lines */}
          <div className="grid grid-cols-3 gap-8 mt-16 text-sm">
            <div>
              <div className="border-t border-black pt-1">Requested By</div>
            </div>
            <div>
              <div className="border-t border-black pt-1">Approved By</div>
            </div>
            <div>
              <div className="border-t border-black pt-1">Disbursed By</div>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center mt-12">This is a computer-generated document.</p>
        </div>
      </div>
    </div>
  );
}