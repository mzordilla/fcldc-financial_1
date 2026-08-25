import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { printChecks } from "@/lib/checkUtils";
import { useAuth } from "@/lib/AuthContext";

export default function useCheckWriter() {
  const queryClient = useQueryClient(); const { user } = useAuth(); const [selected, setSelected] = useState(new Set());
  const { data: bankAccounts = [] } = useQuery({ queryKey: ["bank_accounts"], queryFn: () => base44.entities.BankAccount.filter({ status: "active" }, "bank_name", 200) });
  const { data: checks = [], isLoading } = useQuery({ queryKey: ["checks"], queryFn: () => base44.entities.Check.list("-created_date", 1000) });
  const { data: pendingTransfers = [] } = useQuery({ queryKey: ["pending_bank_transfer_requests"], queryFn: () => base44.entities.BankTransferRequest.filter({ status: "pending" }, "-created_date", 200) });
  const postTransferTransactions = async check => {
    const source = bankAccounts.find(a => a.id === check.bank_account_id);
    const dest = bankAccounts.find(a => a.id === check.destination_bank_account_id);
    await base44.entities.Transaction.create({ description: `Fund Transfer Check ${check.check_number} – to ${check.destination_bank_name || check.payee}`, amount: check.amount, type: "expense", category: "fund_transfer", chart_of_account: source ? `${source.account_name} – ${source.bank_name}` : check.bank_name, bank_account_id: check.bank_account_id, date: check.check_date, status: "completed" });
    if (dest) await base44.entities.Transaction.create({ description: `Fund Transfer Check ${check.check_number} – from ${check.account_name} – ${check.bank_name}`, amount: check.amount, type: "income", category: "fund_transfer", chart_of_account: `${dest.account_name} – ${dest.bank_name}`, bank_account_id: dest.id, date: check.check_date, status: "completed" });
  };
  const markPrinted = async records => { const printed_date = new Date().toISOString(); await base44.entities.Check.bulkUpdate(records.map(c => ({ id: c.id, status: "printed", printed_date }))); queryClient.invalidateQueries({ queryKey: ["checks"] }); };
  const createMutation = useMutation({
    mutationFn: async ({ form, print, printWindow }) => {
      const bank = bankAccounts.find(a => a.id === form.bank_account_id);
      const base = { ...form, source: form.source || "independent", bank_name: bank.bank_name, account_name: bank.account_name, account_number: bank.account_number || "", status: "saved" };
      if (form.source === "fund_transfer") {
        const dest = bankAccounts.find(a => a.id === form.destination_bank_account_id);
        const request = await base44.entities.BankTransferRequest.create({
          transfers: [{ from_bank_account_id: bank.id, from_bank_name: `${bank.account_name} – ${bank.bank_name}`, to_bank_account_id: form.destination_bank_account_id, to_bank_name: form.destination_bank_name || dest?.account_name || "", amount: form.amount }],
          from_bank_account_id: bank.id, from_bank_name: `${bank.account_name} – ${bank.bank_name}`,
          to_bank_account_id: form.destination_bank_account_id, to_bank_name: form.destination_bank_name || "",
          amount: form.amount, transfer_date: form.check_date, reference: `Check ${form.check_number}`,
          requested_by_name: user?.full_name || user?.email || "User", status: "pending",
        });
        return base44.entities.Check.create({ ...base, approval_status: "pending_approval", print_on_approval: Boolean(print), bank_transfer_request_id: request.id });
      }
      const check = await base44.entities.Check.create(base);
      if (form.source !== "payment_approval") {
        await base44.entities.Transaction.create({ description: `Check ${form.check_number} – ${form.payee}${form.memo ? `: ${form.memo}` : ""}`, amount: form.amount, type: "expense", category: "other", chart_of_account: `${bank.account_name} – ${bank.bank_name}`, bank_account_id: bank.id, date: form.check_date, status: "completed" });
      }
      if (print) { printChecks([check], printWindow); await markPrinted([check]); return { ...check, status: "printed", printed_date: new Date().toISOString() }; }
      return check;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["checks"] }); queryClient.invalidateQueries({ queryKey: ["transactions"] }); queryClient.invalidateQueries({ queryKey: ["pending_bank_transfer_requests"] }); },
  });
  const refreshTransferData = () => { queryClient.invalidateQueries({ queryKey: ["checks"] }); queryClient.invalidateQueries({ queryKey: ["transactions"] }); queryClient.invalidateQueries({ queryKey: ["pending_bank_transfer_requests"] }); };
  const reviewer = () => user?.full_name || user?.email || "Admin";
  const reviewTransferMutation = useMutation({
    mutationFn: async ({ request, approved }) => {
      const linked = checks.find(c => c.bank_transfer_request_id === request.id);
      await base44.entities.BankTransferRequest.update(request.id, { status: approved ? "approved" : "rejected", reviewed_by: reviewer(), reviewed_date: new Date().toISOString() });
      if (!linked) return;
      if (!approved) return base44.entities.Check.update(linked.id, { status: "voided", approval_status: "rejected" });
      await postTransferTransactions(linked);
      const shouldPrint = linked.print_on_approval;
      await base44.entities.Check.update(linked.id, { approval_status: "approved", ...(shouldPrint ? { status: "printed", printed_date: new Date().toISOString() } : {}) });
      if (shouldPrint) printChecks([{ ...linked, approval_status: "approved" }]);
    },
    onSuccess: refreshTransferData,
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
  const printOne = async check => { if (check.approval_status === "pending_approval") return; printChecks([check]); await markPrinted([check]); };
  const deleteCheck = async check => { if (check.status === "printed") return false; if (!window.confirm(`Delete check ${check.check_number}?`)) return false; await deleteMutation.mutateAsync(check); return true; };
  const requestRemoval = request => requestRemovalMutation.mutateAsync(request);
  const reviewRemoval = (check, approved) => reviewRemovalMutation.mutateAsync({ check, approved });
  const batchPrint = async () => { const records = checks.filter(c => selected.has(c.id) && c.status !== "voided" && c.approval_status !== "pending_approval"); if (!records.length) return; printChecks(records); await markPrinted(records); setSelected(new Set()); };
  const toggle = id => setSelected(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
  return { bankAccounts, checks, pendingTransfers, isLoading, selected, toggle,
    approveTransfer: request => reviewTransferMutation.mutateAsync({ request, approved: true }),
    rejectTransfer: request => reviewTransferMutation.mutateAsync({ request, approved: false }), printOne, deleteCheck, requestRemoval, requestingRemoval: requestRemovalMutation.isPending, reviewRemoval, reviewingId: reviewRemovalMutation.isPending ? reviewRemovalMutation.variables?.check?.id : null, deletingId: deleteMutation.isPending ? deleteMutation.variables?.id : null, batchPrint, save: (form, print, printWindow) => createMutation.mutateAsync({ form, print, printWindow }), saving: createMutation.isPending };
}