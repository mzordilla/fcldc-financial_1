import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, XCircle, ChevronRight, User, FileText, History, Banknote, Printer } from "lucide-react";
import ApprovalHistoryLog from "./ApprovalHistoryLog";
import CheckWriterDialog from "../payment/CheckWriterDialog";

const STEPS = ["Details", "Decision", "History"];

// Statuses where no further approval action is allowed
const FINAL_STATUSES = ["rejected", "paid"];

export default function ApprovalWorkflowDialog({ open, onOpenChange, title, summary, history = [], onDecision, currentStatus, paymentRequest, historyOnly = false }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDisbursementRole, setIsDisbursementRole] = useState(false);
  const [step, setStep] = useState(0);
  const [actor, setActor] = useState("");
  const [notes, setNotes] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [showCheckWriter, setShowCheckWriter] = useState(false);
  const isFinal = historyOnly || FINAL_STATUSES.includes(currentStatus);
  const isDisbursement = currentStatus === "approved";
  // Disbursement role can only act on approved (disburse) — not approve/reject pending
  const canAct = isAdmin || (isDisbursementRole && isDisbursement);
  // Only show Decision tab if user can act and status is not final
  const visibleSteps = (isFinal || !canAct) ? ["Details", "History"] : STEPS;

  useEffect(() => {
    if (open) {
      base44.auth.me().then(u => {
        setIsAdmin(u?.role === "admin");
        setIsDisbursementRole(u?.role === "disbursement");
      }).catch(() => {});
    }
  }, [open]);

  const { data: allUsers = [] } = useQuery({
    queryKey: ["all_users"],
    queryFn: () => base44.entities.User.list("full_name", 100),
    enabled: open,
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ["bankaccounts"],
    queryFn: () => base44.entities.BankAccount.list("-created_date", 100),
    enabled: open && isDisbursement,
  });

  const reset = () => { setStep(0); setActor(""); setNotes(""); setBankAccountId(""); setPaymentReference(""); setPaymentDate(new Date().toISOString().split("T")[0]); setShowCheckWriter(false); };

  const handleClose = (v) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const [deciding, setDeciding] = useState(false);

  const handleDecide = async (action) => {
    setDeciding(true);
    try {
      await onDecision({ action, actor, notes, bankAccountId, paymentReference, paymentDate });
      handleClose(false);
    } catch (err) {
      toast.error(err?.message || "Something went wrong. Please try again.");
    } finally {
      setDeciding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {/* Step indicator */}
          <div className="flex items-center gap-1 pt-2">
            {visibleSteps.map((s, i) => (
              <div key={s} className="flex items-center gap-1">
                <button
                  onClick={() => setStep(i)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    step === i
                      ? "bg-primary text-primary-foreground"
                      : i < step
                      ? "bg-primary/20 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <span>{i + 1}</span>
                  <span>{s}</span>
                </button>
                {i < visibleSteps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </DialogHeader>

        {/* Step 0: Details */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-xl p-4 space-y-3">
              {summary}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <History className="w-3.5 h-3.5" />
              <span>{history.length} approval action{history.length !== 1 ? "s" : ""} on record</span>
            </div>
          </div>
        )}

        {/* Step 1: Decision (only for non-final statuses, authorized users only) */}
        {step === 1 && !isFinal && canAct && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Approver <span className="text-destructive">*</span>
              </label>
              {allUsers.length > 0 ? (
                <Select value={actor} onValueChange={setActor}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an approver..." />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers.map(u => (
                      <SelectItem key={u.id} value={u.full_name}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Enter approver name..."
                  value={actor}
                  onChange={(e) => setActor(e.target.value)}
                />
              )}
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
            {/* Extra fields for Disbursement */}
            {isDisbursement && (
              <div className="space-y-3 border-t border-border pt-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Disbursement Details</p>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Payment Date</label>
                  <Input
                    type="date"
                    value={paymentDate}
                    onChange={e => setPaymentDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Bank Account <span className="text-muted-foreground font-normal">(for transaction)</span></label>
                  <Select value={bankAccountId} onValueChange={setBankAccountId}>
                    <SelectTrigger><SelectValue placeholder="Select bank account" /></SelectTrigger>
                    <SelectContent>
                      {bankAccounts.filter(a => a.status !== "closed").map(a => (
                        <SelectItem key={a.id} value={a.id}>{a.account_name} – {a.bank_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Reference # <span className="text-muted-foreground font-normal">(check no., transfer ref., etc.)</span></label>
                  <Input
                    value={paymentReference}
                    onChange={e => setPaymentReference(e.target.value)}
                    placeholder="e.g. CHK-00123 or TRF-2026-0501"
                  />
                </div>
                {paymentRequest && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setShowCheckWriter(true)}
                  >
                    <Printer className="w-4 h-4" /> Preview & Print Check
                  </Button>
                )}
              </div>
            )}
            <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
              Your name and notes will be permanently recorded in the approval history.
            </div>
          </div>
        )}

        {/* Step 2: History (step 1 for final statuses) */}
        {(step === 2 || (isFinal && step === 1)) && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Approval History</h3>
            <ApprovalHistoryLog history={history} />
          </div>
        )}

        <DialogFooter className="gap-2 flex-wrap">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)}>Back</Button>
          )}
          {step < visibleSteps.length - 1 && (
            <Button variant="outline" onClick={() => setStep(s => s + 1)}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {step === 1 && !isFinal && canAct && (
            <>
              {currentStatus !== "approved" && (
                <Button variant="destructive" onClick={() => handleDecide("rejected")} disabled={!actor.trim() || deciding}>
                  <XCircle className="w-4 h-4 mr-1" /> {deciding ? "Processing..." : "Reject"}
                </Button>
              )}
              {currentStatus === "approved" ? (
                <Button className="bg-chart-2 hover:bg-chart-2/90 text-white" onClick={() => handleDecide("paid")} disabled={!actor.trim() || deciding}>
                  <Banknote className="w-4 h-4 mr-1" /> {deciding ? "Processing..." : "Confirm Disbursement"}
                </Button>
              ) : (
                <Button onClick={() => handleDecide("approved")} disabled={!actor.trim() || deciding}>
                  <CheckCircle className="w-4 h-4 mr-1" /> {deciding ? "Processing..." : "Approve"}
                </Button>
              )}
            </>
          )}
          {(step !== 1 || isFinal) && (
            <Button variant="ghost" onClick={() => handleClose(false)}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
      {showCheckWriter && (
        <CheckWriterDialog
          open={showCheckWriter}
          onOpenChange={setShowCheckWriter}
          paymentRequest={paymentRequest}
          bankAccount={bankAccounts.find(a => a.id === bankAccountId)}
          paymentDate={paymentDate}
          paymentReference={paymentReference}
        />
      )}
    </Dialog>
  );
}