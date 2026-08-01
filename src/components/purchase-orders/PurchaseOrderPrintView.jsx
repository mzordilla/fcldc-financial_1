import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Printer, Settings, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import CompanySignatureSettingsDialog from "@/components/purchase-orders/CompanySignatureSettingsDialog";
import PurchaseOrderPrintDocument from "@/components/purchase-orders/PurchaseOrderPrintDocument";

export default function PurchaseOrderPrintView({ po, open, onOpenChange }) {
  const [layout, setLayout] = useState("full");
  const [signatureId, setSignatureId] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { data: signatures = [], refetch } = useQuery({ queryKey: ["company-signatures"], queryFn: () => base44.entities.CompanySignature.list("-created_date"), enabled: open });
  const signature = signatures.find((item) => item.id === signatureId) || null;
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
        <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}><Settings className="w-4 h-4 mr-2" /> Signature Settings</Button>
        <Button variant={layout === "full" ? "default" : "outline"} size="sm" onClick={() => setLayout("full")}>Whole Page A4</Button>
        <Button variant={layout === "two" ? "default" : "outline"} size="sm" onClick={() => setLayout("two")}>Two Copies</Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" /> Print</Button>
        <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}><X className="w-4 h-4 mr-2" /> Close</Button>
      </div>

      <div className="flex justify-center py-8 px-4">
        <div id="po-print-content" className="w-[210mm] h-[297mm] bg-white text-black shadow-lg overflow-hidden">
          {layout === "full" ? (
            <PurchaseOrderPrintDocument po={po} signature={signature} />
          ) : (
            <>
              <div className="relative h-[148mm] overflow-hidden">
                <div style={{ width: "200%", transform: "scale(0.5)", transformOrigin: "top left" }}><PurchaseOrderPrintDocument po={po} compact signature={signature} /></div>
                <span className="absolute bottom-3 right-5 text-xs font-bold uppercase tracking-wider text-gray-500">Vendor Copy</span>
              </div>
              <div className="border-t-2 border-dashed border-gray-400" />
              <div className="relative h-[148mm] overflow-hidden">
                <div style={{ width: "200%", transform: "scale(0.5)", transformOrigin: "top left" }}><PurchaseOrderPrintDocument po={po} compact signature={signature} /></div>
                <span className="absolute bottom-3 right-5 text-xs font-bold uppercase tracking-wider text-gray-500">FCL Copy</span>
              </div>
            </>
          )}
        </div>
      </div>
      <CompanySignatureSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} signatures={signatures} onChanged={refetch} />
    </div>
  );
}