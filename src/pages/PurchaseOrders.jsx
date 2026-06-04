import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Plus, Trash2, CheckCircle, XCircle, Clock, AlertTriangle, Pencil, History, ChevronDown, ChevronUp, FileUp, CreditCard, Package, ClipboardList, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import POFormDialog from "../components/purchase-orders/POFormDialog";
import POExcelImportDialog from "../components/purchase-orders/POExcelImportDialog";
import POToPayableDialog from "../components/purchase-orders/POToPayableDialog";
import ReceiptUploadDialog from "../components/purchase-orders/ReceiptUploadDialog";
import NoticeOfDeliveryPDF from "../components/purchase-orders/NoticeOfDeliveryPDF";
import ApprovalWorkflowDialog from "../components/approvals/ApprovalWorkflowDialog";
import ApprovalHistoryLog from "../components/approvals/ApprovalHistoryLog";

const statusStyles = {
  pending: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  approved: "bg-primary/10 text-primary border-primary/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const priorityStyles = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-chart-2/10 text-chart-2",
  high: "bg-chart-3/10 text-chart-3",
  urgent: "bg-destructive/10 text-destructive",
};

const statusIcons = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  cancelled: XCircle,
};



export default function PurchaseOrders() {
  const [showAdd, setShowAdd] = useState(false);
  const [showApprovedSummary, setShowApprovedSummary] = useState(false);
  const [summarySearch, setSummarySearch] = useState("");
  const [expandedSummaryPO, setExpandedSummaryPO] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [reviewPO, setReviewPO] = useState(null);
  const [convertingPO, setConvertingPO] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(null);
  const [expandedHistory, setExpandedHistory] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(u => setIsAdmin(u?.role === "admin")).catch(() => {});
  }, []);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["purchase_orders"],
    queryFn: () => base44.entities.PurchaseOrder.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PurchaseOrder.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchase_orders"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PurchaseOrder.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchase_orders"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PurchaseOrder.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchase_orders"] }),
  });

  const handleDecision = (po, { action, actor, notes }) => {
    const newEntry = {
      step: action === "approved" ? "approved" : action === "rejected" ? "rejected" : "reviewed",
      action,
      actor,
      notes,
      timestamp: new Date().toISOString(),
    };
    const history = [...(po.approval_history || []), newEntry];
    updateMutation.mutate({
      id: po.id,
      data: {
        approval_status: action,
        approval_notes: notes,
        approved_by: actor,
        approval_step: action,
        approval_history: history,
      },
    });
  };

  const filtered = statusFilter === "all" ? orders : orders.filter(o => o.approval_status === statusFilter);
  const pending = orders.filter(o => o.approval_status === "pending");
  const totalPendingValue = pending.reduce((s, o) => s + (o.amount || 0), 0);
  const approved = orders.filter(o => o.approval_status === "approved");
  const totalApprovedValue = approved.reduce((s, o) => s + (o.amount || 0), 0);
  const approvedByCategory = approved.reduce((acc, o) => {
    const key = o.category || "other";
    acc[key] = (acc[key] || 0) + (o.amount || 0);
    return acc;
  }, {});

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAllPending = () => {
    if (selectedIds.size === pending.length && pending.every(p => selectedIds.has(p.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pending.map(p => p.id)));
    }
  };

  const bulkApprove = async () => {
    const timestamp = new Date().toISOString();
    const selectedPOs = orders.filter(o => selectedIds.has(o.id));
    await Promise.all(selectedPOs.map(po => {
      const newEntry = { step: "approved", action: "approved", actor: "Bulk Approval", notes: "", timestamp };
      return updateMutation.mutateAsync({
        id: po.id,
        data: {
          approval_status: "approved",
          approval_step: "approved",
          approval_history: [...(po.approval_history || []), newEntry],
        },
      });
    }));
    setSelectedIds(new Set());
  };

  return (
    <div className="p-4 md:p-8 w-full mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground mt-1">
            {pending.length} pending approval · ₱{totalPendingValue.toLocaleString()} pending value
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          {approved.length > 0 && (
            <Button variant="outline" onClick={() => setShowApprovedSummary(true)}>
              <ClipboardList className="w-4 h-4 mr-2" /> Approved Summary
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <FileUp className="w-4 h-4 mr-2" /> Import Excel
          </Button>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" /> New PO
          </Button>
        </div>
      </div>

      {/* Approved PO Summary */}
      {approved.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-sm font-semibold text-primary">Approved Purchase Orders</p>
              <p className="text-xs text-muted-foreground mt-0.5">{approved.length} order{approved.length !== 1 ? "s" : ""} approved</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">₱{totalApprovedValue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Approved Value</p>
            </div>
          </div>
          {Object.keys(approvedByCategory).length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {Object.entries(approvedByCategory).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
                <div key={cat} className="bg-card border border-border rounded-xl p-3">
                  <p className="text-xs text-muted-foreground capitalize">{cat.replace(/_/g, " ")}</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">₱{val.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{approved.filter(o => (o.category || "other") === cat).length} PO{approved.filter(o => (o.category || "other") === cat).length !== 1 ? "s" : ""}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pending banner */}
      {pending.length > 0 && (
        <div className="bg-chart-3/10 border border-chart-3/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-chart-3 flex-shrink-0" />
            <p className="text-sm text-chart-3 font-medium">
              {pending.length} purchase order{pending.length > 1 ? "s" : ""} awaiting approval · ₱{totalPendingValue.toLocaleString()}
            </p>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-3">
              <button onClick={toggleSelectAllPending} className="text-xs text-chart-3 underline underline-offset-2 hover:opacity-80">
                {selectedIds.size === pending.length && pending.length > 0 ? "Deselect all" : "Select all pending"}
              </button>
              {selectedIds.size > 0 && (
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={bulkApprove}>
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve {selectedIds.size} PO{selectedIds.size > 1 ? "s" : ""}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {/* PO Table */}
      <div className="rounded-2xl border border-border overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 border-b border-border">
            <tr>
              {isAdmin && <th className="px-3 py-3 w-8"></th>}
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">PO #</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Supplier</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Project</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading && (
              <tr><td colSpan={10} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
            )}
            {!isLoading && filtered.length === 0 && (
              <tr><td colSpan={10} className="text-center py-12 text-muted-foreground">No purchase orders found</td></tr>
            )}
            {filtered.map((po) => {
              const StatusIcon = statusIcons[po.approval_status] || Clock;
              const isExpanded = expandedHistory === po.id;
              const hasLineItems = po.line_items && po.line_items.length > 0;
              return (
                <>
                  <tr
                    key={po.id}
                    className={`hover:bg-muted/30 transition-colors cursor-pointer ${selectedIds.has(po.id) ? "bg-primary/5" : ""}`}
                    onClick={() => setExpandedHistory(isExpanded ? null : po.id)}
                  >
                    {isAdmin && (
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        {po.approval_status === "pending" && (
                          <Checkbox
                            checked={selectedIds.has(po.id)}
                            onCheckedChange={() => toggleSelect(po.id)}
                          />
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{po.po_number || "—"}</td>
                    <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">{po.supplier_name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{po.project_name || "—"}</td>
                    <td className="px-4 py-3 text-xs text-foreground max-w-[200px] truncate">{po.description}</td>
                    <td className="px-4 py-3">
                      {po.category && <Badge variant="secondary" className="text-xs capitalize">{po.category.replace(/_/g, " ")}</Badge>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`text-xs ${statusStyles[po.approval_status] || ""}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {(po.approval_status || "pending").replace(/_/g, " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {po.requested_date ? format(new Date(po.requested_date), "MMM d, yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-foreground whitespace-nowrap">
                      ₱{(po.amount || (po.line_items || []).reduce((s, i) => s + (i.total || (i.quantity * i.cost_per_item) || 0), 0)).toLocaleString()}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && po.approval_status === "pending" && (
                          <Button size="sm" variant="outline" onClick={() => setReviewPO(po)}>Review</Button>
                        )}
                        {po.approval_status === "approved" && !po.receipt_url && (
                          <Button size="sm" variant="outline" onClick={() => setUploadingReceipt(po)} className="text-primary hover:text-primary">
                            <Package className="w-3.5 h-3.5 mr-1" /> Receipt
                          </Button>
                        )}
                        {po.approval_status === "approved" && <NoticeOfDeliveryPDF po={po} />}
                        {po.approval_status === "approved" && (
                          <div title={!po.receipt_url ? "Upload a receipt before converting to payable" : ""}>
                            <Button size="sm" variant="outline" onClick={() => setConvertingPO(po)} disabled={!po.receipt_url} className="text-primary hover:text-primary disabled:opacity-50">
                              <CreditCard className="w-3.5 h-3.5 mr-1" /> Payable
                            </Button>
                          </div>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => window.print()} title="Print" className="text-muted-foreground hover:text-foreground">
                          <Printer className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setReviewPO(po)} className="text-muted-foreground hover:text-foreground">
                          <History className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditingPO(po)} className="text-muted-foreground hover:text-foreground">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(po.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${po.id}-expanded`} className="bg-muted/20">
                      <td colSpan={10} className="px-6 py-4">
                        <div className="space-y-3">
                          {/* Meta info */}
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            {po.requested_by && <span>Requested by: <span className="text-foreground font-medium">{po.requested_by}</span></span>}
                            {po.required_date && <span>Required by: <span className="text-foreground font-medium">{format(new Date(po.required_date), "MMM d, yyyy")}</span></span>}
                            {po.approved_by && <span>Reviewed by: <span className="text-foreground font-medium">{po.approved_by}</span></span>}
                            {po.priority && po.priority !== "normal" && (
                              <Badge className={`text-xs ${priorityStyles[po.priority]}`}>{po.priority}</Badge>
                            )}
                            {po.receipt_url && (
                              <span className="text-primary flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                Delivered {po.delivery_date ? format(new Date(po.delivery_date), "MMM d, yyyy") : ""}
                                <a href={po.receipt_url} target="_blank" rel="noopener noreferrer" className="underline ml-1">View receipt</a>
                              </span>
                            )}
                          </div>
                          {po.approval_notes && (
                            <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2">{po.approval_notes}</p>
                          )}
                          {po.delivery_notes && (
                            <p className="text-xs text-muted-foreground italic">{po.delivery_notes}</p>
                          )}
                          {/* Line items */}
                          {hasLineItems && (
                            <div className="border border-border rounded-lg overflow-hidden">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="bg-muted/50 border-b border-border">
                                    <th className="px-3 py-2 text-left font-semibold">Item</th>
                                    <th className="px-3 py-2 text-right font-semibold">Qty</th>
                                    <th className="px-3 py-2 text-right font-semibold">Cost/Item</th>
                                    <th className="px-3 py-2 text-right font-semibold">Total</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {po.line_items.map((item, idx) => (
                                    <tr key={idx} className="border-b border-border/50 last:border-0">
                                      <td className="px-3 py-2">{item.description}</td>
                                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                                      <td className="px-3 py-2 text-right">₱{(item.cost_per_item || 0).toLocaleString()}</td>
                                      <td className="px-3 py-2 text-right font-semibold">₱{(item.total || 0).toLocaleString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                          {po.items && !hasLineItems && <p className="text-xs text-muted-foreground">Items: {po.items}</p>}
                          {/* Approval history */}
                          {po.approval_history?.length > 0 && (
                            <div className="p-3 bg-muted/30 rounded-xl border border-border">
                              <ApprovalHistoryLog history={po.approval_history} />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Approved PO Summary Dialog */}
      <Dialog open={showApprovedSummary} onOpenChange={(v) => { setShowApprovedSummary(v); if (!v) { setSummarySearch(""); setExpandedSummaryPO(null); } }}>
        <DialogContent className="max-w-[75vw] w-[75vw] flex flex-col max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              Approved Purchase Orders Summary
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 mb-2">
            <input
              type="text"
              placeholder="Search by supplier or PO number..."
              value={summarySearch}
              onChange={e => setSummarySearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="flex-1 overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                <tr className="border-b border-border">
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-28">PO #</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Supplier</th>
                  <th className="px-3 py-2 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide w-32">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {approved
                  .filter(po => {
                    const q = summarySearch.toLowerCase();
                    return !q || (po.supplier_name || "").toLowerCase().includes(q) || (po.po_number || "").toLowerCase().includes(q);
                  })
                  .map((po) => {
                    const isExpanded = expandedSummaryPO === po.id;
                    const hasItems = po.line_items && po.line_items.length > 0;
                    return (
                      <>
                        <tr
                          key={po.id}
                          className="hover:bg-primary/5 cursor-pointer transition-colors"
                          onClick={() => setExpandedSummaryPO(isExpanded ? null : po.id)}
                        >
                          <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{po.po_number || "—"}</td>
                          <td className="px-3 py-1.5 text-xs font-medium text-foreground flex items-center gap-1">
                            {po.supplier_name}
                            {hasItems && (isExpanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />)}
                          </td>
                          <td className="px-3 py-1.5 text-xs text-right font-semibold text-foreground">₱{(po.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                        {isExpanded && (
                          <>
                            <tr className="bg-muted/30">
                              <th className="px-3 py-1 text-left text-xs font-semibold text-muted-foreground" colSpan={1}></th>
                              <th className="px-3 py-1 text-left text-xs font-semibold text-muted-foreground">Description</th>
                              <th className="px-3 py-1 text-right text-xs font-semibold text-muted-foreground">Qty &nbsp;|&nbsp; Unit Cost &nbsp;|&nbsp; Total</th>
                            </tr>
                            {hasItems ? po.line_items.map((item, idx) => (
                              <tr key={`${po.id}-item-${idx}`} className="bg-muted/10 hover:bg-muted/20">
                                <td className="px-3 py-1 text-xs text-muted-foreground pl-6">↳</td>
                                <td className="px-3 py-1 text-xs text-foreground">{item.description}</td>
                                <td className="px-3 py-1 text-xs text-right text-muted-foreground">
                                  {item.quantity ?? "—"} &nbsp;|&nbsp; ₱{(item.cost_per_item || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} &nbsp;|&nbsp; <span className="font-semibold text-foreground">₱{(item.total || (item.quantity * item.cost_per_item) || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </td>
                              </tr>
                            )) : (
                              <tr className="bg-muted/10">
                                <td className="px-3 py-1 text-xs text-muted-foreground pl-6">↳</td>
                                <td className="px-3 py-1 text-xs text-muted-foreground" colSpan={2}>{po.description || "No items"}</td>
                              </tr>
                            )}
                          </>
                        )}
                      </>
                    );
                  })}
              </tbody>
            </table>
          </div>
          <div className="pt-3 border-t border-border flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{approved.filter(po => { const q = summarySearch.toLowerCase(); return !q || (po.supplier_name || "").toLowerCase().includes(q) || (po.po_number || "").toLowerCase().includes(q); }).length} of {approved.length} PO{approved.length !== 1 ? "s" : ""}</span>
            <span className="font-bold text-primary text-base">Total: ₱{totalApprovedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </DialogContent>
      </Dialog>

      <POExcelImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        onImport={async (rows) => {
          await Promise.all(rows.map(r => createMutation.mutateAsync(r)));
        }}
      />
      <POFormDialog open={showAdd} onOpenChange={setShowAdd} title="New Purchase Order" onSubmit={(data) => createMutation.mutateAsync(data)} />
      <POFormDialog open={!!editingPO} onOpenChange={(v) => { if (!v) setEditingPO(null); }} title="Edit Purchase Order" initialData={editingPO || {}} onSubmit={(data) => updateMutation.mutateAsync({ id: editingPO.id, data })} />
      {reviewPO && (
        <ApprovalWorkflowDialog
          open={!!reviewPO}
          onOpenChange={(v) => !v && setReviewPO(null)}
          title={`Review PO — ${reviewPO.supplier_name}`}
          history={reviewPO.approval_history || []}
          summary={
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold">{reviewPO.supplier_name}</p>
                {reviewPO.po_number && <span className="text-xs font-mono text-muted-foreground">{reviewPO.po_number}</span>}
              </div>
              <p className="text-sm text-muted-foreground">{reviewPO.description}</p>
              {reviewPO.project_name && <p className="text-xs text-muted-foreground">Project: {reviewPO.project_name}</p>}
              <p className="text-2xl font-bold text-foreground mt-1">₱{(reviewPO.amount || 0).toLocaleString()}</p>
              <Badge variant="outline" className={`text-xs mt-1 ${statusStyles[reviewPO.approval_status] || ""}`}>
                {(reviewPO.approval_status || "pending").replace(/_/g, " ")}
              </Badge>
            </div>
          }
          onDecision={(decision) => handleDecision(reviewPO, decision)}
        />
      )}
      <POToPayableDialog
        open={!!convertingPO}
        onOpenChange={(v) => { if (!v) setConvertingPO(null); }}
        po={convertingPO}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
          setConvertingPO(null);
        }}
      />
      <ReceiptUploadDialog
        open={!!uploadingReceipt}
        onOpenChange={(v) => { if (!v) setUploadingReceipt(null); }}
        po={uploadingReceipt}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
          setUploadingReceipt(null);
        }}
      />
    </div>
  );
}