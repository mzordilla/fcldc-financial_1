import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function CheckRemovalRequestDialog({ check, open, onOpenChange, onSubmit, saving }) {
  const [action, setAction] = useState("void");
  const [reason, setReason] = useState("");
  useEffect(() => { if (open) { setAction("void"); setReason(""); } }, [open]);
  const submit = async () => { if (!reason.trim()) return; await onSubmit({ check, action, reason: reason.trim() }); onOpenChange(false); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent>
    <DialogHeader><DialogTitle>Request removal of printed check</DialogTitle></DialogHeader>
    <p className="text-sm text-muted-foreground">Check {check?.check_number} requires admin approval before it can be removed.</p>
    <div className="space-y-3"><Select value={action} onValueChange={setAction}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="void">Mark as voided</SelectItem><SelectItem value="delete">Permanently delete</SelectItem></SelectContent></Select><Textarea value={reason} onChange={event => setReason(event.target.value)} placeholder="Reason for this request" /></div>
    <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button disabled={saving || !reason.trim()} onClick={submit}>{saving ? "Submitting..." : "Submit for approval"}</Button></DialogFooter>
  </DialogContent></Dialog>;
}