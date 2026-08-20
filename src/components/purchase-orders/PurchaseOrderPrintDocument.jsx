import { format } from "date-fns";

export default function PurchaseOrderPrintDocument({ po, compact = false, signature = null }) {
  const lineItems = po.line_items || [];
  const total = po.amount || lineItems.reduce((sum, item) => sum + (item.total || item.quantity * item.cost_per_item || 0), 0);
  const gap = compact ? "mb-3" : "mb-6";

  return (
    <div className={compact ? "px-[8mm] py-[5mm] bg-white text-black" : "min-h-[267mm] p-[15mm] bg-white text-black"}>
      <div className={`flex items-start justify-between border-b-2 border-black ${compact ? "pb-2 mb-3" : "pb-4 mb-6"}`}>
        <img src="https://media.base44.com/images/public/69f02f8501c3688565579a10/7a3b001fb_CONSTRUCTION_FINANCE.jpg" alt="FCL Aranang Development Corporation" className={compact ? "h-14 w-auto" : "h-20 w-auto"} />
        <div className="text-right">
          <h1 className={`font-bold tracking-tight leading-none ${compact ? "text-xl" : "text-2xl"}`}>PURCHASE ORDER</h1>
          <p className="text-sm font-semibold leading-tight">PO #: {po.po_number || "—"}</p>
          <p className="text-sm text-gray-600 leading-tight">Date: {po.requested_date ? format(new Date(po.requested_date), "MMM d, yyyy") : "—"}</p>
        </div>
      </div>
      <div className={`grid grid-cols-3 ${compact ? "gap-x-4 gap-y-1" : "gap-4"} ${gap} text-sm`}>
        <div><p className="text-gray-500 font-semibold uppercase text-xs">Supplier</p><p className="font-medium">{po.supplier_name || "—"}</p></div>
        <div><p className="text-gray-500 font-semibold uppercase text-xs">Project</p><p className="font-medium">{po.project_name || "—"}</p></div>
        <div><p className="text-gray-500 font-semibold uppercase text-xs">Priority</p><p className="font-medium capitalize">{po.priority || "normal"}</p></div>
        <div><p className="text-gray-500 font-semibold uppercase text-xs">Category</p><p className="font-medium capitalize">{(po.category || "—").replace(/_/g, " ")}</p></div>
        <div><p className="text-gray-500 font-semibold uppercase text-xs">Required Date</p><p className="font-medium">{po.required_date ? format(new Date(po.required_date), "MMM d, yyyy") : "—"}</p></div>
        <div><p className="text-gray-500 font-semibold uppercase text-xs">Description</p><p className="font-medium">{po.description || "No description provided"}</p></div>
      </div>
      <table className={`w-full text-sm border-collapse ${gap}`}>
        <thead><tr className="border-b-2 border-black"><th className="text-left py-2">#</th><th className="text-left py-2">Description</th><th className="text-right py-2">Qty</th><th className="text-right py-2">Unit</th><th className="text-right py-2">Unit Price</th><th className="text-right py-2">Total</th></tr></thead>
        <tbody>
          {lineItems.length > 0 ? lineItems.map((item, index) => (
            <tr key={index} className="border-b border-gray-300"><td className="py-1">{index + 1}</td><td className="py-1">{item.description || "—"}</td><td className="py-1 text-right">{item.quantity ?? "—"}</td><td className="py-1 text-right">{item.unit_of_measure || "—"}</td><td className="py-1 text-right">₱{(item.cost_per_item || 0).toLocaleString()}</td><td className="py-1 text-right font-semibold">₱{(item.total || 0).toLocaleString()}</td></tr>
          )) : <tr><td colSpan={6} className="py-1 text-gray-500">{po.items || "No line items"}</td></tr>}
        </tbody>
        <tfoot><tr><td colSpan={5} className={`${compact ? "py-1" : "py-3"} text-right font-bold`}>TOTAL AMOUNT:</td><td className={`${compact ? "py-1" : "py-3"} text-right font-bold`}>₱{total.toLocaleString()}</td></tr></tfoot>
      </table>
      <div className={`${compact ? "mb-4" : "mb-8"} text-sm`}><p className="text-gray-500 font-semibold uppercase text-xs mb-1">Approval Status</p><p className="font-semibold capitalize">{po.approval_status || "pending"}</p>{po.approved_by && <p className="text-gray-600 mt-1">Approved By: {po.approved_by}</p>}{po.approval_notes && <p className="text-gray-600 italic mt-1">Notes: {po.approval_notes}</p>}</div>
      <div className={`grid grid-cols-2 gap-8 ${compact ? "mt-6" : "mt-16"} text-sm`}><div><div className="border-t border-black pt-1 text-center"><p>{po.requested_by || "Purchaser"}</p><p className="text-xs text-gray-500">Purchaser</p></div></div><div>{signature && <img src={signature.signature_url} alt={`${signature.signatory_name} signature`} className={`${compact ? "h-10" : "h-12"} max-w-40 object-contain mx-auto`} />}<div className="border-t border-black pt-1 text-center"><p>{signature?.signatory_name || po.approved_by || "Approved By"}</p><p className="text-xs text-gray-500">{signature?.signatory_title || "Approved By"}</p></div></div></div>
      <p className={`text-xs text-gray-400 text-center ${compact ? "mt-3" : "mt-12"}`}>This is a computer-generated document.</p>
    </div>
  );
}