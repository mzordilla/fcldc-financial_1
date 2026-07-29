import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Plus, Trash2, Pencil, CheckCircle, XCircle, Clock, FileText, ChevronDown, ChevronRight, ChevronUp, History } from "lucide-react";
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
  const [expandedClients, setExpandedClients] = useState({});
  const queryClient = useQueryClient();

  const toggleClient = (client) => setExpandedClients(prev => ({ ...prev, [client]: !prev[client] }));

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

    // If approved: create Receivable AND immediately recognize income in P&L (accrual basis)
    if (action === "approved") {
      // Retention held is still earned income (just collected later) — recognize the FULL gross billing as income
      const grossBillingAmount = bc.billing_amount || 0;
      // The receivable is only for the net cash currently due (retention portion isn't collectible yet)
      const netBillingAmount = bc.net_billing_amount || bc.billing_amount || 0;
      const today = new Date().toISOString().split("T")[0];

      // 1. Create Accounts Receivable record (net amount currently due)
      const receivable = await base44.entities.Receivable.create({
        client_name: bc.client_name,
        project_name: bc.project_name,
        invoice_number: bc.billing_number || "",
        amount: netBillingAmount,
        amount_paid: 0,
        due_date: bc.due_date || today,
        status: "outstanding",
        notes: `Auto-created from Billing Cycle: ${bc.billing_number || ""} — ${bc.period_label || ""} (${bc.accomplishment_percentage}% accomplishment)`,
      });
      updateData.receivable_id = receivable.id;

      // 2. Immediately recognize income in P&L (accrual basis — full gross billing, since retention held is part of income earned on this billing)
      await base44.entities.Transaction.create({
        description: `Income recognized — ${bc.client_name}${bc.billing_number ? ` (${bc.billing_number})` : ""}${bc.period_label ? ` · ${bc.period_label}` : ""}`,
        amount: grossBillingAmount,
        type: "income",
        category: "project_payment",
        project_name: bc.project_name || "",
        date: bc.period_end || bc.period_start || bc.due_date || today,
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

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
        {!isLoading && filtered.length === 0 && (
          <p className="text-center py-12 text-muted-foreground">No billing cycles yet</p>
        )}
        {!isLoading && filtered.length > 0 && (() => {
          const clientMap = {};
          filtered.forEach(bc => {
            const key = bc.client_name || "Unknown";
            if (!clientMap[key]) clientMap[key] = [];
            clientMap[key].push(bc);
          });
          const clients = Object.keys(clientMap).sort();

          return (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="px-3 py-2 w-6"></th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Billing # / Client</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Project</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Period</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Due Date</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">Accmpl %</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">Gross</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">Retention</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">Net Billing</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map(clientName => {
                    const rows = clientMap[clientName];
                    const totalGross = rows.reduce((s, b) => s + (b.billing_amount || 0), 0);
                    const totalRetention = rows.reduce((s, b) => s + (b.retention_amount || 0), 0);
                    const totalNet = rows.reduce((s, b) => s + (b.net_billing_amount || b.billing_amount || 0), 0);
                    const hasPending = rows.some(b => b.approval_status === "pending");
                    const isExpanded = expandedClients[clientName] !== false;

                    return (
                      <>
                        {/* Client summary row */}
                        <tr
                          key={`client-${clientName}`}
                          className="bg-muted/40 border-t border-border cursor-pointer hover:bg-muted/60 transition-colors"
                          onClick={() => toggleClient(clientName)}
                        >
                          <td className="px-3 py-2 text-muted-foreground">
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </td>
                          <td className="px-3 py-2 font-semibold text-sm text-foreground" colSpan={2}>
                            {clientName}
                            <span className="ml-2 text-xs text-muted-foreground font-normal">{rows.length} billing{rows.length !== 1 ? "s" : ""}</span>
                            {hasPending && <span className="ml-2 text-xs text-chart-3 font-medium">· pending</span>}
                          </td>
                          <td className="px-3 py-2" colSpan={3}></td>
                          <td className="px-3 py-2 text-right text-sm font-mono font-semibold">₱{totalGross.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-sm font-mono font-semibold text-chart-3">
                            {totalRetention > 0 ? `-₱${totalRetention.toLocaleString()}` : "—"}
                          </td>
                          <td className="px-3 py-2 text-right text-sm font-mono font-bold text-primary">₱{totalNet.toLocaleString()}</td>
                          <td colSpan={2}></td>
                        </tr>
                        {/* Detail rows */}
                        {isExpanded && rows.map(bc => {
                          const StatusIcon = statusIcons[bc.approval_status] || Clock;
                          const netBilling = bc.net_billing_amount || bc.billing_amount || 0;
                          return (
                            <>
                              <tr key={bc.id} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                                <td className="px-3 py-1.5"></td>
                                <td className="px-3 py-1.5 text-xs font-mono text-muted-foreground pl-6">
                                  <div className="flex items-center gap-1.5">
                                    {bc.billing_number || "—"}
                                    {bc.receivable_id && <FileText className="w-3 h-3 text-primary" title="Receivable Created" />}
                                  </div>
                                </td>
                                <td className="px-3 py-1.5 text-xs text-foreground">{bc.project_name || "—"}</td>
                                <td className="px-3 py-1.5 text-xs text-muted-foreground">{bc.period_label || "—"}</td>
                                <td className="px-3 py-1.5 text-xs text-muted-foreground whitespace-nowrap">
                                  {bc.due_date ? format(new Date(bc.due_date), "MMM d, yyyy") : "—"}
                                </td>
                                <td className="px-3 py-1.5 text-right text-xs font-semibold">{bc.accomplishment_percentage ?? "—"}%</td>
                                <td className="px-3 py-1.5 text-right text-xs font-mono">₱{(bc.billing_amount || 0).toLocaleString()}</td>
                                <td className="px-3 py-1.5 text-right text-xs font-mono text-chart-3">
                                  {bc.retention_amount > 0 ? `-₱${(bc.retention_amount || 0).toLocaleString()}` : "—"}
                                </td>
                                <td className="px-3 py-1.5 text-right text-xs font-mono font-bold text-primary">₱{netBilling.toLocaleString()}</td>
                                <td className="px-3 py-1.5">
                                  <Badge variant="outline" className={`text-xs ${statusStyles[bc.approval_status] || ""}`}>
                                    <StatusIcon className="w-3 h-3 mr-1" />
                                    {bc.approval_status || "pending"}
                                  </Badge>
                                </td>
                                <td className="px-3 py-1.5">
                                  <div className="flex items-center justify-end gap-1">
                                    {bc.approval_status === "pending" && (
                                      <button onClick={() => setReviewBC(bc)} className="text-xs text-chart-3 hover:text-chart-3/70 font-medium transition-colors">Review</button>
                                    )}
                                    {bc.approval_history?.length > 0 && (
                                      <button onClick={() => setExpandedHistory(expandedHistory === bc.id ? null : bc.id)} className="text-muted-foreground hover:text-foreground transition-colors" title="History">
                                        <History className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <button onClick={() => setEditingBC(bc)} className="text-muted-foreground hover:text-foreground transition-colors">
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => deleteMutation.mutate(bc.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                              {expandedHistory === bc.id && (
                                <tr key={`${bc.id}-history`}>
                                  <td colSpan={11} className="px-6 py-3 bg-muted/20 border-b border-border">
                                    <div className="space-y-1.5">
                                      {bc.approval_history.map((h, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs">
                                          <span className={`px-1.5 py-0.5 rounded font-medium ${h.action === "approved" ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>{h.action}</span>
                                          <span className="text-foreground font-medium">{h.actor}</span>
                                          {h.notes && <span className="text-muted-foreground">— {h.notes}</span>}
                                          <span className="ml-auto text-muted-foreground">{h.timestamp ? format(new Date(h.timestamp), "MMM d, HH:mm") : ""}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </>
                          );
                        })}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
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