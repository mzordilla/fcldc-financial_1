import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TRANSACTION_CATEGORIES } from "@/lib/transactionCategories";

export default function DrilldownBulkEditTable({ transactions, onSave, isSaving }) {
  const [rows, setRows] = useState(transactions);

  useEffect(() => setRows(transactions), [transactions]);

  const { data: chartOfAccounts = [] } = useQuery({
    queryKey: ["chartofaccounts"],
    queryFn: () => base44.entities.ChartOfAccount.list("account_code", 1000),
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("project_code", 200),
  });

  const setField = (id, field, value) =>
    setRows(prev => prev.map(row => (row.id === id ? { ...row, [field]: value } : row)));

  const changed = rows.filter(row => {
    const original = transactions.find(t => t.id === row.id);
    return original && ["description", "date", "amount", "category", "chart_of_account", "project_code"].some(f => row[f] !== original[f]);
  });

  return (
    <div className="space-y-3">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 pr-2">Date</th>
            <th className="py-2 pr-2">Description</th>
            <th className="py-2 pr-2">Category</th>
            <th className="py-2 pr-2">Chart of Account</th>
            <th className="py-2 pr-2">Project</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.id} className="border-b border-border/30">
              <td className="py-1.5 pr-2">
                <Input type="date" className="h-8 w-36 text-xs" value={row.date || ""} onChange={e => setField(row.id, "date", e.target.value)} />
              </td>
              <td className="py-1.5 pr-2">
                <Input className="h-8 text-xs" value={row.description || ""} onChange={e => setField(row.id, "description", e.target.value)} />
              </td>
              <td className="py-1.5 pr-2">
                <Select value={row.category || ""} onValueChange={v => setField(row.id, "category", v)}>
                  <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    {TRANSACTION_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </td>
              <td className="py-1.5 pr-2">
                <Select value={row.chart_of_account || ""} onValueChange={v => setField(row.id, "chart_of_account", v)}>
                  <SelectTrigger className="h-8 w-48 text-xs"><SelectValue placeholder="Account" /></SelectTrigger>
                  <SelectContent>
                    {chartOfAccounts.map(a => <SelectItem key={a.id} value={a.account_name}>{a.account_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </td>
              <td className="py-1.5 pr-2">
                <Select value={row.project_code || ""} onValueChange={v => setField(row.id, "project_code", v)}>
                  <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Project" /></SelectTrigger>
                  <SelectContent>
                    {projects.filter(p => p.project_code).map(p => <SelectItem key={p.id} value={p.project_code}>{p.project_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </td>
              <td className="py-1.5">
                <Input type="number" step="0.01" className="h-8 w-32 text-xs text-right" value={row.amount ?? ""} onChange={e => setField(row.id, "amount", parseFloat(e.target.value) || 0)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <Button disabled={changed.length === 0 || isSaving} onClick={() => onSave(changed)}>
          {isSaving ? "Saving…" : `Save ${changed.length || ""} change${changed.length === 1 ? "" : "s"}`}
        </Button>
      </div>
    </div>
  );
}