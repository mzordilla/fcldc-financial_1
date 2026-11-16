import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { canAccess } from "@/lib/access-control";
import useRoleAccess from "@/hooks/useRoleAccess";

export default function usePendingApprovals() {
  const { user } = useAuth();
  const { config, isLoading } = useRoleAccess();
  const role = user?.role?.toLowerCase();
  const canViewPOs = canAccess(role, "/purchase-orders", config);
  const canViewPayments = canAccess(role, "/payment-approvals", config);

  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchase_orders_approvals"],
    queryFn: () => base44.entities.PurchaseOrder.list("-created_date", 100),
    enabled: !isLoading && canViewPOs,
  });

  const { data: paymentRequests = [] } = useQuery({
    queryKey: ["payment_requests_approvals"],
    queryFn: () => base44.entities.PaymentRequest.list("-created_date", 100),
    enabled: !isLoading && canViewPayments,
  });

  const canViewBillings = canAccess(role, "/receivables", config);
  const { data: pendingBillings = 0 } = useQuery({
    queryKey: ["billing_cycles", "pending_count"],
    queryFn: () => base44.entities.BillingCycle.count({ approval_status: "pending" }),
    enabled: !isLoading && canViewBillings,
  });

  const pendingPOs = canViewPOs ? purchaseOrders.filter(po => po.approval_status === "pending").length : 0;
  const pendingPayments = canViewPayments ? paymentRequests.filter(pr => pr.approval_status === "pending").length : 0;
  return { pendingPOs, pendingPayments, pendingBillings, totalPending: pendingPOs + pendingPayments + pendingBillings };
}