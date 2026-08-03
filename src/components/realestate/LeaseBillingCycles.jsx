import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import LeaseBillingCycleFormDialog from "@/components/realestate/LeaseBillingCycleFormDialog";
import LeaseBillingCycleTable from "@/components/realestate/LeaseBillingCycleTable";

export default function LeaseBillingCycles() {
  const queryClient = useQueryClient();
  const [formCycle, setFormCycle] = useState(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [error, setError] = useState("");
  const { data: cycles = [], isLoading } = useQuery({ queryKey: ["lease-billing-cycles"], queryFn: () => base44.entities.LeaseBillingCycle.list("-created_date", 500) });
  const { data: currentUser } = useQuery({ queryKey: ["current-user"], queryFn: () => base44.auth.me() });
  const refresh = () => { queryClient.invalidateQueries({ queryKey: ["lease-billing-cycles"] }); queryClient.invalidateQueries({ queryKey: ["lease-collections"] }); queryClient.invalidateQueries({ queryKey: ["receivables"] }); queryClient.invalidateQueries({ queryKey: ["transactions"] }); };
  const saveMutation = useMutation({ mutationFn: ({ id, data }) => id ? base44.entities.LeaseBillingCycle.update(id, data) : base44.entities.LeaseBillingCycle.create(data), onSuccess: refresh });
  const deleteMutation = useMutation({ mutationFn: (id) => base44.entities.LeaseBillingCycle.delete(id), onSuccess: refresh });
  const decisionMutation = useMutation({ mutationFn: async ({ cycle, action }) => {
    const actor = currentUser?.full_name || currentUser?.email || "Administrator";
    const history = [...(cycle.approval_history || []), { action, actor, timestamp: new Date().toISOString() }];
    if (action === "rejected") return base44.entities.LeaseBillingCycle.update(cycle.id, { approval_status: action, approved_by: actor, approval_history: history });
    const receivable = await base44.entities.Receivable.create({ client_name: cycle.tenant_name, project_name: `${cycle.unit_number || "Unit"} Lease`, invoice_number: cycle.billing_number || "", amount: cycle.billing_amount || 0, amount_paid: 0, due_date: cycle.due_date, status: "outstanding", notes: `Lease billing for ${cycle.period_month}${cycle.building ? ` · ${cycle.building}` : ""}` });
    const existing = await base44.entities.LeaseCollection.filter({ tenant_id: cycle.tenant_id, month: cycle.period_month }, "-created_date", 1);
    const collectionData = { tenant_id: cycle.tenant_id, tenant_name: cycle.tenant_name, unit_number: cycle.unit_number, building: cycle.building, month: cycle.period_month, amount: cycle.billing_amount || 0, billing_cycle_id: cycle.id, receivable_id: receivable.id };
    const collection = existing[0] ? await base44.entities.LeaseCollection.update(existing[0].id, collectionData) : await base44.entities.LeaseCollection.create({ ...collectionData, collected: false });
    await base44.entities.Transaction.create({ description: `Lease income recognized — ${cycle.tenant_name} (${cycle.period_month})`, amount: cycle.billing_amount || 0, type: "income", category: "other", chart_of_account: "Lease Income", project_code: cycle.unit_number || "", date: cycle.period_end || cycle.due_date, status: "completed" });
    return base44.entities.LeaseBillingCycle.update(cycle.id, { approval_status: "approved", approved_by: actor, approval_history: history, receivable_id: receivable.id, lease_collection_id: collection.id });
  }, onSuccess: refresh, onError: (err) => setError(err?.message || "Unable to process this lease billing.") });

  const approvedTotal = cycles.filter((cycle) => cycle.approval_status === "approved").reduce((sum, cycle) => sum + (cycle.billing_amount || 0), 0);
  return <div className="space-y-5"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Lease Billing Cycles</h2><p className="text-sm text-muted-foreground">₱{approvedTotal.toLocaleString()} approved lease receivables</p></div><Button onClick={() => { setFormCycle(undefined); setFormOpen(true); }}><Plus className="w-4 h-4" /> New Lease Billing</Button></div>
    {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <LeaseBillingCycleTable cycles={cycles} loading={isLoading} processing={decisionMutation.isPending} onEdit={(cycle) => { setFormCycle(cycle); setFormOpen(true); }} onDelete={(id) => deleteMutation.mutate(id)} onApprove={(cycle) => decisionMutation.mutate({ cycle, action: "approved" })} onReject={(cycle) => decisionMutation.mutate({ cycle, action: "rejected" })} />
    <LeaseBillingCycleFormDialog open={formOpen} onOpenChange={setFormOpen} initialData={formCycle} onSubmit={(data) => saveMutation.mutateAsync({ id: formCycle?.id, data })} />
  </div>;
}