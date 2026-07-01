import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NUM_FIELDS = [
  ["regular_wage", "Regular Wage"], ["overtime_pay", "Overtime Pay"], ["allowances", "Allowances"],
  ["incentives", "Incentives"], ["bonuses", "Bonuses"],
];
const DEDUCTION_FIELDS = [
  ["sss_contribution", "SSS"], ["philhealth_contribution", "PhilHealth"], ["pagibig_contribution", "Pag-IBIG"],
  ["withholding_tax", "Withholding Tax"], ["loan_deduction", "Loan"], ["other_deductions", "Other Deductions"],
];

const emptyForm = { employee_id: "", project_code: "", project_name: "", department: "", chart_of_account: "", regular_wage: 0, overtime_pay: 0, allowances: 0, incentives: 0, bonuses: 0, sss_contribution: 0, philhealth_contribution: 0, pagibig_contribution: 0, withholding_tax: 0, loan_deduction: 0, other_deductions: 0, notes: "" };

export default function PayrollEntryFormDialog({ open, onOpenChange, employees, onSubmit }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const { data: accounts = [] } = useQuery({
    queryKey: ["chart-of-accounts"],
    queryFn: () => base44.entities.ChartOfAccount.filter({ is_active: true }, "account_name", 500),
  });

  useEffect(() => { if (open) setForm(emptyForm); }, [open]);

  const grossPay = useMemo(() => NUM_FIELDS.reduce((s, [k]) => s + (Number(form[k]) || 0), 0), [form]);
  const totalDeductions = useMemo(() => DEDUCTION_FIELDS.reduce((s, [k]) => s + (Number(form[k]) || 0), 0), [form]);
  const netPay = grossPay - totalDeductions;

  const handleEmployeeSelect = (id) => {
    const emp = employees.find((e) => e.id === id);
    setForm((prev) => ({
      ...prev,
      employee_id: id,
      project_code: emp?.default_project_code || "",
      project_name: emp?.default_project_name || "",
      department: emp?.department || "",
      regular_wage: emp?.salary_type === "monthly" ? (emp?.basic_rate || 0) : prev.regular_wage,
    }));
  };

  const setNum = (key, value) => setForm((prev) => ({ ...prev, [key]: value === "" ? "" : parseFloat(value) || 0 }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const emp = employees.find((e2) => e2.id === form.employee_id);
    if (!emp) return;
    setSaving(true);
    await onSubmit({
      ...form,
      employee_name: emp.full_name,
      employee_code: emp.employee_code || "",
      gross_pay: grossPay,
      total_deductions: totalDeductions,
      net_pay: netPay,
    });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Add Payroll Entry</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm">Employee</Label>
            <Select value={form.employee_id} onValueChange={handleEmployeeSelect}>
              <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Project Code</Label>
              <Input value={form.project_code} onChange={(e) => setForm((p) => ({ ...p, project_code: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Project Name</Label>
              <Input value={form.project_name} onChange={(e) => setForm((p) => ({ ...p, project_name: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">Chart of Account</Label>
            <Select value={form.chart_of_account} onValueChange={(val) => setForm((p) => ({ ...p, chart_of_account: val }))}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => <SelectItem key={a.id} value={a.account_name}>{a.account_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Earnings</p>
          <div className="grid grid-cols-2 gap-3">
            {NUM_FIELDS.map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-sm">{label}</Label>
                <Input type="number" step="0.01" value={form[key]} onChange={(e) => setNum(key, e.target.value)} />
              </div>
            ))}
          </div>

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Deductions</p>
          <div className="grid grid-cols-2 gap-3">
            {DEDUCTION_FIELDS.map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-sm">{label}</Label>
                <Input type="number" step="0.01" value={form[key]} onChange={(e) => setNum(key, e.target.value)} />
              </div>
            ))}
          </div>

          <div className="bg-muted/40 rounded-xl p-4 space-y-1.5">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Gross Pay</span><span className="font-medium">₱{grossPay.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Deductions</span><span className="font-medium text-destructive">₱{totalDeductions.toLocaleString()}</span></div>
            <div className="flex justify-between text-sm font-semibold border-t border-border pt-1.5"><span>Net Pay</span><span className="text-primary">₱{netPay.toLocaleString()}</span></div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !form.employee_id}>{saving ? "Saving..." : "Save Entry"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}