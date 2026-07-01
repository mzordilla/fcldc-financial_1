import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function ProcessPayrollDialog({ open, onOpenChange, approvedEntries, onConfirm }) {
  const [processing, setProcessing] = useState(false);

  const totalGross = approvedEntries.reduce((s, e) => s + (e.gross_pay || 0), 0);
  const totalNet = approvedEntries.reduce((s, e) => s + (e.net_pay || 0), 0);
  const totalStatutory = approvedEntries.reduce((s, e) => s + (e.sss_contribution || 0) + (e.philhealth_contribution || 0) + (e.pagibig_contribution || 0) + (e.withholding_tax || 0), 0);

  const handleConfirm = async () => {
    setProcessing(true);
    await onConfirm();
    setProcessing(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Process Payroll</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">
          This will create labor cost transactions per project and forward net salaries plus statutory remittances (SSS, PhilHealth, Pag-IBIG, withholding tax) to Payables for {approvedEntries.length} approved employee{approvedEntries.length !== 1 ? "s" : ""}.
        </p>
        <div className="bg-muted/40 rounded-xl p-4 space-y-1.5">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Gross (Labor Cost)</span><span className="font-medium">{fmt(totalGross)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Statutory Remittances</span><span className="font-medium">{fmt(totalStatutory)}</span></div>
          <div className="flex justify-between text-sm font-semibold border-t border-border pt-1.5"><span>Net Salaries Payable</span><span className="text-primary">{fmt(totalNet)}</span></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={processing || approvedEntries.length === 0}>
            {processing ? "Processing..." : "Confirm & Process"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}