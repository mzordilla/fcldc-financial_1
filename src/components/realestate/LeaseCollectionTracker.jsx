import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, Circle, TrendingUp } from "lucide-react";
import { format } from "date-fns";

const fmt = (n) => `₱${Number(n || 0).toLocaleString()}`;

function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = -6; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = format(d, "yyyy-MM");
    options.push({ value, label: format(d, "MMMM yyyy") });
  }
  return options;
}

export default function LeaseCollectionTracker() {
  const queryClient = useQueryClient();
  const monthOptions = useMemo(() => getMonthOptions(), []);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => base44.entities.Tenant.list("-created_date", 200),
  });

  const { data: collections = [] } = useQuery({
    queryKey: ["lease-collections"],
    queryFn: () => base44.entities.LeaseCollection.list("-month", 1000),
  });

  const activeTenants = tenants.filter((t) => t.status === "active");

  const monthRecords = collections.filter((c) => c.month === selectedMonth);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.LeaseCollection.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lease-collections"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LeaseCollection.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lease-collections"] }),
  });

  // Ensure a LeaseCollection record exists for each active tenant for the selected month
  useEffect(() => {
    activeTenants.forEach((t) => {
      const exists = collections.some((c) => c.tenant_id === t.id && c.month === selectedMonth);
      if (!exists) {
        createMutation.mutate({
          tenant_id: t.id,
          tenant_name: t.full_name,
          unit_number: t.unit_number,
          building: t.building,
          month: selectedMonth,
          amount: t.monthly_rent || 0,
          collected: false,
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth, activeTenants.length, collections.length]);

  const toggleCollected = (record) => {
    updateMutation.mutate({
      id: record.id,
      data: {
        collected: !record.collected,
        collected_date: !record.collected ? format(new Date(), "yyyy-MM-dd") : "",
      },
    });
  };

  const monthCollected = monthRecords.filter((r) => r.collected).reduce((s, r) => s + (r.amount || 0), 0);
  const monthExpected = monthRecords.reduce((s, r) => s + (r.amount || 0), 0);
  const totalAccumulated = collections.filter((r) => r.collected).reduce((s, r) => s + (r.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Selected Month Collected</p>
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">Monthly Lease Collection</h3>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-sm border border-input rounded-md px-3 py-1.5 bg-transparent"
          >
            {monthOptions.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          {monthRecords.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No active tenants for this month</p>
          )}
          {monthRecords.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 border-b border-border last:border-0 py-2"
            >
              <div>
                <p className="text-sm font-medium text-foreground">{r.tenant_name}</p>
                <p className="text-xs text-muted-foreground">
                  {r.unit_number}{r.building ? ` · ${r.building}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-foreground">{fmt(r.amount)}</span>
                <button
                  onClick={() => toggleCollected(r)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                    r.collected
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {r.collected ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />}
                  {r.collected ? "Collected" : "Not Collected"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}