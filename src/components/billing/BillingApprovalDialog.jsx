import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, User, FileText, ChevronRight } from "lucide-react";

export default function BillingApprovalDialog({ open, onOpenChange, billingCycle, onDecision }) {
  const [step, setStep] = useState(0);
  const [actor, setActor] = useState("");
  const [notes, setNotes] = useState("");
  const [deciding, setDeciding] = useState(false);

  const { data: adminUsers = [] } = useQuery({
    queryKey: ["admin_users"],
    queryFn: () => base44.entities.User.filter({ role: "admin" }, "full_name", 100),
    enabled: open,
  });

  const reset = () => { setStep(0); setActor(""); setNotes(""); };

  const handleClose = (v) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleDecide = async (action) => {
    setDeciding(true);
    await onDecision({ action, actor, notes });
    setDeciding(false);
    handleClose(false);
  };

  if (!billingCycle) return null;

  const gross = billingCycle.billing_amount || 0;
  const net = billingCycle.net_billing_amount || gross;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Review Billing Cycle</DialogTitle>
          <div className="flex items-center gap-1 pt-2">
            {["Details", "Decision"].map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <button
                  onClick={() => setStep(i)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    step === i ? "bg-primary text-primary-foreground" : i < step ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span>{i + 1}</span><span>{s}</span>
                </button>
                {i < 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </DialogHeader>

        {step === 0 && (
          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-foreground">{billingCycle.project_name}</p>
              {billingCycle.billing_number && <span className="text-xs font-mono text-muted-foreground">{billingCycle.billing_number}</span>}
            </div>
            <p className="text-sm text-muted-foreground">Client: <span className="text-foreground font-medium">{billingCycle.client_name}</span></p>
            {billingCycle.period_label && <p className="text-sm text-muted-foreground">Period: {billingCycle.period_label}</p>}
            {billingCycle.description && <p className="text-sm text-muted-foreground">{billingCycle.description}</p>}

            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="bg-background rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Accomplishment</p>
                <p className="font-bold text-foreground">{billingCycle.accomplishment_percentage}%</p>
              </div>
              <div className="bg-background rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Gross</p>
                <p className="font-semibold text-foreground">₱{(billingCycle.billing_amount || 0).toLocaleString()}</p>
              </div>
              <div className="bg-primary/10 rounded-lg p-2 text-center">
                <p className="text-xs text-muted-foreground">Net Billing</p>
                <p className="font-bold text-primary">₱{net.toLocaleString()}</p>
              </div>
            </div>

            {billingCycle.retention_rate > 0 && (
              <p className="text-xs text-chart-3">Retention ({billingCycle.retention_rate}%): -₱{(billingCycle.retention_amount || 0).toLocaleString()}</p>
            )}

            <div className="pt-2 bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-primary space-y-1">
              <p>✓ On approval, <strong>₱{gross.toLocaleString()}</strong> gross billing will be recognized as <strong>income in the P&L</strong> immediately.</p>
              <p className="text-primary/70">A corresponding Accounts Receivable record will be created. Collections will reduce the AR balance without affecting recognized income.</p>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Approver <span className="text-destructive">*</span>
              </label>
              <Select value={actor} onValueChange={setActor}>
                <SelectTrigger><SelectValue placeholder="Select an approver..." /></SelectTrigger>
                <SelectContent>
                  {adminUsers.map(u => (
                    <SelectItem key={u.id} value={u.full_name}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5" /> Notes (optional)
              </label>
              <Textarea
                placeholder="Add approval or rejection notes..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-24"
              />
            </div>
            <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
              Approving will recognize ₱{gross.toLocaleString()} gross billing as income in the P&L and create a corresponding Accounts Receivable for ₱{net.toLocaleString()}. Collections against this AR will not affect the recognized income.
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 flex-wrap">
          {step > 0 && <Button variant="outline" onClick={() => setStep(s => s - 1)}>Back</Button>}
          {step === 0 && (
            <Button variant="outline" onClick={() => setStep(1)}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {step === 1 && (
            <>
              <Button variant="destructive" onClick={() => handleDecide("rejected")} disabled={!actor.trim() || deciding}>
                <XCircle className="w-4 h-4 mr-1" /> Reject
              </Button>
              <Button onClick={() => handleDecide("approved")} disabled={!actor.trim() || deciding}>
                <CheckCircle className="w-4 h-4 mr-1" /> {deciding ? "Approving..." : "Approve"}
              </Button>
            </>
          )}
          {step !== 1 && <Button variant="ghost" onClick={() => handleClose(false)}>Close</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}