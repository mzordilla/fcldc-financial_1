import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import LeaseCollectionReceivablesTable from "./LeaseCollectionReceivablesTable";
import LeaseCollectionAgingSummary from "./LeaseCollectionAgingSummary";
import LeaseCollectionDetailsDialog from "./LeaseCollectionDetailsDialog";

const fmt = (n) => `₱${Number(n || 0).toLocaleString()}`;

function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = -6; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = format(d, "yyyy-MM");
    options.push({ value, label: format(d, "MMM yyyy") });
  }
  return options;
}

export default function LeaseCollectionTracker() {
  const queryClient = useQueryClient();
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [clientGroups, setClientGroups] = useState([]);

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => base44.entities.Tenant.list("-created_date", 200),
  });

  const { data: collections = [] } = useQuery({
    queryKey: ["lease-collections"],
    queryFn: () => base44.entities.LeaseCollection.list("-month", 1000),
  });

  const activeTenants = tenants.filter((t) => t.status === "active");

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LeaseCollection.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lease-collections"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LeaseCollection.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lease-collections"] }),
  });

  // Ensure a LeaseCollection record exists for each active tenant for every visible month
  useEffect(() => {
    activeTenants.forEach((t) => {
      const leaseStartMonth = t.lease_start ? format(new Date(t.lease_start), "yyyy-MM") : null;
      monthOptions.forEach((m) => {
        if (leaseStartMonth && m.value < leaseStartMonth) return;
        const existing = collections.find((c) => c.tenant_id === t.id && c.month === m.value);
        const rentAmount = t.monthly_rent || 0;
        const associationDues = t.association_dues || 0;
        const expectedAmount = rentAmount + associationDues;
        if (!existing) {
          createMutation.mutate({
            tenant_id: t.id,
            tenant_name: t.full_name,
            unit_number: t.unit_number,
            building: t.building,
            month: m.value,
            rent_amount: rentAmount,
            association_dues: associationDues,
            amount: expectedAmount,
            collected: false,
          });
        } else if (!existing.billing_cycle_id && (existing.amount !== expectedAmount || existing.association_dues !== associationDues)) {
          updateMutation.mutate({ id: existing.id, data: { rent_amount: rentAmount, association_dues: associationDues, amount: expectedAmount } });
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTenants.length, collections.length, tenants]);

  const [detailsDialog, setDetailsDialog] = useState(null); // { tenant, month, record }

  const syncReceivable = async (record, collected, form = {}) => {
    if (!record?.receivable_id) return;
    const receivable = await base44.entities.Receivable.get(record.receivable_id);
    const priorHistory = receivable.payment_history || [];
    const isUndeposited = form.bank_account_id === "undeposited";
    const paymentHistory = collected
      ? [...priorHistory, { collection_date: form.collected_date, amount: record.amount || 0, bank_account_id: isUndeposited ? "" : (form.bank_account_id || ""), undeposited: isUndeposited, reference: form.reference || "", notes: "Recorded from Lease Collections" }]
      : priorHistory.filter((entry) => entry.notes !== "Recorded from Lease Collections");
    await base44.entities.Receivable.update(receivable.id, {
      amount_paid: collected ? receivable.amount : 0,
      status: collected ? "paid" : "outstanding",
      payment_history: paymentHistory,
    });
    queryClient.invalidateQueries({ queryKey: ["receivables"] });
  };

  const postBankCollection = async (record, form) => {
    if (form.bank_account_id === "undeposited") return;
    const transaction = await base44.entities.Transaction.create({
      description: `Lease collection — ${record.tenant_name} · ${record.unit_number || "Unit"} · ${record.month}${form.reference ? ` · ${form.reference}` : ""}`,
      amount: record.amount || 0,
      type: "income",
      category: "project_payment",
      chart_of_account: "Cash and Cash Equivalents",
      bank_account_id: form.bank_account_id,
      date: form.collected_date,
      status: "completed",
    });
    await base44.entities.LeaseCollection.update(record.id, {
      bank_account_id: form.bank_account_id,
      bank_transaction_id: transaction.id,
    });
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["bankaccounts"] });
  };

  const removeBankCollection = async (record) => {
    if (record.bank_transaction_id) await base44.entities.Transaction.delete(record.bank_transaction_id);
    queryClient.invalidateQueries({ queryKey: ["transactions"] });
    queryClient.invalidateQueries({ queryKey: ["bankaccounts"] });
  };

  const handleCellClick = (tenant, month, record) => {
    setDetailsDialog({ tenant, month, record });
  };

  const handleMarkCollected = async (tenant, month, record, form) => {
    const details = {
      collected: true,
      collected_date: form.collected_date,
      payment_method: form.payment_method,
      reference: form.reference,
      notes: form.notes,
    };
    let savedRecord;
    if (record) {
      savedRecord = await updateMutation.mutateAsync({ id: record.id, data: details });
      await syncReceivable(record, true, form);
    } else {
      savedRecord = await createMutation.mutateAsync({
        tenant_id: tenant.id,
        tenant_name: tenant.full_name,
        unit_number: tenant.unit_number,
        building: tenant.building,
        month,
        rent_amount: tenant.monthly_rent || 0,
        association_dues: tenant.association_dues || 0,
        amount: (tenant.monthly_rent || 0) + (tenant.association_dues || 0),
        ...details,
      });
    }
    await postBankCollection(savedRecord, form);
    setDetailsDialog(null);
  };

  const handleUndo = async (tenant, month, record) => {
    await removeBankCollection(record);
    await updateMutation.mutateAsync({
      id: record.id,
      data: { collected: false, collected_date: "", payment_method: "", reference: "", notes: "", bank_account_id: "", bank_transaction_id: "" },
    });
    await syncReceivable(record, false);
    setDetailsDialog(null);
  };

  const [groupDialog, setGroupDialog] = useState(null); // { tenants, month, records }

  const handleGroupCellClick = (tenants, month, records) => {
    setGroupDialog({ tenants, month, records });
  };

  const handleMarkGroupCollected = async (tenants, month, records, form) => {
    const details = {
      collected: true,
      collected_date: form.collected_date,
      payment_method: form.payment_method,
      reference: form.reference,
      notes: form.notes,
    };
    await Promise.all(tenants.map(async (t, i) => {
      const record = records[i];
      if (record?.collected) return;
      let savedRecord;
      if (record) {
        savedRecord = await updateMutation.mutateAsync({ id: record.id, data: details });
        await syncReceivable(record, true, form);
      } else {
        savedRecord = await createMutation.mutateAsync({
          tenant_id: t.id,
          tenant_name: t.full_name,
          unit_number: t.unit_number,
          building: t.building,
          month,
          rent_amount: t.monthly_rent || 0,
          association_dues: t.association_dues || 0,
          amount: (t.monthly_rent || 0) + (t.association_dues || 0),
          ...details,
        });
      }
      await postBankCollection(savedRecord, form);
    }));
    setGroupDialog(null);
  };

  const handleUndoGroup = async (tenants, month, records) => {
    await Promise.all(records.filter(Boolean).map(async (record) => {
      await removeBankCollection(record);
      await updateMutation.mutateAsync({
        id: record.id,
        data: { collected: false, collected_date: "", payment_method: "", reference: "", notes: "", bank_account_id: "", bank_transaction_id: "" },
      });
      await syncReceivable(record, false);
    }));
    setGroupDialog(null);
  };

  const totalBilled = collections.reduce((sum, record) => sum + (record.amount || 0), 0);
  const totalCollected = collections.filter((record) => record.collected).reduce((sum, record) => sum + (record.amount || 0), 0);
  const totalOutstanding = clientGroups.reduce((sum, group) => sum + group.total, 0);
  const overdueCount = clientGroups.flatMap((group) => group.rows).filter((row) => row.balance > 0 && row.month < format(new Date(), "yyyy-MM")).length;
  const collectionEfficiency = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Lease Receivables</h2>
        <p className="text-muted-foreground mt-1">{fmt(totalOutstanding)} outstanding · {overdueCount} overdue · {collectionEfficiency.toFixed(1)}% collection efficiency</p>
      </div>

      <LeaseCollectionAgingSummary groups={clientGroups} />

      <LeaseCollectionReceivablesTable
        tenants={activeTenants}
        monthOptions={monthOptions}
        collections={collections}
        onCellClick={handleCellClick}
        onGroupCellClick={handleGroupCellClick}
        onGroupsChange={setClientGroups}
      />

      <LeaseCollectionDetailsDialog
        open={!!detailsDialog}
        onOpenChange={(open) => !open && setDetailsDialog(null)}
        tenant={detailsDialog?.tenant}
        month={detailsDialog?.month}
        monthLabel={monthOptions.find((m) => m.value === detailsDialog?.month)?.label}
        record={detailsDialog?.record}
        onMarkCollected={handleMarkCollected}
        onUndo={handleUndo}
      />

      <LeaseCollectionDetailsDialog
        open={!!groupDialog}
        onOpenChange={(open) => !open && setGroupDialog(null)}
        tenants={groupDialog?.tenants}
        month={groupDialog?.month}
        monthLabel={monthOptions.find((m) => m.value === groupDialog?.month)?.label}
        records={groupDialog?.records}
        onMarkGroupCollected={handleMarkGroupCollected}
        onUndoGroup={handleUndoGroup}
      />
    </div>
  );
}