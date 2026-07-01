import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, CalendarClock, ArrowRight } from "lucide-react";
import AddFormDialog from "@/components/shared/AddFormDialog";
import { format, parseISO } from "date-fns";

const periodFields = [
  { name: "period_label", label: "Period Label", required: true, placeholder: "e.g. June 1-15, 2026" },
  { name: "period_start", label: "Period Start", type: "date", required: true },
  { name: "period_end", label: "Period End", type: "date", required: true },
  { name: "pay_date", label: "Pay Date", type: "date" },
  { name: "notes", label: "Notes", type: "textarea" },
];

const statusColors = {
  draft: "bg-muted text-muted-foreground",
  processing: "bg-chart-3/10 text-chart-3",
  approved: "bg-chart-2/10 text-chart-2",
  processed: "bg-primary/10 text-primary",
};

export default function PayrollPeriodsTab() {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: periods = [] } = useQuery({
    queryKey: ["payroll-periods"],
    queryFn: () => base44.entities.PayrollPeriod.list("-period_start", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PayrollPeriod.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payroll-periods"] }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PayrollPeriod.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payroll-periods"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{periods.length} payroll periods</h2>
        <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-2" /> Add Payroll Period</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {periods.length === 0 && (
          <div className="col-span-full bg-card border border-border rounded-2xl py-16 text-center">
            <CalendarClock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No payroll periods yet. Create one to start a register.</p>
          </div>
        )}
        {periods.map((p) => (
          <div key={p.id} className="bg-card border border-border rounded-2xl p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{p.period_label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {p.period_start ? format(parseISO(p.period_start), "MMM d") : "—"} – {p.period_end ? format(parseISO(p.period_end), "MMM d, yyyy") : "—"}
                </p>
                {p.pay_date && <p className="text-xs text-muted-foreground">Pay date: {format(parseISO(p.pay_date), "MMM d, yyyy")}</p>}
              </div>
              <Badge className={`text-xs capitalize ${statusColors[p.status] || ""}`} variant="outline">{p.status || "draft"}</Badge>
            </div>
            <div className="flex items-center justify-between mt-4">
              <button onClick={() => setEditing(p)} className="text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-4 h-4" /></button>
              <Button size="sm" variant="outline" onClick={() => navigate(`/payroll/periods/${p.id}`)}>
                Open Register <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <AddFormDialog open={showAdd} onOpenChange={setShowAdd} title="Add Payroll Period" fields={periodFields} onSubmit={(data) => createMutation.mutateAsync(data)} />
      <AddFormDialog open={!!editing} onOpenChange={(v) => { if (!v) setEditing(null); }} title="Edit Payroll Period" fields={periodFields} initialData={editing || {}} onSubmit={(data) => updateMutation.mutateAsync({ id: editing.id, data })} />
    </div>
  );
}