import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, UserRound } from "lucide-react";
import AddFormDialog from "@/components/shared/AddFormDialog";

const employeeFields = [
  { name: "full_name", label: "Full Name", required: true },
  { name: "employee_code", label: "Employee Code" },
  { name: "department", label: "Department" },
  { name: "position", label: "Position" },
  { name: "employment_type", label: "Employment Type", type: "select", options: [
    { value: "regular", label: "Regular" }, { value: "contractual", label: "Contractual" }, { value: "project_based", label: "Project-Based" },
  ]},
  { name: "salary_type", label: "Salary Type", type: "select", options: [
    { value: "monthly", label: "Monthly" }, { value: "daily", label: "Daily" }, { value: "hourly", label: "Hourly" },
  ]},
  { name: "basic_rate", label: "Basic Rate", type: "number" },
  { name: "default_project_code", label: "Default Project Code" },
  { name: "default_project_name", label: "Default Project Name" },
  { name: "date_hired", label: "Date Hired", type: "date" },
  { name: "bank_account_number", label: "Bank Account Number" },
  { name: "tin_number", label: "TIN" },
  { name: "sss_number", label: "SSS Number" },
  { name: "philhealth_number", label: "PhilHealth Number" },
  { name: "pagibig_number", label: "Pag-IBIG Number" },
  { name: "status", label: "Status", type: "select", options: [
    { value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }, { value: "terminated", label: "Terminated" },
  ]},
  { name: "notes", label: "Notes", type: "textarea" },
];

const statusColors = { active: "bg-primary/10 text-primary", inactive: "bg-muted text-muted-foreground", terminated: "bg-destructive/10 text-destructive" };

export default function EmployeesTab() {
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Employee.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Employee.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Employee.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">{employees.length} employees</h2>
        <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-2" /> Add Employee</Button>
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Employee</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Department</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Position</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Type</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Rate</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Status</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 && (
                <tr><td colSpan={7} className="text-center py-16">
                  <UserRound className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">No employees yet. Add your first employee.</p>
                </td></tr>
              )}
              {employees.map((e) => (
                <tr key={e.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-foreground">{e.full_name}</p>
                    {e.employee_code && <p className="text-xs text-muted-foreground">{e.employee_code}</p>}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{e.department || "—"}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{e.position || "—"}</td>
                  <td className="px-4 py-3 hidden sm:table-cell"><Badge variant="secondary" className="text-xs capitalize">{(e.employment_type || "regular").replace("_", " ")}</Badge></td>
                  <td className="px-4 py-3 text-sm text-foreground">₱{(e.basic_rate || 0).toLocaleString()} <span className="text-xs text-muted-foreground">/{e.salary_type || "monthly"}</span></td>
                  <td className="px-4 py-3"><Badge className={`text-xs ${statusColors[e.status] || ""}`} variant="outline">{e.status || "active"}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setEditing(e)} className="text-muted-foreground hover:text-foreground transition-colors"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => deleteMutation.mutate(e.id)} className="text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AddFormDialog open={showAdd} onOpenChange={setShowAdd} title="Add Employee" fields={employeeFields} onSubmit={(data) => createMutation.mutateAsync(data)} />
      <AddFormDialog open={!!editing} onOpenChange={(v) => { if (!v) setEditing(null); }} title="Edit Employee" fields={employeeFields} initialData={editing || {}} onSubmit={(data) => updateMutation.mutateAsync({ id: editing.id, data })} />
    </div>
  );
}