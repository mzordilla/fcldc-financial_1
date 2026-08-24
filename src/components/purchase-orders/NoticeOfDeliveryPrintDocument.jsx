import { format } from "date-fns";

export default function NoticeOfDeliveryPrintDocument({ po, compact = false }) {
  const items = po.line_items || [];

  return (
    <div className={`bg-white text-black ${compact ? "p-[8mm]" : "min-h-[297mm] p-[15mm]"}`}>
      <div className="flex items-start justify-between border-b-2 border-black pb-4">
        <img src="https://media.base44.com/images/public/69f02f8501c3688565579a10/7a3b001fb_CONSTRUCTION_FINANCE.jpg" alt="FCL Aranang Development Corporation" className="h-20 w-auto" />
        <div className="text-right">
          <h1 className="text-2xl font-bold">NOTICE OF DELIVERY</h1>
          <p className="text-sm font-semibold">PO #: {po.po_number || "—"}</p>
          <p className="text-sm text-gray-600">Date: {format(new Date(), "MMM d, yyyy")}</p>
        </div>
      </div>

      <p className={`${compact ? "mt-3" : "mt-6"} text-sm text-gray-600`}>This document confirms that the goods or services below have been delivered.</p>
      <div className={`${compact ? "mt-3 gap-3 p-3" : "mt-6 gap-5 p-4"} grid grid-cols-2 rounded-md border border-gray-300 bg-gray-50 text-sm`}>
        <div><p className="text-xs font-semibold uppercase text-gray-500">Supplier</p><p className="font-medium">{po.supplier_name || "—"}</p></div>
        <div><p className="text-xs font-semibold uppercase text-gray-500">Project</p><p className="font-medium">{po.project_name || "—"}</p></div>
        <div><p className="text-xs font-semibold uppercase text-gray-500">Delivery Date</p><p className="font-medium">{po.delivery_date ? format(new Date(po.delivery_date), "MMM d, yyyy") : "—"}</p></div>
        <div><p className="text-xs font-semibold uppercase text-gray-500">Requested Date</p><p className="font-medium">{po.requested_date ? format(new Date(po.requested_date), "MMM d, yyyy") : "—"}</p></div>
        <div><p className="text-xs font-semibold uppercase text-gray-500">Requested By</p><p className="font-medium">{po.requested_by || "—"}</p></div>
      </div>

      <div className={`${compact ? "mt-3" : "mt-6"} text-sm`}><p className="text-xs font-semibold uppercase text-gray-500">Description</p><p className="mt-1">{po.description || "—"}</p></div>
      <table className={`${compact ? "mt-3" : "mt-6"} w-full border-collapse text-sm`}>
        <thead><tr className="border-b-2 border-black"><th className="py-2 text-left">#</th><th className="py-2 text-left">Description</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Unit</th><th className="py-2 text-right">Total</th></tr></thead>
        <tbody>{items.length ? items.map((item, index) => <tr key={index} className="border-b border-gray-300"><td className="py-2">{index + 1}</td><td className="py-2">{item.description || "—"}</td><td className="py-2 text-right">{item.quantity ?? "—"}</td><td className="py-2 text-right">{item.unit_of_measure || "—"}</td><td className="py-2 text-right">₱{(item.total || 0).toLocaleString()}</td></tr>) : <tr><td colSpan={5} className="py-2 text-gray-500">{po.items || "No line items"}</td></tr>}</tbody>
        <tfoot><tr><td colSpan={4} className="py-3 text-right font-bold">TOTAL AMOUNT:</td><td className="py-3 text-right font-bold">₱{(po.amount || 0).toLocaleString()}</td></tr></tfoot>
      </table>

      {po.delivery_notes && <div className={`${compact ? "mt-3" : "mt-6"} text-sm`}><p className="text-xs font-semibold uppercase text-gray-500">Delivery Notes</p><p className="mt-1">{po.delivery_notes}</p></div>}
      <div className={`${compact ? "mt-10" : "mt-24"} grid grid-cols-2 gap-16 text-center text-sm`}><div className="border-t border-black pt-2">Received by / Signature</div><div className="border-t border-black pt-2">Authorized by / Signature</div></div>
    </div>
  );
}