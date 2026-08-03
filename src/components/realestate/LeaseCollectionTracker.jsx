import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { TrendingUp } from "lucide-react";
import { format } from "date-fns";
import LeaseCollectionMatrixTable from "./LeaseCollectionMatrixTable";
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
  const currentMonth = format(new Date(), "yyyy-MM");

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
        const exists = collections.some((c) => c.tenant_id === t.id && c.month === m.value);
        if (!exists) {
          createMutation.mutate({
            tenant_id: t.id,
            tenant_name: t.full_name,
            unit_number: t.unit_number,
            building: t.building,
            month: m.value,
            amount: t.monthly_rent || 0,
            collected: false,
          });
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTenants.length, collections.length]);

  const [detailsDialog, setDetailsDialog] = useState(null); // { tenant, month, record }

  const syncReceivable = async (record, collected, form = {}) => {
    if (!record?.receivable_id) return;
    const receivable = await base44.entities.Receivable.get(record.receivable_id);
    const priorHistory = receivable.payment_history || [];
    const paymentHistory = collected
      ? [...priorHistory, { collection_date: form.collected_date, amount: record.amount || 0, reference: form.reference || "", notes: "Recorded from Lease Collections" }]
      : priorHistory.filter((entry) => entry.notes !== "Recorded from Lease Collections");
    await base44.entities.Receivable.update(receivable.id, {
      amount_paid: collected ? receivable.amount : 0,
      status: collected ? "paid" : "outstanding",
      payment_history: paymentHistory,
    });
    queryClient.invalidateQueries({ queryKey: ["receivables"] });
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
    if (record) {
      await updateMutation.mutateAsync({ id: record.id, data: details });
      await syncReceivable(record, true, form);
    } else {
      await createMutation.mutateAsync({
        tenant_id: tenant.id,
        tenant_name: tenant.full_name,
        unit_number: tenant.unit_number,
        building: tenant.building,
        month,
        amount: tenant.monthly_rent || 0,
        ...details,
      });
    }
    setDetailsDialog(null);
  };

  const handleUndo = async (tenant, month, record) => {
    await updateMutation.mutateAsync({
      id: record.id,
      data: { collected: false, collected_date: "", payment_method: "", reference: "", notes: "" },
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
      if (record) {
        await updateMutation.mutateAsync({ id: record.id, data: details });
        await syncReceivable(record, true, form);
      } else {
        await createMutation.mutateAsync({
          tenant_id: t.id,
          tenant_name: t.full_name,
          unit_number: t.unit_number,
          building: t.building,
          month,
          amount: t.monthly_rent || 0,
          ...details,
        });
      }
    }));
    setGroupDialog(null);
  };

  const handleUndoGroup = async (tenants, month, records) => {
    await Promise.all(records.filter(Boolean).map(async (record) => {
      await updateMutation.mutateAsync({
        id: record.id,
        data: { collected: false, collected_date: "", payment_method: "", reference: "", notes: "" },
      });
      await syncReceivable(record, false);
    }));
    setGroupDialog(null);
  };

  const currentMonthRecords = collections.filter((c) => c.month === currentMonth);
  const monthCollected = currentMonthRecords.filter((r) => r.collected).reduce((s, r) => s + (r.amount || 0), 0);
  const monthExpected = currentMonthRecords.reduce((s, r) => s + (r.amount || 0), 0);
  const totalAccumulated = collections.filter((r) => r.collected).reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">This Month Collected</p>
          <p className="text-xl font-bold text-primary">{fmt(monthCollected)}</p>
          <p className="text-xs text-muted-foreground mt-1">of {fmt(monthExpected)} expected</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Collection Rate</p>
          <p className="text-xl font-bold text-foreground">
            {monthExpected > 0 ? Math.round((monthCollected / monthExpected) * 100) : 0}%
          </p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
          <div className="p-2 bg-muted rounded-lg">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Accumulated Revenue</p>
            <p className="text-xl font-bold text-primary">{fmt(totalAccumulated)}</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h3 className="font-semibold text-foreground mb-4">Monthly Lease Collection — Per Client</h3>
        <LeaseCollectionMatrixTable
          tenants={activeTenants}
          monthOptions={monthOptions}
          collections={collections}
          onCellClick={handleCellClick}
          onGroupCellClick={handleGroupCellClick}
        />
      </div>

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