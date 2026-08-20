import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format } from "date-fns";
import { Plus, Trash2, CheckCircle, XCircle, Clock, AlertTriangle, Pencil, History, ChevronDown, ChevronUp, FileUp, CreditCard, Package, ClipboardList, Printer, Search, GitPullRequest, MoreHorizontal } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import POFormDialog from "../components/purchase-orders/POFormDialog";
import POExcelImportDialog from "../components/purchase-orders/POExcelImportDialog";
import POToPayableDialog from "../components/purchase-orders/POToPayableDialog";
import ReceiptUploadDialog from "../components/purchase-orders/ReceiptUploadDialog";
import PurchaseOrderPDF from "../components/purchase-orders/PurchaseOrderPDF";
import PurchaseOrderPrintView from "../components/purchase-orders/PurchaseOrderPrintView";
import ApprovalWorkflowDialog from "../components/approvals/ApprovalWorkflowDialog";
import ApprovalHistoryLog from "../components/approvals/ApprovalHistoryLog";
import ReceiveItemsDialog from "../components/purchase-orders/ReceiveItemsDialog";
import GroupedPurchaseOrders from "../components/purchase-orders/GroupedPurchaseOrders";
import ProjectDeliverySummary from "../components/purchase-orders/ProjectDeliverySummary";
import ChangeRequestDialog from "../components/purchase-orders/ChangeRequestDialog";
import ChangeRequestReviewDialog from "../components/purchase-orders/ChangeRequestReviewDialog";
import PendingChangeRequestsBanner from "../components/purchase-orders/PendingChangeRequestsBanner";
import Payees from "./Payees";
const statusStyles = {
  pending: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  approved: "bg-primary/10 text-primary border-primary/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground border-border"
};

const priorityStyles = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-chart-2/10 text-chart-2",
  high: "bg-chart-3/10 text-chart-3",
  urgent: "bg-destructive/10 text-destructive"
};

const statusIcons = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  cancelled: XCircle
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
  const [receivingItems, setReceivingItems] = useState(null);
  const [printingPO, setPrintingPO] = useState(null);
  const [requestingChangePO, setRequestingChangePO] = useState(null);
  const [reviewingChangesPO, setReviewingChangesPO] = useState(null);
  const [expandedHistory, setExpandedHistory] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState({ pending: true, approved: true, rejected: false, cancelled: false });
  const [statusFilter, setStatusFilter] = useState("pending");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [poSearch, setPoSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isAdmin, setIsAdmin] = useState(false);
  const queryClient = useQueryClient();

  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then((u) => { setIsAdmin(u?.role === "admin"); setCurrentUser(u); }).catch(() => {});
  }, []);

  const toggleGroup = (status) => {
    setExpandedGroups((prev) => ({ ...prev, [status]: !prev[status] }));
  };

  const renderPORow = (po) => {
    const StatusIcon = statusIcons[po.approval_status] || Clock;
    const isExpanded = expandedHistory === po.id;
    const hasLineItems = po.line_items && po.line_items.length > 0;
    const pendingChangeRequests = (po.change_requests || []).filter((cr) => cr.status === "pending").length;

    // Calculate delivery progress for approved POs
    const deliveryProgress = po.approval_status === "approved" ? (() => {
      const receivingInfo = receivingByPO[po.id];
      if (!receivingInfo) return { received: 0, total: po.line_items?.length || 0, percentage: 0 };
      const totalItems = po.line_items?.length || 0;
      const receivedItems = receivingInfo.count;
      const percentage = totalItems > 0 ? Math.min(100, receivedItems / totalItems * 100) : 0;
      return { received: receivedItems, total: totalItems, percentage, isComplete: receivingInfo.isComplete };
    })() : null;
    return (
      <>
        <tr
          key={po.id}
          className={`hover:bg-muted/30 transition-colors cursor-pointer ${selectedIds.has(po.id) ? "bg-primary/5" : ""}`}
          onClick={() => setExpandedHistory(isExpanded ? null : po.id)}>
          
          {isAdmin &&
          <td className="px-0.5 py-px" onClick={(e) => e.stopPropagation()}>
              {po.approval_status === "pending" &&
            <Checkbox
              checked={selectedIds.has(po.id)}
              onCheckedChange={() => toggleSelect(po.id)} />

            }
            </td>
          }
          <td className="px-0.5 py-px font-mono text-[10px] text-muted-foreground whitespace-nowrap">{po.po_number || "—"}</td>
          <td className="px-0.5 py-px text-xs font-medium text-foreground max-w-[180px] truncate">{po.supplier_name}</td>
          <td className="px-0.5 py-px text-xs text-muted-foreground max-w-[96px] truncate">{po.project_name || "—"}</td>
          <td className="px-0.5 py-px text-xs text-muted-foreground whitespace-nowrap">
            {po.requested_date ? format(new Date(po.requested_date), "MMM d, yy") : "—"}
          </td>
          <td className="px-0.5 py-px text-right text-xs font-bold text-foreground whitespace-nowrap">
            ₱{(po.amount || (po.line_items || []).reduce((s, i) => s + (i.total || i.quantity * i.cost_per_item || 0), 0)).toLocaleString()}
          </td>
          <td className="px-2 py-2" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-wrap items-center justify-end gap-1 min-w-[280px]">
              {isAdmin && po.approval_status === "pending" &&
                <button onClick={() => setReviewPO(po)} className="inline-flex items-center gap-1 rounded-md border border-chart-3/30 px-2 py-1 text-xs font-medium text-chart-3 hover:bg-chart-3/10">
                  <CheckCircle className="w-3.5 h-3.5" /> Review
                </button>
              }
              {po.approval_status === "approved" &&
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="inline-flex items-center gap-1 rounded-md border border-primary/30 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10">
                      <MoreHorizontal className="w-3.5 h-3.5" /> Processing
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!po.receipt_url && <DropdownMenuItem onClick={() => setUploadingReceipt(po)}><Package /> Receipt</DropdownMenuItem>}
                    <DropdownMenuItem onClick={() => setReceivingItems(po)}><Package /> Receive</DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={!po.receipt_url || poIdsWithPayables.has(po.id) || poIdsWithPaidRequests.has(po.po_number)}
                      onClick={() => setConvertingPO(po)}>
                      <CreditCard /> Pay
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              }
              {po.approval_status === "approved" &&
                <button onClick={() => setRequestingChangePO(po)} title="Request change" aria-label="Request change" className="inline-flex items-center rounded-md border border-chart-3/30 p-1.5 text-chart-3 hover:bg-chart-3/10">
                  <GitPullRequest className="w-3.5 h-3.5" />
                </button>
              }
              {isAdmin && pendingChangeRequests > 0 &&
                <button onClick={() => setReviewingChangesPO(po)} className="relative inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted">
                  <GitPullRequest className="w-3.5 h-3.5" /> Changes
                  <span className="-mt-3 -mr-3 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] text-destructive-foreground">{pendingChangeRequests}</span>
                </button>
              }
              <button onClick={() => setPrintingPO(po)} className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted">
                <Printer className="w-3.5 h-3.5" /> Print
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button title="Actions" aria-label="Actions" className="inline-flex items-center rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setReviewPO(po)}><History /> History</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEditingPO(po)}><Pencil /> Edit</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => deleteMutation.mutate(po.id)} className="text-destructive focus:text-destructive"><Trash2 /> Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </div>
          </td>
        </tr>
        {isExpanded &&
        <tr key={`${po.id}-expanded`} className="bg-muted/20">
            <td colSpan={7} className="px-6 py-4">
              <div className="space-y-3">
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase">Description:</span>
                  <p className="text-sm text-foreground mt-1">{po.description}</p>
                </div>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {po.requested_by && <span>Requested by: <span className="text-foreground font-medium">{po.requested_by}</span></span>}
                  {po.required_date && <span>Required by: <span className="text-foreground font-medium">{format(new Date(po.required_date), "MMM d, yyyy")}</span></span>}
                  {po.approved_by && <span>Reviewed by: <span className="text-foreground font-medium">{po.approved_by}</span></span>}
                  {po.priority && po.priority !== "normal" &&
                <Badge className={`text-xs ${priorityStyles[po.priority]}`}>{po.priority}</Badge>
                }
                  {po.receipt_url &&
                <span className="text-primary flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      Delivered {po.delivery_date ? format(new Date(po.delivery_date), "MMM d, yyyy") : ""}
                      <a href={po.receipt_url} target="_blank" rel="noopener noreferrer" className="underline ml-1">View receipt</a>
                    </span>
                }
                </div>
                {po.approval_notes &&
              <p className="text-xs text-muted-foreground italic border-l-2 border-border pl-2">{po.approval_notes}</p>
              }
                {po.delivery_notes &&
              <p className="text-xs text-muted-foreground italic">{po.delivery_notes}</p>
              }
                {hasLineItems &&
              <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/50 border-b border-border">
                          <th className="px-2 py-1.5 text-left font-semibold">Item</th>
                          <th className="px-2 py-1.5 text-right font-semibold">Qty</th>
                          <th className="px-2 py-1.5 text-right font-semibold">Unit</th>
                          <th className="px-2 py-1.5 text-right font-semibold">Cost/Item</th>
                          <th className="px-2 py-1.5 text-right font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {po.line_items.map((item, idx) =>
                    <tr key={idx} className="border-b border-border/50 last:border-0">
                            <td className="px-2 py-1.5">{item.description}</td>
                            <td className="px-2 py-1.5 text-right">{item.quantity}</td>
                            <td className="px-2 py-1.5 text-right text-muted-foreground">{item.unit_of_measure || "—"}</td>
                            <td className="px-2 py-1.5 text-right">₱{(item.cost_per_item || 0).toLocaleString()}</td>
                            <td className="px-2 py-1.5 text-right font-semibold">₱{(item.total || 0).toLocaleString()}</td>
                          </tr>
                    )}
                      </tbody>
                    </table>
                  </div>
              }
                {po.items && !hasLineItems && <p className="text-xs text-muted-foreground">Items: {po.items}</p>}
                {po.approval_history?.length > 0 &&
              <div className="p-3 bg-muted/30 rounded-xl border border-border">
                    <ApprovalHistoryLog history={po.approval_history} />
                  </div>
              }
                {po.approval_status === "approved" && deliveryProgress &&
              <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-medium">Delivery Progress</span>
                      <span className={`font-semibold ${deliveryProgress.percentage === 100 ? "text-primary" : "text-chart-3"}`}>
                        {deliveryProgress.received} / {deliveryProgress.total} items ({deliveryProgress.percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <Progress value={deliveryProgress.percentage} className="h-2" />
                    {deliveryProgress.percentage === 100 &&
                <p className="text-xs text-primary flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> All items received
                      </p>
                }
                  </div>
              }
              </div>
            </td>
          </tr>
        }
      </>);

  };

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["purchase_orders"],
    queryFn: () => base44.entities.PurchaseOrder.list("-created_date", 10000)
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects_for_delivery_summary"],
    queryFn: () => base44.entities.Project.list("project_name", 1000)
  });

  const { data: payables = [] } = useQuery({
    queryKey: ["payables_for_po_check"],
    queryFn: () => base44.entities.Payable.list("-created_date", 500)
  });

  const { data: paymentRequests = [] } = useQuery({
    queryKey: ["payment_requests_for_po_check"],
    queryFn: () => base44.entities.PaymentRequest.list("-created_date", 500)
  });

  const { data: receivingRecords = [] } = useQuery({
    queryKey: ["receiving_items"],
    queryFn: () => base44.entities.ReceivingItem.list("-received_date", 500)
  });

  // Build a map of po_id -> { count, isComplete }
  const receivingByPO = {};
  for (const r of receivingRecords) {
    if (!r.po_id) continue;
    if (!receivingByPO[r.po_id]) receivingByPO[r.po_id] = { count: 0, isComplete: false };
    receivingByPO[r.po_id].count += 1;
    if (r.status === "complete") receivingByPO[r.po_id].isComplete = true;
  }

  // Check which POs have been converted to payables
  const poIdsWithPayables = new Set(
    payables.
    map((p) => p.po_id).
    filter(Boolean)
  );

  // Check which POs have paid payment requests (not just created)
  const poIdsWithPaidRequests = new Set(
    paymentRequests.
    filter((pr) => pr.approval_status === "paid" && pr.supporting_docs).
    map((pr) => {
      const match = pr.supporting_docs.match(/PO:\s*(.+)/);
      return match ? match[1].trim() : null;
    }).
    filter(Boolean)
  );

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PurchaseOrder.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchase_orders"] })
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PurchaseOrder.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchase_orders"] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PurchaseOrder.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["purchase_orders"] })
  });

  const handleDecision = (po, { action, actor, notes }) => {
    const newEntry = {
      step: action === "approved" ? "approved" : action === "rejected" ? "rejected" : "reviewed",
      action,
      actor,
      notes,
      timestamp: new Date().toISOString()
    };
    const history = [...(po.approval_history || []), newEntry];
    updateMutation.mutate({
      id: po.id,
      data: {
        approval_status: action,
        approval_notes: notes,
        approved_by: actor,
        approval_step: action,
        approval_history: history
      }
    });
  };

  const submitChangeRequest = async (po, request) => {
    const entry = {
      ...request,
      requested_by: currentUser?.full_name || currentUser?.email || "Unknown",
      requested_date: new Date().toISOString(),
      status: "pending",
    };
    await updateMutation.mutateAsync({ id: po.id, data: { change_requests: [...(po.change_requests || []), entry] } });
  };

  const decideChangeRequest = async (po, idx, status) => {
    const actor = currentUser?.full_name || currentUser?.email || "Administrator";
    const requests = [...(po.change_requests || [])];
    const cr = requests[idx];
    if (!cr) return;
    requests[idx] = { ...cr, status, reviewed_by: actor, reviewed_date: new Date().toISOString() };

    const data = { change_requests: requests };
    if (status === "approved") {
      if (cr.field === "supplier") {
        data.supplier_name = cr.requested_value;
      } else if (cr.field === "price") {
        data.amount = parseFloat(cr.requested_value) || po.amount;
      } else if (cr.field === "quantity") {
        const newQty = parseFloat(cr.requested_value);
        if (!isNaN(newQty) && po.line_items?.length > 0) {
          const lineItems = po.line_items.map((li) => li.description === cr.line_item_description ?
            { ...li, quantity: newQty, total: newQty * (li.cost_per_item || 0) } : li);
          data.line_items = lineItems;
          data.amount = lineItems.reduce((s, li) => s + (li.total || 0), 0);
        }
      }
    }
    await updateMutation.mutateAsync({ id: po.id, data });
    setReviewingChangesPO((prev) => prev && prev.id === po.id ? { ...po, ...data } : prev);
  };

  const poSuppliers = useMemo(() => [...new Set(orders.map((o) => o.supplier_name).filter(Boolean))].sort(), [orders]);
  const poProjects = useMemo(() => [...new Set(orders.map((o) => o.project_name).filter(Boolean))].sort(), [orders]);

  const filtered = orders.filter((o) => {
    if (statusFilter !== "all" && o.approval_status !== statusFilter) return false;
    if (supplierFilter !== "all" && o.supplier_name !== supplierFilter) return false;
    if (projectFilter !== "all" && o.project_name !== projectFilter) return false;
    if (dateFrom && (!o.requested_date || o.requested_date < dateFrom)) return false;
    if (dateTo && (!o.requested_date || o.requested_date > dateTo)) return false;
    const q = poSearch.toLowerCase();
    if (q && !(o.po_number || "").toLowerCase().includes(q) && !(o.supplier_name || "").toLowerCase().includes(q) && !(o.project_name || "").toLowerCase().includes(q) && !(o.description || "").toLowerCase().includes(q)) return false;
    return true;
  });
  const pending = orders.filter((o) => o.approval_status === "pending");
  const totalPendingValue = pending.reduce((s, o) => s + (o.amount || 0), 0);
  const approved = filtered.filter((o) => o.approval_status === "approved");
  const totalApprovedValue = approved.reduce((s, o) => s + (o.amount || 0), 0);
  const approvedByCategory = approved.reduce((acc, o) => {
    const key = o.category || "other";
    acc[key] = (acc[key] || 0) + (o.amount || 0);
    return acc;
  }, {});



  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAllPending = () => {
    if (selectedIds.size === pending.length && pending.every((p) => selectedIds.has(p.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pending.map((p) => p.id)));
    }
  };

  const bulkApprove = async () => {
    const timestamp = new Date().toISOString();
    const selectedPOs = orders.filter((o) => selectedIds.has(o.id));
    await Promise.all(selectedPOs.map((po) => {
      const newEntry = { step: "approved", action: "approved", actor: "Bulk Approval", notes: "", timestamp };
      return updateMutation.mutateAsync({
        id: po.id,
        data: {
          approval_status: "approved",
          approval_step: "approved",
          approval_history: [...(po.approval_history || []), newEntry]
        }
      });
    }));
    setSelectedIds(new Set());
  };

  // ── Receiving Items tab state ──
  const { data: receivingGroups = [] } = useQuery({
    queryKey: ["receiving_items_tab"],
    queryFn: () => base44.entities.ReceivingItem.list("-received_date", 500)
  });
  const [expandedRIPO, setExpandedRIPO] = useState(null);
  const riByPO = useMemo(() => {
    const map = {};
    for (const item of receivingGroups) {
      const key = item.po_id || item.po_number || "unknown";
      if (!map[key]) map[key] = { po_id: item.po_id, po_number: item.po_number, supplier_name: item.supplier_name, project_name: item.project_name, receipts: [], total_received: 0 };
      map[key].receipts.push(item);
      map[key].total_received += item.total_amount || 0;
    }
    return Object.values(map).sort((a, b) => (b.receipts[0]?.received_date || "").localeCompare(a.receipts[0]?.received_date || ""));
  }, [receivingGroups]);

  // ── Materials History tab state ──
  const { data: poForMaterials = [], isLoading: matLoading } = useQuery({
    queryKey: ["purchase_orders_materials"],
    queryFn: () => base44.entities.PurchaseOrder.list("-requested_date", 10000)
  });
  const [matSearch, setMatSearch] = useState("");
  const [matFilterSupplier, setMatFilterSupplier] = useState("all");
  const [matFilterProject, setMatFilterProject] = useState("all");
  const [matFilterStatus, setMatFilterStatus] = useState("all");

  const allMaterials = useMemo(() => {
    const rows = [];
    poForMaterials.forEach((po) => {
      if (po.line_items?.length > 0) {
        let daysToDeliver = null;
        if (po.requested_date && po.delivery_date) {
          daysToDeliver = Math.round((new Date(po.delivery_date) - new Date(po.requested_date)) / 86400000);
        }
        po.line_items.forEach((item) => rows.push({ ...item, po_number: po.po_number, supplier_name: po.supplier_name, project_name: po.project_name, requested_date: po.requested_date, delivery_date: po.delivery_date, approval_status: po.approval_status, days_to_deliver: daysToDeliver }));
      }
    });
    return rows;
  }, [poForMaterials]);

  const matSuppliers = useMemo(() => [...new Set(allMaterials.map((m) => m.supplier_name).filter(Boolean))].sort(), [allMaterials]);
  const matProjects = useMemo(() => [...new Set(allMaterials.map((m) => m.project_name).filter(Boolean))].sort(), [allMaterials]);
  const filteredMaterials = useMemo(() => allMaterials.filter((m) => {
    const q = matSearch.toLowerCase();
    return (!q || (m.description || "").toLowerCase().includes(q) || (m.supplier_name || "").toLowerCase().includes(q) || (m.po_number || "").toLowerCase().includes(q)) && (
    matFilterSupplier === "all" || m.supplier_name === matFilterSupplier) && (
    matFilterProject === "all" || m.project_name === matFilterProject) && (
    matFilterStatus === "all" || m.approval_status === matFilterStatus);
  }), [allMaterials, matSearch, matFilterSupplier, matFilterProject, matFilterStatus]);

  const matTotalValue = useMemo(() => filteredMaterials.reduce((s, m) => s + (m.total || 0), 0), [filteredMaterials]);

  const MAT_STATUS_STYLES = { approved: "bg-primary/10 text-primary border-primary/20", pending: "bg-chart-3/10 text-chart-3 border-chart-3/20", rejected: "bg-destructive/10 text-destructive border-destructive/20", cancelled: "bg-muted text-muted-foreground border-border" };

  return (
    <div className="p-4 md:p-8 w-full mx-auto space-y-6">
      <Tabs defaultValue="orders" className="w-full space-y-5">
        <section className="rounded-2xl border border-border bg-card p-4 md:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Purchase Orders</h1>
              <p className="text-sm text-muted-foreground mt-1">{pending.length} pending approval · ₱{totalPendingValue.toLocaleString()} pending value</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {approved.length > 0 && <Button variant="outline" onClick={() => setShowApprovedSummary(true)}><ClipboardList className="w-4 h-4 mr-2" /> Approved Summary</Button>}
              <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" /> Print</Button>
              <Button variant="outline" onClick={() => setShowImport(true)}><FileUp className="w-4 h-4 mr-2" /> Import Excel</Button>
              <Button onClick={() => setShowAdd(true)}><Plus className="w-4 h-4 mr-2" /> New PO</Button>
            </div>
          </div>

          <TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-muted/60 p-1">
            <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
            <TabsTrigger value="receiving">Receiving Items</TabsTrigger>
            <TabsTrigger value="materials">Materials History</TabsTrigger>
            <TabsTrigger value="project-summary">Project Summary</TabsTrigger>
            <TabsTrigger value="suppliers">Supplier Masterlist</TabsTrigger>
          </TabsList>

          <div className="border-t border-border pt-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filters</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-2">
              <div className="relative sm:col-span-2 xl:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search PO#, supplier, project..." className="pl-9" value={poSearch} onChange={(e) => setPoSearch(e.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="rejected">Rejected</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent></Select>
              <Select value={supplierFilter} onValueChange={setSupplierFilter}><SelectTrigger><SelectValue placeholder="All Suppliers" /></SelectTrigger><SelectContent><SelectItem value="all">All Suppliers</SelectItem>{poSuppliers.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
              <Select value={projectFilter} onValueChange={setProjectFilter}><SelectTrigger><SelectValue placeholder="All Projects" /></SelectTrigger><SelectContent><SelectItem value="all">All Projects</SelectItem>{poProjects.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
              <div className="flex gap-2 sm:col-span-2 lg:col-span-1 xl:col-span-1">
                <Input type="date" className="min-w-0" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="From date" />
                <Input type="date" className="min-w-0" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="To date" />
              </div>
            </div>
          </div>
        </section>

        <TabsContent value="orders" className="space-y-6">

      {/* Approved PO Summary */}
      {approved.length > 0 &&
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
          {Object.keys(approvedByCategory).length > 0 &&
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mx-auto rounded-none">
              {Object.entries(approvedByCategory).sort((a, b) => b[1] - a[1]).map(([cat, val]) =>
              <div key={cat} className="bg-card border border-border rounded-xl p-3">
                  <p className="text-xs text-muted-foreground capitalize">{cat.replace(/_/g, " ")}</p>
                  <p className="text-sm font-bold text-foreground mt-0.5">₱{val.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{approved.filter((o) => (o.category || "other") === cat).length} PO{approved.filter((o) => (o.category || "other") === cat).length !== 1 ? "s" : ""}</p>
                </div>
              )}
            </div>
            }
        </div>
          }

      {/* Pending banner */}
      {pending.length > 0 &&
          <div className="bg-chart-3/10 border border-chart-3/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-chart-3 flex-shrink-0" />
            <p className="text-sm text-chart-3 font-medium">
              {pending.length} purchase order{pending.length > 1 ? "s" : ""} awaiting approval · ₱{totalPendingValue.toLocaleString()}
            </p>
          </div>
          {isAdmin &&
            <div className="flex items-center gap-3">
              <button onClick={toggleSelectAllPending} className="text-xs text-chart-3 underline underline-offset-2 hover:opacity-80">
                {selectedIds.size === pending.length && pending.length > 0 ? "Deselect all" : "Select all pending"}
              </button>
              {selectedIds.size > 0 &&
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={bulkApprove}>
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Approve {selectedIds.size} PO{selectedIds.size > 1 ? "s" : ""}
                </Button>
              }
            </div>
            }
        </div>
          }

      {/* Pending change requests notification */}
      <PendingChangeRequestsBanner orders={orders} onReview={setReviewingChangesPO} />

      {/* Grouped PO Table */}
      {isLoading ?
          <div className="text-center py-12 text-muted-foreground">Loading...</div> :
          filtered.length === 0 ?
          <div className="text-center py-12 text-muted-foreground">No purchase orders found</div> :

          <GroupedPurchaseOrders
            orders={filtered}
            expandedGroups={expandedGroups}
            toggleGroup={toggleGroup}
            renderPORow={renderPORow} />

          }

        </TabsContent>

        {/* ── Receiving Items Tab ── */}
        <TabsContent value="receiving" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{riByPO.length} PO{riByPO.length !== 1 ? "s" : ""} · {receivingGroups.length} receipt transaction{receivingGroups.length !== 1 ? "s" : ""}</h2>
          </div>
          {riByPO.length === 0 && <p className="text-center py-12 text-muted-foreground">No receiving records yet.</p>}
          {riByPO.length > 0 &&
          <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">PO #</th>
                      <th className="text-left px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">Supplier</th>
                      <th className="text-left px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Project</th>
                      <th className="text-right px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">Receipts</th>
                      <th className="text-right px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">Total Received</th>
                      <th className="text-left px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                      <th className="text-right px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {riByPO.map((group) => {
                      const key = group.po_id || group.po_number || "unknown";
                      const expanded = expandedRIPO === key;
                      const complete = group.receipts.some((r) => r.status === "complete");
                      return (
                        <>
                          <tr key={key} className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer" onClick={() => setExpandedRIPO(expanded ? null : key)}>
                            <td className="px-2 py-1.5 font-mono text-xs text-muted-foreground whitespace-nowrap">{group.po_number || "—"}</td>
                            <td className="px-2 py-1.5 text-xs font-medium text-foreground">{group.supplier_name}</td>
                            <td className="px-2 py-1.5 text-xs text-muted-foreground hidden md:table-cell">{group.project_name || "—"}</td>
                            <td className="px-2 py-1.5 text-xs text-right text-muted-foreground">{group.receipts.length}</td>
                            <td className="px-2 py-1.5 text-xs text-right font-semibold text-foreground">₱{group.total_received.toLocaleString()}</td>
                            <td className="px-2 py-1.5">
                              <Badge variant="outline" className={`text-xs ${complete ? "bg-primary/10 text-primary border-primary/20" : "bg-amber-500/10 text-amber-700 border-amber-200"}`}>
                                {complete ? "Fully Received" : "Partially Received"}
                              </Badge>
                            </td>
                            <td className="px-2 py-1.5 text-right">
                              {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground inline-block" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground inline-block" />}
                            </td>
                          </tr>
                          {expanded &&
                          <tr key={`${key}-expanded`} className="bg-muted/20">
                              <td colSpan={7} className="px-6 py-4">
                                <div className="divide-y divide-border border border-border rounded-lg overflow-hidden bg-card">
                                  {group.receipts.map((receipt) =>
                                <div key={receipt.id} className="px-4 py-3">
                                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                                        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                          <span>Received: <span className="text-foreground font-medium">{receipt.received_date ? format(new Date(receipt.received_date), "MMM d, yyyy") : "—"}</span></span>
                                          {receipt.received_by && <span>By: <span className="text-foreground">{receipt.received_by}</span></span>}
                                          <Badge variant="outline" className={`text-xs ${receipt.status === "complete" ? "bg-primary/10 text-primary border-primary/20" : "bg-amber-500/10 text-amber-700 border-amber-200"}`}>
                                            {receipt.status === "complete" ? "Complete" : "Partial"}
                                          </Badge>
                                        </div>
                                        <span className="text-sm font-bold text-foreground">₱{(receipt.total_amount || 0).toLocaleString()}</span>
                                      </div>
                                      {receipt.line_items?.length > 0 &&
                                  <div className="border border-border rounded-lg overflow-hidden">
                                          <table className="w-full text-xs">
                                            <thead><tr className="bg-muted/50 border-b border-border"><th className="px-3 py-2 text-left font-semibold">Item</th><th className="px-3 py-2 text-right font-semibold">Ordered</th><th className="px-3 py-2 text-right font-semibold">Received</th><th className="px-3 py-2 text-right font-semibold">Total</th></tr></thead>
                                            <tbody>{receipt.line_items.map((li, idx) => <tr key={idx} className="border-b border-border/50 last:border-0"><td className="px-3 py-2">{li.description}</td><td className="px-3 py-2 text-right">{li.quantity_ordered}</td><td className="px-3 py-2 text-right">{li.quantity_received}</td><td className="px-3 py-2 text-right font-semibold">₱{(li.total || 0).toLocaleString()}</td></tr>)}</tbody>
                                          </table>
                                        </div>
                                  }
                                      {receipt.notes && <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-border pl-2">{receipt.notes}</p>}
                                      {receipt.receipt_url && <a href={receipt.receipt_url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary underline">View receipt document</a>}
                                    </div>
                                )}
                                </div>
                              </td>
                            </tr>
                          }
                        </>);

                    })}
                  </tbody>
                </table>
              </div>
            </div>
          }
        </TabsContent>

        {/* ── Materials History Tab ── */}
        <TabsContent value="materials" className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
            { label: "Total Line Items", value: filteredMaterials.length.toLocaleString() },
            { label: "Total Quantity", value: filteredMaterials.reduce((s, m) => s + (m.quantity || 0), 0).toLocaleString() },
            { label: "Total Value", value: `₱${matTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, highlight: true },
            { label: "Unique Materials", value: [...new Set(filteredMaterials.map((m) => (m.description || "").toLowerCase().trim()))].length.toLocaleString() }].
            map((kpi, i) =>
            <div key={i} className="bg-card rounded-xl border border-border p-4">
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className={`text-lg font-bold mt-1 ${kpi.highlight ? "text-primary" : "text-foreground"}`}>{kpi.value}</p>
              </div>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search materials, supplier, PO#..." className="pl-9" value={matSearch} onChange={(e) => setMatSearch(e.target.value)} />
            </div>
            <Select value={matFilterSupplier} onValueChange={setMatFilterSupplier}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All Suppliers" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Suppliers</SelectItem>{matSuppliers.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={matFilterProject} onValueChange={setMatFilterProject}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="All Projects" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Projects</SelectItem>{matProjects.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={matFilterStatus} onValueChange={setMatFilterStatus}>
              <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Statuses</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="rejected">Rejected</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            {matLoading ? <p className="text-center py-16 text-muted-foreground">Loading materials...</p> :
            filteredMaterials.length === 0 ? <p className="text-center py-16 text-muted-foreground">No materials found.</p> :

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Description</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Qty</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Unit Cost</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Total</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Supplier</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Project</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden lg:table-cell">PO #</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden lg:table-cell">Date Requested</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden lg:table-cell">Date Delivered</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden lg:table-cell">Days</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  </tr></thead>
                  <tbody>
                    {filteredMaterials.map((m, i) =>
                  <tr key={i} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "" : "bg-muted/5"}`}>
                        <td className="px-4 py-3 font-medium text-foreground max-w-xs"><span className="line-clamp-2">{m.description || "—"}</span></td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{m.quantity ?? "—"}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">₱{(m.cost_per_item || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground">₱{(m.total || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{m.supplier_name || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{m.project_name || "—"}</td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden lg:table-cell">{m.po_number || "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{m.requested_date || "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{m.delivery_date || "—"}</td>
                        <td className="px-4 py-3 text-right hidden lg:table-cell">
                          {m.days_to_deliver !== null ? <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.days_to_deliver <= 7 ? "bg-primary/10 text-primary" : m.days_to_deliver <= 30 ? "bg-chart-3/10 text-chart-3" : "bg-destructive/10 text-destructive"}`}>{m.days_to_deliver}d</span> : <span className="text-xs text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3"><Badge variant="outline" className={`text-xs ${MAT_STATUS_STYLES[m.approval_status] || MAT_STATUS_STYLES.pending}`}>{m.approval_status || "pending"}</Badge></td>
                      </tr>
                  )}
                  </tbody>
                  <tfoot><tr className="bg-muted/30 border-t border-border">
                    <td className="px-4 py-3 font-semibold text-foreground" colSpan={3}>Total ({filteredMaterials.length} items)</td>
                    <td className="px-4 py-3 text-right font-bold text-primary">₱{matTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td colSpan={7}></td>
                  </tr></tfoot>
                </table>
              </div>
            }
          </div>
        </TabsContent>

        <TabsContent value="project-summary">
          <ProjectDeliverySummary receivingRecords={receivingGroups} orders={orders} projects={projects} />
        </TabsContent>

        <TabsContent value="suppliers">
          <Payees embedded />
        </TabsContent>

      </Tabs>

      {/* Approved PO Summary Dialog */}
      <Dialog open={showApprovedSummary} onOpenChange={(v) => {setShowApprovedSummary(v);if (!v) {setSummarySearch("");setExpandedSummaryPO(null);}}}>
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
              onChange={(e) => setSummarySearch(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
            
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
                {approved.
                filter((po) => {
                  const q = summarySearch.toLowerCase();
                  return !q || (po.supplier_name || "").toLowerCase().includes(q) || (po.po_number || "").toLowerCase().includes(q);
                }).
                map((po) => {
                  const isExpanded = expandedSummaryPO === po.id;
                  const hasItems = po.line_items && po.line_items.length > 0;
                  return (
                    <>
                        <tr
                        key={po.id}
                        className="hover:bg-primary/5 cursor-pointer transition-colors"
                        onClick={() => setExpandedSummaryPO(isExpanded ? null : po.id)}>
                        
                          <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{po.po_number || "—"}</td>
                          <td className="px-3 py-1.5 text-xs font-medium text-foreground flex items-center gap-1">
                            {po.supplier_name}
                            {hasItems && (isExpanded ? <ChevronUp className="w-3 h-3 text-muted-foreground" /> : <ChevronDown className="w-3 h-3 text-muted-foreground" />)}
                          </td>
                          <td className="px-3 py-1.5 text-xs text-right font-semibold text-foreground">₱{(po.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                        {isExpanded &&
                      <>
                            <tr className="bg-muted/30">
                              <th className="px-3 py-1 text-left text-xs font-semibold text-muted-foreground" colSpan={1}></th>
                              <th className="px-3 py-1 text-left text-xs font-semibold text-muted-foreground">Description</th>
                              <th className="px-3 py-1 text-right text-xs font-semibold text-muted-foreground">Qty &nbsp;|&nbsp; Unit Cost &nbsp;|&nbsp; Total</th>
                            </tr>
                            {hasItems ? po.line_items.map((item, idx) =>
                        <tr key={`${po.id}-item-${idx}`} className="bg-muted/10 hover:bg-muted/20">
                                <td className="px-3 py-1 text-xs text-muted-foreground pl-6">↳</td>
                                <td className="px-3 py-1 text-xs text-foreground">{item.description}</td>
                                <td className="px-3 py-1 text-xs text-right text-muted-foreground">
                                  {item.quantity ?? "—"} &nbsp;|&nbsp; ₱{(item.cost_per_item || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} &nbsp;|&nbsp; <span className="font-semibold text-foreground">₱{(item.total || item.quantity * item.cost_per_item || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                </td>
                              </tr>
                        ) :
                        <tr className="bg-muted/10">
                                <td className="px-3 py-1 text-xs text-muted-foreground pl-6">↳</td>
                                <td className="px-3 py-1 text-xs text-muted-foreground" colSpan={2}>{po.description || "No items"}</td>
                              </tr>
                        }
                          </>
                      }
                      </>);

                })}
              </tbody>
            </table>
          </div>
          <div className="pt-3 border-t border-border flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{approved.filter((po) => {const q = summarySearch.toLowerCase();return !q || (po.supplier_name || "").toLowerCase().includes(q) || (po.po_number || "").toLowerCase().includes(q);}).length} of {approved.length} PO{approved.length !== 1 ? "s" : ""}</span>
            <span className="font-bold text-primary text-base">Total: ₱{totalApprovedValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </DialogContent>
      </Dialog>

      <POExcelImportDialog
        open={showImport}
        onOpenChange={setShowImport}
        onImport={async (rows) => {
          await Promise.all(rows.map((r) => createMutation.mutateAsync(r)));
        }} />
      
      <POFormDialog open={showAdd} onOpenChange={setShowAdd} title="New Purchase Order" onSubmit={(data) => createMutation.mutateAsync(data)} />
      <POFormDialog open={!!editingPO} onOpenChange={(v) => {if (!v) setEditingPO(null);}} title="Edit Purchase Order" initialData={editingPO || {}} onSubmit={(data) => updateMutation.mutateAsync({ id: editingPO.id, data })} />
      {reviewPO &&
      <ApprovalWorkflowDialog
        open={!!reviewPO}
        onOpenChange={(v) => !v && setReviewPO(null)}
        title={reviewPO.approval_status === "pending" ? `Review PO — ${reviewPO.supplier_name}` : `PO History — ${reviewPO.supplier_name}`}
        historyOnly={reviewPO.approval_status !== "pending"}
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
        onDecision={(decision) => handleDecision(reviewPO, decision)} />

      }
      <POToPayableDialog
        open={!!convertingPO}
        onOpenChange={(v) => {if (!v) setConvertingPO(null);}}
        po={convertingPO}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
          setConvertingPO(null);
        }} />
      
      <ReceiptUploadDialog
        open={!!uploadingReceipt}
        onOpenChange={(v) => {if (!v) setUploadingReceipt(null);}}
        po={uploadingReceipt}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["purchase_orders"] });
          setUploadingReceipt(null);
        }} />
      
      <ReceiveItemsDialog
        open={!!receivingItems}
        onOpenChange={(v) => {if (!v) setReceivingItems(null);}}
        po={receivingItems} />

      <PurchaseOrderPrintView
        open={!!printingPO}
        onOpenChange={(v) => {if (!v) setPrintingPO(null);}}
        po={printingPO} />

      <ChangeRequestDialog
        open={!!requestingChangePO}
        onOpenChange={(v) => {if (!v) setRequestingChangePO(null);}}
        po={requestingChangePO}
        onSubmit={(request) => submitChangeRequest(requestingChangePO, request)} />

      <ChangeRequestReviewDialog
        open={!!reviewingChangesPO}
        onOpenChange={(v) => {if (!v) setReviewingChangesPO(null);}}
        po={reviewingChangesPO}
        onDecision={(idx, status) => decideChangeRequest(reviewingChangesPO, idx, status)} />

    </div>);

}