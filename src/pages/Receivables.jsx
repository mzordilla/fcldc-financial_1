import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, differenceInDays } from "date-fns";
import { Plus, Trash2, CheckCircle, Pencil, Banknote, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AddFormDialog from "../components/shared/AddFormDialog";
import ReceivableFormDialog from "../components/receivables/ReceivableFormDialog";
import MarkReceivableAsCollectedDialog from "../components/receivables/MarkReceivableAsCollectedDialog";
import BillingCycles from "./BillingCycles";

function getAgingBucket(dueDateStr, status) {
  if (status === "paid") return null;
  if (!dueDateStr) return null;
  const days = differenceInDays(new Date(), new Date(dueDateStr));
  if (days <= 0) return { label: "Current", style: "bg-primary/10 text-primary" };
  if (days <= 30) return { label: "1–30 days", style: "bg-chart-3/10 text-chart-3" };
  if (days <= 60) return { label: "31–60 days", style: "bg-chart-3/20 text-chart-3" };
  if (days <= 90) return { label: "61–90 days", style: "bg-destructive/10 text-destructive" };
  return { label: "90+ days", style: "bg-destructive/20 text-destructive font-semibold" };
}



function AgingSummary({ items }) {
  const today = new Date();
  const buckets = [
    { label: "Current", amount: 0 },
    { label: "1–30 days", amount: 0 },
    { label: "31–60 days", amount: 0 },
    { label: "61–90 days", amount: 0 },
    { label: "90+ days", amount: 0 },
  ];
  items.filter(r => r.status !== "paid").forEach(r => {
    if (!r.due_date) return;
    const days = differenceInDays(today, new Date(r.due_date));
    const rem = (r.amount || 0) - (r.amount_paid || 0);
    if (days <= 0) buckets[0].amount += rem;
    else if (days <= 30) buckets[1].amount += rem;
    else if (days <= 60) buckets[2].amount += rem;
    else if (days <= 90) buckets[3].amount += rem;
    else buckets[4].amount += rem;
  });
  const colors = ["bg-primary", "bg-chart-3", "bg-orange-400", "bg-destructive/70", "bg-destructive"];
  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">Aging Analysis</h3>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {buckets.map((b, i) => (
          <div key={b.label} className="text-center">
            <div className={`h-1.5 rounded-full ${colors[i]} mb-2 opacity-80`} />
            <p className="text-xs text-muted-foreground">{b.label}</p>
            <p className={`text-sm font-bold mt-0.5 ${i >= 2 && b.amount > 0 ? "text-destructive" : "text-foreground"}`}>
              ₱{b.amount.toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

const statusStyles = {
  outstanding: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  partially_paid: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  paid: "bg-primary/10 text-primary border-primary/20",
  overdue: "bg-destructive/10 text-destructive border-destructive/20",
};

const fields = [
  { name: "client_name", label: "Client Name", required: true, placeholder: "e.g. ABC Developers" },
  { name: "invoice_number", label: "Invoice #", placeholder: "INV-001" },
  { name: "amount", label: "Total Amount (₱)", type: "number", required: true, placeholder: "0.00" },
  { name: "amount_paid", label: "Amount Paid (₱)", type: "number", placeholder: "0.00" },
  { name: "due_date", label: "Due Date", type: "date", required: true },
  { name: "status", label: "Status", type: "select", options: [
    { value: "outstanding", label: "Outstanding" },
    { value: "partially_paid", label: "Partially Paid" },
    { value: "paid", label: "Paid" },
    { value: "overdue", label: "Overdue" },
  ]},
  { name: "notes", label: "Notes", placeholder: "Optional notes" },
];

export default function Receivables() {
  const [showAdd, setShowAdd] = useState(false);
  const [editingR, setEditingR] = useState(null);
  const [collectingR, setCollectingR] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedClients, setExpandedClients] = useState({});
  const queryClient = useQueryClient();

  const toggleClient = (client) => setExpandedClients(prev => ({ ...prev, [client]: !prev[client] }));

  const { data: receivables = [], isLoading } = useQuery({
    queryKey: ["receivables"],
    queryFn: () => base44.entities.Receivable.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const receivable = await base44.entities.Receivable.create(data);
      // Revenue recognition — record income when receivable is created (accrual basis)
      // DR Accounts Receivable (tracked on the Receivable record) / CR Revenue
      await base44.entities.Transaction.create({
        description: `Revenue: ${data.client_name}${data.invoice_number ? ` (${data.invoice_number})` : ""}${data.project_name ? ` — ${data.project_name}` : ""}`,
        amount: data.amount,
        type: "income",
        category: "project_payment",
        chart_of_account: "Revenue",
        project_code: data.project_code || "",
        date: data.due_date || new Date().toISOString().split("T")[0],
        status: "completed",
      });
      return receivable;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Receivable.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["receivables"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Receivable.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["receivables"] }),
  });

  const markCollected = (r, data) => updateMutation.mutate({ id: r.id, data });

  const filtered = statusFilter === "all" ? receivables : receivables.filter(r => r.status === statusFilter);

  const totalOutstanding = receivables.filter(r => r.status !== "paid").reduce((s, r) => s + ((r.amount || 0) - (r.amount_paid || 0)), 0);
  const overdueCount = receivables.filter(r => r.status === "overdue").length;
  const totalBilled = receivables.reduce((s, r) => s + (r.amount || 0), 0);
  const totalCollected = receivables.reduce((s, r) => s + (r.amount_paid || 0), 0);
  const collectionEfficiency = totalBilled > 0 ? ((totalCollected / totalBilled) * 100) : 0;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <Tabs defaultValue="receivables" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="receivables">Receivables</TabsTrigger>
          <TabsTrigger value="billing-cycles">Billing Cycles</TabsTrigger>
        </TabsList>

        <TabsContent value="receivables" className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Receivables</h1>
          <p className="text-muted-foreground mt-1">
            ₱{totalOutstanding.toLocaleString()} outstanding · {overdueCount} overdue · {collectionEfficiency.toFixed(1)}% collection efficiency
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="outstanding">Outstanding</SelectItem>
              <SelectItem value="partially_paid">Partially Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add
          </Button>
        </div>
      </div>

      <AgingSummary items={receivables} />

      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
        {!isLoading && filtered.length === 0 && <p className="text-center py-12 text-muted-foreground">No receivables yet</p>}
        {!isLoading && filtered.length > 0 && (() => {
          // Group by client
          const clientMap = {};
          filtered.forEach(r => {
            const key = r.client_name || "Unknown";
            if (!clientMap[key]) clientMap[key] = [];
            clientMap[key].push(r);
          });
          const clients = Object.keys(clientMap).sort();

          return (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/30 border-b border-border">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase w-6"></th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Client / Invoice</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Project</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Due Date</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase">Aging</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">Billed</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">Collected</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">Balance</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map(clientName => {
                    const rows = clientMap[clientName];
                    const totalBilled = rows.reduce((s, r) => s + (r.amount || 0), 0);
                    const totalCollected = rows.reduce((s, r) => s + (r.amount_paid || 0), 0);
                    const totalBalance = totalBilled - totalCollected;
                    const isExpanded = expandedClients[clientName] !== false; // default expanded
                    const hasOverdue = rows.some(r => r.status === "overdue");

                    return (
                      <>
                        {/* Client summary row */}
                        <tr
                          key={`client-${clientName}`}
                          className="bg-muted/40 border-t border-border cursor-pointer hover:bg-muted/60 transition-colors"
                          onClick={() => toggleClient(clientName)}
                        >
                          <td className="px-3 py-2 text-muted-foreground">
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          </td>
                          <td className="px-3 py-2 font-semibold text-sm text-foreground" colSpan={2}>
                            {clientName}
                            <span className="ml-2 text-xs text-muted-foreground font-normal">{rows.length} invoice{rows.length !== 1 ? "s" : ""}</span>
                            {hasOverdue && <span className="ml-2 text-xs text-destructive font-medium">· overdue</span>}
                          </td>
                          <td className="px-3 py-2" colSpan={3}></td>
                          <td className="px-3 py-2 text-right text-sm font-mono font-semibold">₱{totalBilled.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-sm font-mono font-semibold text-primary">₱{totalCollected.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right text-sm font-mono font-bold text-foreground">₱{totalBalance.toLocaleString()}</td>
                          <td></td>
                        </tr>
                        {/* Invoice breakdown rows */}
                        {isExpanded && rows.map(r => {
                          const remaining = (r.amount || 0) - (r.amount_paid || 0);
                          const aging = getAgingBucket(r.due_date, r.status);
                          return (
                            <tr key={r.id} className="border-t border-border/50 hover:bg-muted/20 transition-colors">
                              <td className="px-3 py-1.5"></td>
                              <td className="px-3 py-1.5 text-xs text-muted-foreground font-mono pl-6">
                                {r.invoice_number || "—"}
                              </td>
                              <td className="px-3 py-1.5 text-xs text-muted-foreground">{r.project_name || "—"}</td>
                              <td className="px-3 py-1.5 text-xs text-muted-foreground whitespace-nowrap">
                                {r.due_date ? format(new Date(r.due_date), "MMM d, yyyy") : "—"}
                              </td>
                              <td className="px-3 py-1.5">
                                <Badge variant="outline" className={`text-xs ${statusStyles[r.status] || ""}`}>
                                  {(r.status || "outstanding").replace(/_/g, " ")}
                                </Badge>
                              </td>
                              <td className="px-3 py-1.5">
                                {aging ? (
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${aging.style}`}>{aging.label}</span>
                                ) : <span className="text-xs text-muted-foreground">—</span>}
                              </td>
                              <td className="px-3 py-1.5 text-right text-xs font-mono">₱{(r.amount || 0).toLocaleString()}</td>
                              <td className="px-3 py-1.5 text-right text-xs font-mono text-primary">₱{(r.amount_paid || 0).toLocaleString()}</td>
                              <td className="px-3 py-1.5 text-right text-xs font-mono font-semibold">₱{remaining.toLocaleString()}</td>
                              <td className="px-3 py-1.5">
                                <div className="flex items-center justify-end gap-1">
                                  {r.status !== "paid" && (
                                    <button onClick={() => setCollectingR(r)} className="text-primary hover:opacity-70 transition-opacity" title="Record Collection">
                                      <CheckCircle className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {r.status === "paid" && (r.payment_history || []).length > 0 && (
                                    <button onClick={() => setCollectingR(r)} className="text-muted-foreground hover:text-primary transition-colors" title="View Collections">
                                      <Banknote className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  <button onClick={() => setEditingR(r)} className="text-muted-foreground hover:text-foreground transition-colors">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                  <button onClick={() => deleteMutation.mutate(r.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })()}
      </div>

      <ReceivableFormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title="Add Receivable"
        fields={fields}
        onSubmit={(data) => createMutation.mutateAsync(data)}
      />
      <ReceivableFormDialog
        open={!!editingR}
        onOpenChange={(v) => { if (!v) setEditingR(null); }}
        title="Edit Receivable"
        fields={fields}
        initialData={editingR || {}}
        onSubmit={(data) => updateMutation.mutateAsync({ id: editingR.id, data })}
      />
      <MarkReceivableAsCollectedDialog
        open={!!collectingR}
        onOpenChange={(v) => { if (!v) setCollectingR(null); }}
        receivable={collectingR}
        onConfirm={(data) => markCollected(collectingR, data)}
      />
        </TabsContent>

        <TabsContent value="billing-cycles">
          <BillingCycles embedded />
        </TabsContent>
      </Tabs>
    </div>
  );
}