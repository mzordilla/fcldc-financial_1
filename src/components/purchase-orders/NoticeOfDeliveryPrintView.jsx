import { useState } from "react";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScaledDeliveryNoteCopy from "@/components/purchase-orders/ScaledDeliveryNoteCopy";

export default function NoticeOfDeliveryPrintView({ po, open, onOpenChange }) {
  const [layout, setLayout] = useState("full");
  if (!open || !po) return null;

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/50">
      <style>{`@media print { body * { visibility: hidden; } #po-print-content, #po-print-content * { visibility: hidden !important; } #delivery-note-print, #delivery-note-print * { visibility: visible; } #delivery-note-print { position: absolute; left: 0; top: 0; width: 210mm; height: 297mm; } @page { size: A4; margin: 0; } }`}</style>
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-end gap-2 border-b border-border bg-background px-4 py-3">
        <Button variant={layout === "full" ? "default" : "outline"} size="sm" onClick={() => setLayout("full")}>Whole Page A4</Button>
        <Button variant={layout === "two" ? "default" : "outline"} size="sm" onClick={() => setLayout("two")}>Two Copies / 1 Page</Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="mr-2 w-4 h-4" /> Print</Button>
        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}><X className="mr-2 w-4 h-4" /> Close</Button>
      </div>
      <div className="flex justify-center p-8">
        <div id="delivery-note-print" className="h-[297mm] w-[210mm] overflow-hidden bg-white text-black shadow-lg">
          {layout === "full" ? <ScaledDeliveryNoteCopy po={po} heightMm={297} compact={false} /> : <><ScaledDeliveryNoteCopy po={po} heightMm={147} compact watermark="FCL Copy" /><div className="border-t-2 border-dashed border-gray-400" /><ScaledDeliveryNoteCopy po={po} heightMm={147} compact watermark="Supplier Copy" /></>}
        </div>
      </div>
    </div>
  );
}