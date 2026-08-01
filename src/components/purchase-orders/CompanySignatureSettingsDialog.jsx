import { Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CompanySignatureForm from "@/components/purchase-orders/CompanySignatureForm";

export default function CompanySignatureSettingsDialog({ open, onOpenChange, signatures, onChanged }) {
  const removeSignature = async (id) => {
    await base44.entities.CompanySignature.delete(id);
    await onChanged();
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>Company Signature Settings</DialogTitle></DialogHeader>
      <CompanySignatureForm onSaved={onChanged} />
      <div className="space-y-2 border-t border-border pt-4">
        <p className="text-sm font-semibold">Saved signatures</p>
        {signatures.map((signature) => <div key={signature.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
          <img src={signature.signature_url} alt={`${signature.signatory_name} signature`} className="h-10 w-24 object-contain" />
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{signature.signatory_name}</p><p className="truncate text-xs text-muted-foreground">{signature.signatory_title || "Authorized signatory"}</p></div>
          <Button type="button" variant="ghost" size="icon" onClick={() => removeSignature(signature.id)} aria-label="Delete signature"><Trash2 className="h-4 w-4 text-destructive" /></Button>
        </div>)}
        {signatures.length === 0 && <p className="text-sm text-muted-foreground">No company signatures saved yet.</p>}
      </div>
    </DialogContent>
  </Dialog>;
}