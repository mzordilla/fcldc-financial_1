import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { differenceInDays } from "date-fns";
import { Plus, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AddFormDialog from "../components/shared/AddFormDialog";
import ReceivableFormDialog from "../components/receivables/ReceivableFormDialog";
import MarkReceivableAsCollectedDialog from "../components/receivables/MarkReceivableAsCollectedDialog";
import StatementOfAccountPDF from "../components/receivables/StatementOfAccountPDF";
import ClientInvoiceDetails from "../components/receivables/ClientInvoiceDetails";
import BillingCycles from "./BillingCycles";

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

function computeBuckets(rows) {
  const today = new Date();
  const buckets = { current: 0, days30: 0, days60: 0, days90: 0, days90plus: 0 };
  let total = 0;
  rows.filter(r => r.status !== "paid").forEach(r => {
    if (!r.due_date) return;
    const days = differenceInDays(today, new Date(r.due_date));
    const rem = (r.amount || 0) - (r.amount_paid || 0);
    total += rem;
    if (days <= 0) buckets.current += rem;
    else if (days <= 30) buckets.days30 += rem;
    else if (days <= 60) buckets.days60 += rem;
    else if (days <= 90) buckets.days90 += rem;
    else buckets.days90plus += rem;
  });
  return { buckets, total };
}

export default function Receivables() {
  const [showAdd, setShowAdd] = useState(false);
  const [editingR, setEditingR] = useState(null);
  const [collectingR, setCollectingR] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedClients, setExpandedClients] = useState(new Set());
  const queryClient = useQueryClient();

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

  // Group by client
  const clientMap = {};
  filtered.forEach(r => {
    const key = r.client_name || "No Client";
    if (!clientMap[key]) clientMap[key] = [];
    clientMap[key].push(r);
  });
  const clientList = Object.keys(clientMap)
    .map((client) => {
      const rows = clientMap[client];
      const { buckets, total } = computeBuckets(rows);
      return { client, rows, count: rows.length, buckets, total };
    })
    .sort((a, b) => a.client.localeCompare(b.client));

  const toggleClient = (client) => {
    setExpandedClients((prev) => {
      const next = new Set(prev);
      next.has(client) ? next.delete(client) : next.add(client);
      return next;
    });
  };

  const expandAllClients = () => setExpandedClients(new Set(clientList.map((c) => c.client)));
  const collapseAllClients = () => setExpandedClients(new Set());

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
          <StatementOfAccountPDF
            projectName="All Projects"
            clientName="All Clients"
            rows={receivables}
          />
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add
          </Button>
        </div>
      </div>

      <AgingSummary items={receivables} />

      {/* Client Aging Summary */}
      <div className="space-y-4">
        {isLoading && <p className="text-center py-12 text-muted-foreground">Loading...</p>}
        {!isLoading && clientList.length === 0 && <p className="text-center py-12 text-muted-foreground">No receivables yet</p>}
        {clientList.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-muted-foreground">{clientList.length} client{clientList.length !== 1 ? "s" : ""}</p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={expandAllClients} className="text-xs">
                <ChevronDown className="w-3 h-3 mr-1" /> Expand All
              </Button>
              <Button size="sm" variant="outline" onClick={collapseAllClients} className="text-xs">
                <ChevronUp className="w-3 h-3 mr-1" /> Collapse All
              </Button>
            </div>
          </div>
        )}
        {clientList.length > 0 && (
          <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-0 px-5 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            <span>Client</span>
            <span className="text-right">Current</span>
            <span className="text-right">1-30</span>
            <span className="text-right">31-60</span>
            <span className="text-right">61-90</span>
            <span className="text-right">90+</span>
            <span className="text-right">Total</span>
            <span></span>
          </div>
        )}
        {clientList.length > 0 && (
          <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
            {clientList.map(({ client, rows, count, buckets, total }) => {
              const isExpanded = expandedClients.has(client);
              return (
                <div key={client} className="bg-card">
                  <button
                    className="w-full px-5 py-3 bg-muted/50 hover:bg-muted/70 transition-colors"
                    onClick={() => toggleClient(client)}
                  >
                    <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-0 items-center">
                      <div className="flex items-center gap-2 text-left min-w-0">
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${isExpanded ? "" : "-rotate-90"}`} />
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-foreground truncate">{client}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{count} invoice{count > 1 ? "s" : ""} · ₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })} outstanding</p>
                        </div>
                      </div>
                      <span className="text-right text-xs font-semibold text-primary">₱{buckets.current.toLocaleString()}</span>
                      <span className="text-right text-xs font-semibold text-chart-3">₱{buckets.days30.toLocaleString()}</span>
                      <span className="text-right text-xs font-semibold text-orange-500">₱{buckets.days60.toLocaleString()}</span>
                      <span className="text-right text-xs font-semibold text-destructive">₱{buckets.days90.toLocaleString()}</span>
                      <span className="text-right text-xs font-semibold text-destructive">₱{buckets.days90plus.toLocaleString()}</span>
                      <span className="text-right text-xs font-bold text-foreground">₱{total.toLocaleString()}</span>
                      <span
                        role="button"
                        className="ml-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <StatementOfAccountPDF
                          projectName={client}
                          clientName={client}
                          rows={rows}
                        />
                      </span>
                    </div>
                  </button>
                  {isExpanded && (
                    <ClientInvoiceDetails
                      rows={rows}
                      onCollect={setCollectingR}
                      onEdit={setEditingR}
                      onDelete={(id) => deleteMutation.mutate(id)}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
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