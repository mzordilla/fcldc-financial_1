import { useState } from "react";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import PurchaseOrderPrintDocument from "@/components/purchase-orders/PurchaseOrderPrintDocument";

export default function PurchaseOrderPrintView({ po, open, onOpenChange }) {
  const [layout, setLayout] = useState("full");
  if (!open || !po) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #po-print-content, #po-print-content * { visibility: visible; }
          #po-print-content { position: absolute; left: 0; top: 0; width: 210mm; height: 297mm; }
          @page { size: A4; margin: 0; }
        }
      `}</style>

      <div className="print:hidden sticky top-0 z-10 bg-background border-b border-border flex items-center justify-end gap-2 px-4 py-3">
        <Button variant={layout === "full" ? "default" : "outline"} size="sm" onClick={() => setLayout("full")}>Whole Page A4</Button>
        <Button variant={layout === "two" ? "default" : "outline"} size="sm" onClick={() => setLayout("two")}>Two Copies</Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" /> Print</Button>
        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}><X className="w-4 h-4 mr-2" /> Close</Button>
      </div>

      <div className="flex justify-center py-8 px-4">
        <div id="po-print-content" className="w-[210mm] h-[297mm] bg-white text-black shadow-lg overflow-hidden">
          {layout === "full" ? (
            <PurchaseOrderPrintDocument po={po} />
          ) : (
            <>
              <div className="h-[148.5mm] overflow-hidden"><div className="w-[200%]" style={{ zoom: 0.5 }}><PurchaseOrderPrintDocument po={po} /></div></div>
              <div className="border-t-2 border-dashed border-gray-400" />
              <div className="h-[148.5mm] overflow-hidden"><div className="w-[200%]" style={{ zoom: 0.5 }}><PurchaseOrderPrintDocument po={po} /></div></div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}