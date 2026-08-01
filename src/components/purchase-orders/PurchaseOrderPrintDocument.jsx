import { format } from "date-fns";

export default function PurchaseOrderPrintDocument({ po, compact = false }) {
  const lineItems = po.line_items || [];
  const total = po.amount || lineItems.reduce((sum, item) => sum + (item.total || item.quantity * item.cost_per_item || 0), 0);

  return (
    <div className="min-h-[267mm] p-[15mm] bg-white text-black">
      <div className={`mb-6 flex items-center ${compact ? "justify-between" : "justify-center"}`}>
        <img src="https://media.base44.com/images/public/69f02f8501c3688565579a10/7a3b001fb_CONSTRUCTION_FINANCE.jpg" alt="FCL Aranang Development Corporation" className="h-20 w-auto" />
        {compact && <h1 className="text-2xl font-bold tracking-tight">PURCHASE ORDER</h1>}
      </div>
      <div className="flex items-start justify-between border-b-2 border-black pb-4 mb-6">
        {!compact && <div><h1 className="text-2xl font-bold tracking-tight">PURCHASE ORDER</h1><p className="text-sm text-gray-600 mt-1">Official purchase authorization document</p></div>}
        <div className={`text-sm ${compact ? "ml-auto" : "text-right"}`}><p className="font-semibold">PO #: {po.po_number || "—"}</p><p className="text-gray-600">Date: {po.requested_date ? format(new Date(po.requested_date), "MMM d, yyyy") : "—"}</p></div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div><p className="text-gray-500 font-semibold uppercase text-xs">Supplier</p><p className="font-medium">{po.supplier_name || "—"}</p></div>
        <div><p className="text-gray-500 font-semibold uppercase text-xs">Project</p><p className="font-medium">{po.project_name || "—"}</p></div>
        <div><p className="text-gray-500 font-semibold uppercase text-xs">Category</p><p className="font-medium capitalize">{(po.category || "—").replace(/_/g, " ")}</p></div>
        <div><p className="text-gray-500 font-semibold uppercase text-xs">Priority</p><p className="font-medium capitalize">{po.priority || "normal"}</p></div>
        {po.requested_by && <div><p className="text-gray-500 font-semibold uppercase text-xs">Requested By</p><p className="font-medium">{po.requested_by}</p></div>}
        {po.required_date && <div><p className="text-gray-500 font-semibold uppercase text-xs">Required Date</p><p className="font-medium">{format(new Date(po.required_date), "MMM d, yyyy")}</p></div>}
      </div>
      <div className="mb-6"><p className="text-gray-500 font-semibold uppercase text-xs mb-1">Description</p><p className="text-sm">{po.description || "No description provided"}</p></div>
      <table className="w-full text-sm border-collapse mb-6">
        <thead><tr className="border-b-2 border-black"><th className="text-left py-2">#</th><th className="text-left py-2">Description</th><th className="text-right py-2">Qty</th><th className="text-right py-2">Unit</th><th className="text-right py-2">Unit Price</th><th className="text-right py-2">Total</th></tr></thead>
        <tbody>
          {lineItems.length > 0 ? lineItems.map((item, index) => (
            <tr key={index} className="border-b border-gray-300"><td className="py-1">{index + 1}</td><td className="py-1">{item.description || "—"}</td><td className="py-1 text-right">{item.quantity ?? "—"}</td><td className="py-1 text-right">{item.unit_of_measure || "—"}</td><td className="py-1 text-right">₱{(item.cost_per_item || 0).toLocaleString()}</td><td className="py-1 text-right font-semibold">₱{(item.total || 0).toLocaleString()}</td></tr>
          )) : <tr><td colSpan={6} className="py-1 text-gray-500">{po.items || "No line items"}</td></tr>}
        </tbody>
        <tfoot><tr><td colSpan={5} className="py-3 text-right font-bold">TOTAL AMOUNT:</td><td className="py-3 text-right font-bold">₱{total.toLocaleString()}</td></tr></tfoot>
      </table>
      <div className="mb-8 text-sm"><p className="text-gray-500 font-semibold uppercase text-xs mb-1">Approval Status</p><p className="font-semibold capitalize">{po.approval_status || "pending"}</p>{po.approved_by && <p className="text-gray-600 mt-1">Approved By: {po.approved_by}</p>}{po.approval_notes && <p className="text-gray-600 italic mt-1">Notes: {po.approval_notes}</p>}</div>
      <div className="grid grid-cols-2 gap-8 mt-16 text-sm"><div><div className="border-t border-black pt-1">Requested By</div></div><div><div className="border-t border-black pt-1">Approved By</div></div></div>
      <p className="text-xs text-gray-400 text-center mt-12">This is a computer-generated document.</p>
    </div>
  );
}