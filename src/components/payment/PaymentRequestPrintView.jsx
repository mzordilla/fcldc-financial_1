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

function CopyBlock({ data, allocations, netAmount, watermark }) {
  return (
    <div className="relative h-[136mm] px-[12mm] py-[6mm] overflow-hidden">
      {/* Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className="text-[54px] font-extrabold text-gray-200 rotate-[-30deg] tracking-widest select-none whitespace-nowrap">
          {watermark}
        </span>
      </div>

      <div className="relative">
        {/* Company Header */}
        <div className="mb-3">
          <h2 className="text-base font-bold tracking-tight">Your Company Name</h2>
          <p className="text-[10px] text-gray-600">123 Business Street, City, Country</p>
          <p className="text-[10px] text-gray-600">Phone: (000) 000-0000 · Email: info@company.com</p>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-black pb-2 mb-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight">PAYMENT REQUEST</h1>
            <p className="text-[10px] text-gray-600">{watermark}</p>
          </div>
          <div className="text-right text-xs">
            <p className="font-semibold">Request #: {data.request_number || "—"}</p>
            <p className="text-gray-600">Date: {format(new Date(), "MMM d, yyyy")}</p>
          </div>
        </div>

        {/* Info grid */}
        <div className="grid grid-cols-4 gap-2 mb-3 text-[11px]">
          <div>
            <p className="text-gray-500 font-semibold uppercase text-[9px]">Payee</p>
            <p className="font-medium">{data.payee || "—"}</p>
          </div>
          <div>
            <p className="text-gray-500 font-semibold uppercase text-[9px]">Category</p>
            <p className="font-medium">{categoryLabels[data.category] || data.category || "—"}</p>
          </div>
          <div>
            <p className="text-gray-500 font-semibold uppercase text-[9px]">Payment Method</p>
            <p className="font-medium capitalize">{(data.payment_method || "—").replace(/_/g, " ")}</p>
          </div>
          <div>
            <p className="text-gray-500 font-semibold uppercase text-[9px]">Requested By</p>
            <p className="font-medium">{data.requested_by || "—"}</p>
          </div>
          <div>
            <p className="text-gray-500 font-semibold uppercase text-[9px]">Invoice / Ref #</p>
            <p className="font-medium">{data.invoice_number || "—"}</p>
          </div>
          <div>
            <p className="text-gray-500 font-semibold uppercase text-[9px]">Invoice Date</p>
            <p className="font-medium">{data.invoice_date ? format(new Date(data.invoice_date), "MMM d, yyyy") : "—"}</p>
          </div>
          <div>
            <p className="text-gray-500 font-semibold uppercase text-[9px]">Due Date</p>
            <p className="font-medium">{data.due_date ? format(new Date(data.due_date), "MMM d, yyyy") : "—"}</p>
          </div>
          <div>
            <p className="text-gray-500 font-semibold uppercase text-[9px]">Supporting Docs</p>
            <p className="font-medium">{data.supporting_docs || "—"}</p>
          </div>
        </div>

        {/* Description */}
        <div className="mb-3">
          <p className="text-gray-500 font-semibold uppercase text-[9px] mb-0.5">Description / Reason</p>
          <p className="text-[11px]">{data.description || "—"}</p>
        </div>

        {/* Project allocations */}
        <table className="w-full text-[11px] border-collapse mb-3">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-1">#</th>
              <th className="text-left py-1">Project</th>
              <th className="text-left py-1">Category</th>
              <th className="text-right py-1">Amount</th>
            </tr>
          </thead>
          <tbody>
            {allocations.length > 0 ? (
              allocations.map((a, idx) => (
                <tr key={idx} className="border-b border-gray-300">
                  <td className="py-1">{idx + 1}</td>
                  <td className="py-1">{a.project_name}</td>
                  <td className="py-1">{a.category || "—"}</td>
                  <td className="py-1 text-right">₱{(parseFloat(a.amount) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-1 text-gray-500">No project allocations</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-4">
          <div className="w-56 text-[11px] space-y-1">
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
            <div className="flex justify-between text-sm font-bold border-t-2 border-black pt-1">
              <span>Net Amount:</span>
              <span>₱{netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </div>

        {/* Signature lines */}
        <div className="grid grid-cols-3 gap-4 text-[10px]">
          <div className="border-t border-black pt-1">Requested By</div>
          <div className="border-t border-black pt-1">Approved By</div>
          <div className="border-t border-black pt-1">Disbursed By</div>
        </div>
      </div>
    </div>
  );
}

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
          @page { size: A4; margin: 0; }
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
        <div id="pr-print-content" className="w-[210mm] h-[297mm] bg-white text-black shadow-lg">
          <CopyBlock data={data} allocations={allocations} netAmount={netAmount} watermark="PAYEE'S COPY" />
          <div className="border-t-2 border-dashed border-gray-400" />
          <CopyBlock data={data} allocations={allocations} netAmount={netAmount} watermark="FCL COPY" />
        </div>
      </div>
    </div>
  );
}