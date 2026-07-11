import { format } from "date-fns";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PurchaseOrderPrintView({ po, open, onOpenChange }) {
  if (!open || !po) return null;

  const lineItems = po.line_items || [];
  const total = po.amount || lineItems.reduce((s, i) => s + (i.total || i.quantity * i.cost_per_item || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #po-print-content, #po-print-content * { visibility: visible; }
          #po-print-content { position: absolute; left: 0; top: 0; width: 210mm; }
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
        <div id="po-print-content" className="w-[210mm] min-h-[297mm] bg-white text-black p-[15mm] shadow-lg">
          {/* Company Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Your Company Name</h2>
              <p className="text-xs text-gray-600 mt-0.5">123 Business Street, City, Country</p>
              <p className="text-xs text-gray-600">Phone: (000) 000-0000 · Email: info@company.com</p>
            </div>
          </div>

          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">PURCHASE ORDER</h1>
              <p className="text-sm text-gray-600 mt-1">Official purchase authorization document</p>
            </div>
            <div className="text-right text-sm">
              <p className="font-semibold">PO #: {po.po_number || "—"}</p>
              <p className="text-gray-600">Date: {po.requested_date ? format(new Date(po.requested_date), "MMM d, yyyy") : "—"}</p>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
            <div>
              <p className="text-gray-500 font-semibold uppercase text-xs">Supplier</p>
              <p className="font-medium">{po.supplier_name || "—"}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-xs">Project</p>
              <p className="font-medium">{po.project_name || "—"}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-xs">Category</p>
              <p className="font-medium capitalize">{(po.category || "—").replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-gray-500 font-semibold uppercase text-xs">Priority</p>
              <p className="font-medium capitalize">{po.priority || "normal"}</p>
            </div>
            {po.requested_by && (
              <div>
                <p className="text-gray-500 font-semibold uppercase text-xs">Requested By</p>
                <p className="font-medium">{po.requested_by}</p>
              </div>
            )}
            {po.required_date && (
              <div>
                <p className="text-gray-500 font-semibold uppercase text-xs">Required Date</p>
                <p className="font-medium">{format(new Date(po.required_date), "MMM d, yyyy")}</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="mb-6">
            <p className="text-gray-500 font-semibold uppercase text-xs mb-1">Description</p>
            <p className="text-sm">{po.description || "No description provided"}</p>
          </div>

          {/* Line items */}
          <table className="w-full text-sm border-collapse mb-6">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-2">#</th>
                <th className="text-left py-2">Description</th>
                <th className="text-right py-2">Qty</th>
                <th className="text-right py-2">Unit</th>
                <th className="text-right py-2">Unit Price</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody>
              {lineItems.length > 0 ? (
                lineItems.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-300">
                    <td className="py-2">{idx + 1}</td>
                    <td className="py-2">{item.description || "—"}</td>
                    <td className="py-2 text-right">{item.quantity ?? "—"}</td>
                    <td className="py-2 text-right">{item.unit_of_measure || "—"}</td>
                    <td className="py-2 text-right">₱{(item.cost_per_item || 0).toLocaleString()}</td>
                    <td className="py-2 text-right font-semibold">₱{(item.total || 0).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-2 text-gray-500">{po.items || "No line items"}</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="py-3 text-right font-bold">TOTAL AMOUNT:</td>
                <td className="py-3 text-right font-bold">₱{total.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>

          {/* Approval status */}
          <div className="mb-8 text-sm">
            <p className="text-gray-500 font-semibold uppercase text-xs mb-1">Approval Status</p>
            <p className="font-semibold capitalize">{po.approval_status || "pending"}</p>
            {po.approved_by && <p className="text-gray-600 mt-1">Approved By: {po.approved_by}</p>}
            {po.approval_notes && <p className="text-gray-600 italic mt-1">Notes: {po.approval_notes}</p>}
          </div>

          {/* Signature lines */}
          <div className="grid grid-cols-2 gap-8 mt-16 text-sm">
            <div>
              <div className="border-t border-black pt-1">Requested By</div>
            </div>
            <div>
              <div className="border-t border-black pt-1">Approved By</div>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center mt-12">This is a computer-generated document.</p>
        </div>
      </div>
    </div>
  );
}