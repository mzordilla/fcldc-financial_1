import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Plus, Trash2, Pencil, CheckCircle, XCircle, Clock, FileText, ChevronDown, ChevronUp, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BillingCycleFormDialog from "../components/billing/BillingCycleFormDialog";
import BillingApprovalDialog from "../components/billing/BillingApprovalDialog";

const statusStyles = {
  pending: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  approved: "bg-primary/10 text-primary border-primary/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

const statusIcons = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
};

export default function BillingCycles() {
  const [showAdd, setShowAdd] = useState(false);
  const [editingBC, setEditingBC] = useState(null);
  const [reviewBC, setReviewBC] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedHistory, setExpandedHistory] = useState(null);
  const queryClient = useQueryClient();

  const { data: billingCycles = [], isLoading } = useQuery({
    queryKey: ["billing_cycles"],
    queryFn: () => base44.entities.BillingCycle.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BillingCycle.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing_cycles"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.BillingCycle.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing_cycles"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BillingCycle.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["billing_cycles"] }),
  });

  const handleDecision = async (bc, { action, actor, notes }) => {
    const entry = { action, actor, notes, timestamp: new Date().toISOString() };
    const history = [...(bc.approval_history || []), entry];

    const updateData = {
      approval_status: action,
      approval_notes: notes,
      approved_by: actor,
      approval_history: history,
    };

    // If approved, create a Receivable + an income Transaction
    if (action === "approved") {
      const billingAmount = bc.net_billing_amount || bc.billing_amount || 0;
      const today = new Date().toISOString().split("T")[0];

      const receivable = await base44.entities.Receivable.create({
        client_name: bc.client_name,
        project_name: bc.project_name,
        invoice_number: bc.billing_number || "",
        amount: billingAmount,
        amount_paid: 0,
        due_date: bc.due_date || today,
        status: "outstanding",
        notes: `Auto-created from Billing Cycle: ${bc.billing_number || ""} — ${bc.period_label || ""} (${bc.accomplishment_percentage}% accomplishment)`,
      });
      updateData.receivable_id = receivable.id;

      // Create an income transaction so project P&L and dashboard update automatically
      await base44.entities.Transaction.create({
        description: `Billing: ${bc.billing_number || bc.period_label || "Billing Cycle"} — ${bc.project_name}`,
        amount: billingAmount,
        type: "income",
        category: "project_payment",
        project_name: bc.project_name,
        date: today,
        status: "completed",
      });
    }

    updateMutation.mutate({ id: bc.id, data: updateData });
    queryClient.invalidateQueries({ queryKey: ["receivables"] });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
  };

  const filtered = statusFilter === "all" ? billingCycles : billingCycles.filter(b => b.approval_status === statusFilter);
  const pending = billingCycles.filter(b => b.approval_status === "pending");
  const totalBilled = billingCycles.filter(b => b.approval_status === "approved").reduce((s, b) => s + (b.net_billing_amount || b.billing_amount || 0), 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Billing Cycles</h1>
          <p className="text-muted-foreground mt-1">
            {pending.length} pending approval · ₱{totalBilled.toLocaleString()} total approved & billed
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Billing
          </Button>
        </div>
      </div>

      {/* Summary */}
      {pending.length > 0 && (
        <div className="bg-chart-3/10 border border-chart-3/20 rounded-2xl p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-chart-3 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-chart-3">{pending.length} Billing Cycle{pending.length !== 1 ? "s" : ""} Pending Approval</p>
            <p className="text-xs text-chart-3/80">Review and approve to generate receivables</p>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="text-center py-12 text-muted-foreground">No billing cycles yet</p>
        )}
        {filtered.map((bc) => {
          const StatusIcon = statusIcons[bc.approval_status] || Clock;
          return (
            <div key={bc.id} className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    <h3 className="font-semibold text-foreground">{bc.project_name}</h3>
                    {bc.billing_number && <span className="text-xs font-mono text-muted-foreground">{bc.billing_number}</span>}
                    <Badge variant="outline" className={`text-xs ${statusStyles[bc.approval_status] || ""}`}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {(bc.approval_status || "pending")}
                    </Badge>
                    {bc.receivable_id && (
                      <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20">
                        <FileText className="w-3 h-3 mr-1" /> Receivable Created
                      </Badge>
                    )}
                  </div>

                  <p className="text-sm text-foreground">Client: <span className="font-medium">{bc.client_name}</span></p>
                  {bc.period_label && <p className="text-sm text-muted-foreground">Period: {bc.period_label}</p>}
                  {bc.description && <p className="text-sm text-muted-foreground mt-1">{bc.description}</p>}

                  <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                    <span>Accomplishment: <span className="font-semibold text-foreground">{bc.accomplishment_percentage}%</span></span>
                    {bc.cumulative_percentage && <span>Cumulative: <span className="font-semibold">{bc.cumulative_percentage}%</span></span>}
                    {bc.retention_rate > 0 && <span>Retention ({bc.retention_rate}%): <span className="text-chart-3 font-semibold">-₱{(bc.retention_amount || 0).toLocaleString()}</span></span>}
                    {bc.due_date && <span>Due: {format(new Date(bc.due_date), "MMM d, yyyy")}</span>}
                    {bc.prepared_by && <span>Prepared by: {bc.prepared_by}</span>}
                    {bc.approved_by && <span>Approved by: {bc.approved_by}</span>}
                  </div>

                  {/* Billing breakdown */}
                  <div className="mt-3 flex flex-wrap gap-3">
                    <div className="bg-muted/40 rounded-lg px-3 py-1.5 text-xs">
                      <span className="text-muted-foreground">Gross Billing: </span>
                      <span className="font-semibold">₱{(bc.billing_amount || 0).toLocaleString()}</span>
                    </div>
                    {bc.retention_amount > 0 && (
                      <div className="bg-chart-3/10 rounded-lg px-3 py-1.5 text-xs">
                        <span className="text-chart-3">Retention: </span>
                        <span className="font-semibold text-chart-3">-₱{(bc.retention_amount || 0).toLocaleString()}</span>
                      </div>
                    )}
                    <div className="bg-primary/10 rounded-lg px-3 py-1.5 text-xs">
                      <span className="text-primary">Net Billing: </span>
                      <span className="font-semibold text-primary">₱{(bc.net_billing_amount || bc.billing_amount || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Approval notes */}
                  {bc.approval_notes && (
                    <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-border pl-2">{bc.approval_notes}</p>
                  )}

                  {/* History toggle */}
                  {bc.approval_history?.length > 0 && (
                    <button
                      onClick={() => setExpandedHistory(expandedHistory === bc.id ? null : bc.id)}
                      className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <History className="w-3.5 h-3.5" />
                      {bc.approval_history.length} history record{bc.approval_history.length !== 1 ? "s" : ""}
                      {expandedHistory === bc.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                  )}
                  {expandedHistory === bc.id && (
                    <div className="mt-3 p-3 bg-muted/30 rounded-xl border border-border space-y-2">
                      {bc.approval_history.map((h, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${h.action === "approved" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                            {h.action}
                          </span>
                          <span className="text-foreground font-medium">{h.actor}</span>
                          {h.notes && <span className="text-muted-foreground">— {h.notes}</span>}
                          <span className="ml-auto text-muted-foreground">{h.timestamp ? format(new Date(h.timestamp), "MMM d, HH:mm") : ""}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-3">
                  <p className="text-xl font-bold text-foreground">₱{(bc.net_billing_amount || bc.billing_amount || 0).toLocaleString()}</p>
                  <div className="flex gap-1">
                    {bc.approval_status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => setReviewBC(bc)}>
                        Review
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => setEditingBC(bc)} className="text-muted-foreground hover:text-foreground">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(bc.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <BillingCycleFormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title="New Billing Cycle"
        onSubmit={(data) => createMutation.mutateAsync(data)}
      />
      <BillingCycleFormDialog
        open={!!editingBC}
        onOpenChange={(v) => { if (!v) setEditingBC(null); }}
        title="Edit Billing Cycle"
        initialData={editingBC || {}}
        onSubmit={(data) => updateMutation.mutateAsync({ id: editingBC.id, data })}
      />
      {reviewBC && (
        <BillingApprovalDialog
          open={!!reviewBC}
          onOpenChange={(v) => { if (!v) setReviewBC(null); }}
          billingCycle={reviewBC}
          onDecision={(decision) => handleDecision(reviewBC, decision)}
        />
      )}
    </div>
  );
}