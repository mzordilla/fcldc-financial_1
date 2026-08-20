import { useEffect, useState, useRef, useLayoutEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, Settings, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import CompanySignatureSettingsDialog from "@/components/purchase-orders/CompanySignatureSettingsDialog";
import PurchaseOrderPrintDocument from "@/components/purchase-orders/PurchaseOrderPrintDocument";
import NoticeOfDeliveryPDF from "@/components/purchase-orders/NoticeOfDeliveryPDF";

function ScaledCopy({ po, signature, watermark, heightMm = 148, compact = true, allowUpscale = true }) {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const [scale, setScale] = useState(1);

  const recalcScale = useCallback(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;
    const availableHeight = container.clientHeight;
    const naturalHeight = content.scrollHeight;
    let nextScale = naturalHeight > 0 ? availableHeight / naturalHeight : 1;
    if (!allowUpscale) nextScale = Math.min(1, nextScale);
    setScale((prev) => (Math.abs(prev - nextScale) > 0.005 ? nextScale : prev));
  }, [allowUpscale]);

  useLayoutEffect(() => {
    recalcScale();
    const content = contentRef.current;
    if (!content) return;
    const observer = new ResizeObserver(() => recalcScale());
    observer.observe(content);
    return () => observer.disconnect();
  }, [po, signature, recalcScale]);

  return (
    <div ref={containerRef} className="relative overflow-hidden" style={{ height: `${heightMm}mm` }}>
      <div ref={contentRef} className="w-full" style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}>
        <PurchaseOrderPrintDocument po={po} compact={compact} signature={signature} />
      </div>
      {watermark && <span className="absolute bottom-3 right-5 text-xs font-bold uppercase tracking-wider text-gray-500">{watermark}</span>}
    </div>
  );
}

export default function PurchaseOrderPrintView({ po, open, onOpenChange }) {
  const [layout, setLayout] = useState("full");
  const [signatureId, setSignatureId] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: signatures = [], refetch } = useQuery({ queryKey: ["company-signatures"], queryFn: () => base44.entities.CompanySignature.list("-created_date"), enabled: open });
  const { data: currentUser } = useQuery({ queryKey: ["current-user"], queryFn: () => base44.auth.me(), enabled: open });
  const signature = signatures.find((item) => item.id === signatureId) || null;

  useEffect(() => {
    if (!open || !po || po.approval_status !== "approved") {
      setSignatureId("");
      return;
    }
    const approver = (po.approved_by || "").trim().toLowerCase();
    const match = signatures.find((item) => item.signatory_name?.trim().toLowerCase() === approver);
    setSignatureId(match?.id || "");
  }, [open, po, signatures]);

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

      <div className="print:hidden sticky top-0 z-10 bg-background border-b border-border flex flex-wrap items-center justify-end gap-2 px-4 py-3">
        <select aria-label="Signature to print" className="h-8 min-w-48 rounded-md border border-input bg-background px-3 text-sm" value={signatureId} onChange={(event) => setSignatureId(event.target.value)}>
          <option value="">No signature</option>
          {signatures.map((item) => <option key={item.id} value={item.id}>{item.signatory_name}</option>)}
        </select>
        {currentUser?.role === "admin" && <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}><Settings className="w-4 h-4 mr-2" /> Signature Settings</Button>}
        <Button variant={layout === "full" ? "default" : "outline"} size="sm" onClick={() => setLayout("full")}>Whole Page A4</Button>
        <Button variant={layout === "two" ? "default" : "outline"} size="sm" onClick={() => setLayout("two")}>Two Copies</Button>
        <NoticeOfDeliveryPDF po={po} />
        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" /> Print</Button>
        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}><X className="w-4 h-4 mr-2" /> Close</Button>
      </div>

      <div className="flex justify-center py-8 px-4">
        <div id="po-print-content" className="w-[210mm] h-[297mm] bg-white text-black shadow-lg overflow-hidden">
          {layout === "full" ? (
            <ScaledCopy po={po} signature={signature} watermark={null} heightMm={297} compact={false} allowUpscale={false} />
          ) : (
            <>
              <ScaledCopy po={po} signature={signature} watermark="FCL Copy" heightMm={147} allowUpscale={false} />
              <div className="border-t-2 border-dashed border-gray-400" />
              <ScaledCopy po={po} signature={signature} watermark="Vendor Copy" heightMm={147} allowUpscale={false} />
            </>
          )}
        </div>
      </div>
      <CompanySignatureSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} signatures={signatures} onChanged={refetch} />
    </div>
  );
}