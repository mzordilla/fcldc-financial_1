import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, PlayCircle } from "lucide-react";
import PayrollEntryFormDialog from "@/components/payroll/PayrollEntryFormDialog";
import PayrollEntryTable from "@/components/payroll/PayrollEntryTable";
import ProcessPayrollDialog from "@/components/payroll/ProcessPayrollDialog";
import { processPayroll } from "@/lib/payrollProcessing";

const fmt = (v) => `₱${(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function PayrollRegister() {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showProcess, setShowProcess] = useState(false);

  const { data: period } = useQuery({
    queryKey: ["payroll-period", id],
    queryFn: () => base44.entities.PayrollPeriod.get(id),
  });

  const { data: entries = [] } = useQuery({
    queryKey: ["payroll-entries", id],
    queryFn: () => base44.entities.PayrollEntry.filter({ payroll_period_id: id }, "-created_date", 500),
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees", "active"],
    queryFn: () => base44.entities.Employee.filter({ status: "active" }, "full_name", 500),
  });

  const invalidateEntries = () => queryClient.invalidateQueries({ queryKey: ["payroll-entries", id] });

  const createEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.PayrollEntry.create({ ...data, payroll_period_id: id, payroll_period_label: period?.period_label }),
    onSuccess: invalidateEntries,
  });

  const decisionMutation = useMutation({
    mutationFn: ({ entry, status }) => {
      const historyEntry = { action: status, actor: user?.full_name || user?.email, notes: "", timestamp: new Date().toISOString() };
      return base44.entities.PayrollEntry.update(entry.id, { approval_status: status, approval_history: [...(entry.approval_history || []), historyEntry] });
    },
    onSuccess: invalidateEntries,
  });

  const deleteMutation = useMutation({
    mutationFn: (entry) => base44.entities.PayrollEntry.delete(entry.id),
    onSuccess: invalidateEntries,
  });

  const approvedEntries = entries.filter((e) => e.approval_status === "approved");
  const totalGross = entries.reduce((s, e) => s + (e.gross_pay || 0), 0);
  const totalNet = entries.reduce((s, e) => s + (e.net_pay || 0), 0);

  const handleProcess = async () => {
    await processPayroll(period, approvedEntries);
    queryClient.invalidateQueries({ queryKey: ["payroll-entries", id] });
    queryClient.invalidateQueries({ queryKey: ["payroll-period", id] });
    queryClient.invalidateQueries({ queryKey: ["payroll-periods"] });
  };

  if (!period) return <div className="p-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      <Link to="/payroll" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Payroll
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{period.period_label}</h1>
            <Badge variant="outline" className="capitalize">{period.status}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">Payroll register — {entries.length} entries</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-2" /> Add Entry</Button>
          {period.status !== "processed" && (
            <Button onClick={() => setShowProcess(true)} disabled={approvedEntries.length === 0}>
              <PlayCircle className="w-4 h-4 mr-2" /> Process Payroll
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Gross Pay</p>
          <p className="text-2xl font-bold text-foreground">{fmt(totalGross)}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Net Pay</p>
          <p className="text-2xl font-bold text-primary">{fmt(totalNet)}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p className="text-xs text-muted-foreground mb-1">Approved / Total Entries</p>
          <p className="text-2xl font-bold text-foreground">{approvedEntries.length} / {entries.length}</p>
        </div>
      </div>

      <PayrollEntryTable
        entries={entries}
        onApprove={(entry) => decisionMutation.mutate({ entry, status: "approved" })}
        onReject={(entry) => decisionMutation.mutate({ entry, status: "rejected" })}
        onDelete={(entry) => deleteMutation.mutate(entry)}
      />

      <PayrollEntryFormDialog open={showAdd} onOpenChange={setShowAdd} employees={employees} onSubmit={(data) => createEntryMutation.mutateAsync(data)} />
      <ProcessPayrollDialog open={showProcess} onOpenChange={setShowProcess} approvedEntries={approvedEntries} onConfirm={handleProcess} />
    </div>
  );
}