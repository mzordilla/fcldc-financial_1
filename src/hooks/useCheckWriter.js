import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { printChecks } from "@/lib/checkUtils";
import { useAuth } from "@/lib/AuthContext";

export default function useCheckWriter() {
  const queryClient = useQueryClient(); const { user } = useAuth(); const [selected, setSelected] = useState(new Set());
  const { data: bankAccounts = [] } = useQuery({ queryKey: ["bank_accounts"], queryFn: () => base44.entities.BankAccount.filter({ status: "active" }, "bank_name", 200) });
  const { data: checks = [], isLoading } = useQuery({ queryKey: ["checks"], queryFn: () => base44.entities.Check.list("-created_date", 1000) });
  const markPrinted = async records => { const printed_date = new Date().toISOString(); await base44.entities.Check.bulkUpdate(records.map(c => ({ id: c.id, status: "printed", printed_date }))); queryClient.invalidateQueries({ queryKey: ["checks"] }); };
  const createMutation = useMutation({
    mutationFn: async ({ form, print, printWindow }) => {
      const bank = bankAccounts.find(a => a.id === form.bank_account_id);
      const check = await base44.entities.Check.create({ ...form, source: form.source || "independent", bank_name: bank.bank_name, account_name: bank.account_name, account_number: bank.account_number || "", status: "saved" });
      if (form.source === "fund_transfer") {
        const dest = bankAccounts.find(a => a.id === form.destination_bank_account_id);
        await base44.entities.Transaction.create({ description: `Fund Transfer Check ${form.check_number} – to ${form.destination_bank_name || form.payee}`, amount: form.amount, type: "expense", category: "fund_transfer", chart_of_account: `${bank.account_name} – ${bank.bank_name}`, bank_account_id: bank.id, date: form.check_date, status: "completed" });
        if (dest) {
          await base44.entities.Transaction.create({ description: `Fund Transfer Check ${form.check_number} – from ${bank.account_name} – ${bank.bank_name}`, amount: form.amount, type: "income", category: "fund_transfer", chart_of_account: `${dest.account_name} – ${dest.bank_name}`, bank_account_id: dest.id, date: form.check_date, status: "completed" });
        }
      } else if (form.source !== "payment_approval") {
        await base44.entities.Transaction.create({ description: `Check ${form.check_number} – ${form.payee}${form.memo ? `: ${form.memo}` : ""}`, amount: form.amount, type: "expense", category: "other", chart_of_account: `${bank.account_name} – ${bank.bank_name}`, bank_account_id: bank.id, date: form.check_date, status: "completed" });
      }
      if (print) { printChecks([check], printWindow); await markPrinted([check]); return { ...check, status: "printed", printed_date: new Date().toISOString() }; }
      return check;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["checks"] }); queryClient.invalidateQueries({ queryKey: ["transactions"] }); },
  });
  const refreshRemovalData = () => { queryClient.invalidateQueries({ queryKey: ["checks"] }); queryClient.invalidateQueries({ queryKey: ["approved_payment_requests_for_checks"] }); };
  const deleteMutation = useMutation({ mutationFn: check => base44.entities.Check.delete(check.id), onSuccess: (_, check) => { setSelected(current => { const next = new Set(current); next.delete(check.id); return next; }); refreshRemovalData(); } });
  const requestRemovalMutation = useMutation({
    mutationFn: ({ check, action, reason }) => base44.entities.Check.update(check.id, { deletion_request_status: "pending", deletion_action: action, deletion_reason: reason, deletion_requested_by: user?.full_name || user?.email || "User", deletion_requested_date: new Date().toISOString() }),
    onSuccess: refreshRemovalData,
  });
  const reviewRemovalMutation = useMutation({
    mutationFn: async ({ check, approved }) => {
      if (!approved) return base44.entities.Check.update(check.id, { deletion_request_status: "rejected", deletion_reviewed_by: user?.full_name || user?.email || "Admin", deletion_reviewed_date: new Date().toISOString() });
      if (check.deletion_action === "delete") return base44.entities.Check.delete(check.id);
      return base44.entities.Check.update(check.id, { status: "voided", deletion_request_status: "approved", deletion_reviewed_by: user?.full_name || user?.email || "Admin", deletion_reviewed_date: new Date().toISOString() });
    },
    onSuccess: refreshRemovalData,
  });
  const printOne = async check => { printChecks([check]); await markPrinted([check]); };
  const deleteCheck = async check => { if (check.status === "printed") return false; if (!window.confirm(`Delete check ${check.check_number}?`)) return false; await deleteMutation.mutateAsync(check); return true; };
  const requestRemoval = request => requestRemovalMutation.mutateAsync(request);
  const reviewRemoval = (check, approved) => reviewRemovalMutation.mutateAsync({ check, approved });
  const batchPrint = async () => { const records = checks.filter(c => selected.has(c.id) && c.status !== "voided"); if (!records.length) return; printChecks(records); await markPrinted(records); setSelected(new Set()); };
  const toggle = id => setSelected(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  return { bankAccounts, checks, isLoading, selected, toggle, printOne, deleteCheck, requestRemoval, requestingRemoval: requestRemovalMutation.isPending, reviewRemoval, reviewingId: reviewRemovalMutation.isPending ? reviewRemovalMutation.variables?.check?.id : null, deletingId: deleteMutation.isPending ? deleteMutation.variables?.id : null, batchPrint, save: (form, print, printWindow) => createMutation.mutateAsync({ form, print, printWindow }), saving: createMutation.isPending };
}