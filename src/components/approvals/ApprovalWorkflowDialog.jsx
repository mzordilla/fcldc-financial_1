import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, ChevronRight, User, FileText, History, Banknote } from "lucide-react";
import ApprovalHistoryLog from "./ApprovalHistoryLog";

const STEPS = ["Details", "Decision", "History"];

export default function ApprovalWorkflowDialog({ open, onOpenChange, title, summary, history = [], onDecision, currentStatus }) {
  const [step, setStep] = useState(0);
  const [actor, setActor] = useState("");
  const [notes, setNotes] = useState("");

  const reset = () => { setStep(0); setActor(""); setNotes(""); };

  const handleClose = (v) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleDecide = (action) => {
    onDecision({ action, actor, notes });
    handleClose(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {/* Step indicator */}
          <div className="flex items-center gap-1 pt-2">
            {STEPS.map((s, i) => (
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
                {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
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

        {/* Step 1: Decision */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Reviewer Name <span className="text-destructive">*</span>
              </label>
              <input
                className="w-full px-3 py-2 text-sm border border-input rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Your full name"
                value={actor}
                onChange={(e) => setActor(e.target.value)}
              />
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
              Your name and notes will be permanently recorded in the approval history.
            </div>
          </div>
        )}

        {/* Step 2: History */}
        {step === 2 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Approval History</h3>
            <ApprovalHistoryLog history={history} />
          </div>
        )}

        <DialogFooter className="gap-2 flex-wrap">
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(s => s - 1)}>Back</Button>
          )}
          {step < STEPS.length - 1 && (
            <Button variant="outline" onClick={() => setStep(s => s + 1)}>
              Next <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
          {step === 1 && (
            <>
              {currentStatus !== "approved" && (
                <Button variant="destructive" onClick={() => handleDecide("rejected")} disabled={!actor.trim()}>
                  <XCircle className="w-4 h-4 mr-1" /> Reject
                </Button>
              )}
              {currentStatus === "approved" ? (
                <Button className="bg-chart-2 hover:bg-chart-2/90 text-white" onClick={() => handleDecide("paid")} disabled={!actor.trim()}>
                  <Banknote className="w-4 h-4 mr-1" /> Confirm Disbursement
                </Button>
              ) : (
                <Button onClick={() => handleDecide("approved")} disabled={!actor.trim()}>
                  <CheckCircle className="w-4 h-4 mr-1" /> Approve
                </Button>
              )}
            </>
          )}
          {step !== 1 && (
            <Button variant="ghost" onClick={() => handleClose(false)}>Close</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}