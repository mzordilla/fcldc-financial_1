import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { printChecks } from "@/lib/checkUtils";

export default function useCheckWriter() {
  const queryClient = useQueryClient(); const [selected, setSelected] = useState(new Set());
  const { data: bankAccounts = [] } = useQuery({ queryKey: ["bank_accounts"], queryFn: () => base44.entities.BankAccount.filter({ status: "active" }, "bank_name", 200) });
  const { data: checks = [], isLoading } = useQuery({ queryKey: ["checks"], queryFn: () => base44.entities.Check.list("-created_date", 1000) });
  const markPrinted = async records => { const printed_date = new Date().toISOString(); await base44.entities.Check.bulkUpdate(records.map(c => ({ id: c.id, status: "printed", printed_date }))); queryClient.invalidateQueries({ queryKey: ["checks"] }); };
  const createMutation = useMutation({
    mutationFn: async ({ form, print, printWindow }) => {
      const bank = bankAccounts.find(a => a.id === form.bank_account_id);
      const check = await base44.entities.Check.create({ ...form, source: form.source || "independent", bank_name: bank.bank_name, account_name: bank.account_name, account_number: bank.account_number || "", status: "saved" });
      if (form.source !== "payment_approval") {
        await base44.entities.Transaction.create({ description: `Check ${form.check_number} – ${form.payee}${form.memo ? `: ${form.memo}` : ""}`, amount: form.amount, type: "expense", category: "other", chart_of_account: `${bank.account_name} – ${bank.bank_name}`, bank_account_id: bank.id, date: form.check_date, status: "completed" });
      }
      if (print) { printChecks([check], printWindow); await markPrinted([check]); return { ...check, status: "printed", printed_date: new Date().toISOString() }; }
      return check;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["checks"] }); queryClient.invalidateQueries({ queryKey: ["transactions"] }); },
  });
  const printOne = async check => { printChecks([check]); await markPrinted([check]); };
  const batchPrint = async () => { const records = checks.filter(c => selected.has(c.id) && c.status !== "voided"); if (!records.length) return; printChecks(records); await markPrinted(records); setSelected(new Set()); };
  const toggle = id => setSelected(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  return { bankAccounts, checks, isLoading, selected, toggle, printOne, batchPrint, save: (form, print, printWindow) => createMutation.mutateAsync({ form, print, printWindow }), saving: createMutation.isPending };
}