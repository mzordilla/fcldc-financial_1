import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

const peso = (n) => `₱${(n || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function FixDoubledDeductionsDialog() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);

  const run = async (confirm) => {
    setLoading(true);
    const res = await base44.functions.invoke("fixDoubledBankDeductions", { confirm });
    setReport(res.data);
    setLoading(false);
    if (confirm) qc.invalidateQueries();
  };

  const openDialog = () => { setOpen(true); setReport(null); run(false); };

  return (
    <>
      <Button variant="outline" size="sm" onClick={openDialog}>
        <Wrench className="w-4 h-4 mr-2" /> Fix doubled bank deductions
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Fix doubled bank deductions</DialogTitle>
            <DialogDescription>One-time correction for past payable payments that deducted the bank twice.</DialogDescription>
          </DialogHeader>
          {loading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}
          {!loading && report && (
            report.banks.length === 0 && !report.applied ? (
              <p className="text-sm text-muted-foreground py-4">No doubled deductions found. Balances are already correct.</p>
            ) : (
              <div className="space-y-2">
                {report.applied && <p className="text-sm font-medium text-primary">Correction applied to {report.transaction_count} entries.</p>}
                {report.banks.map((b) => (
                  <div key={b.bank_account_id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{b.name} <span className="text-muted-foreground font-normal">· {b.count} entries</span></p>
                    <div className="grid grid-cols-3 gap-2 mt-1 text-xs">
                      <div><p className="text-muted-foreground">Before</p>{peso(b.before)}</div>
                      <div><p className="text-muted-foreground">Add back</p>+{peso(b.correction)}</div>
                      <div><p className="text-muted-foreground">After</p><span className="font-semibold">{peso(b.after)}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
            {report && !report.applied && report.banks.length > 0 && (
              <Button onClick={() => run(true)} disabled={loading}>Apply correction</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}