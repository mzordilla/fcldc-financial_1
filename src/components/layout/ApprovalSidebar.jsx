import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Clock, ShoppingCart, DollarSign, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { canAccess } from "@/lib/access-control";
import useRoleAccess from "@/hooks/useRoleAccess";

export default function ApprovalSidebar() {
  const [open, setOpen] = useState(false);
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

  const pendingPOs = canViewPOs ? purchaseOrders.filter(po => po.approval_status === "pending").length : 0;
  const pendingPayments = canViewPayments ? paymentRequests.filter(pr => pr.approval_status === "pending").length : 0;
  const totalPending = pendingPOs + pendingPayments;

  if (totalPending === 0) return null;

  return (
    <div className="fixed right-5 bottom-24 md:bottom-8 z-50">
      {/* Popover */}
      {open && (
        <>
          <div className="fixed inset-0" onClick={() => setOpen(false)} />
          <div className="absolute bottom-16 right-0 bg-card border border-border rounded-xl shadow-2xl w-56 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-600">
              <span className="text-white text-sm font-semibold">Pending Approvals</span>
              <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 space-y-1">
              {pendingPOs > 0 && (
                <Link
                  to="/purchase-orders"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-orange-50 transition-colors"
                >
                  <ShoppingCart className="w-4 h-4 text-orange-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground flex-1">Purchase Orders</span>
                  <span className="text-xs font-bold bg-orange-100 text-orange-700 rounded-full px-2 py-0.5">{pendingPOs}</span>
                </Link>
              )}
              {pendingPayments > 0 && (
                <Link
                  to="/payment-approvals"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <DollarSign className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground flex-1">Payment Requests</span>
                  <span className="text-xs font-bold bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">{pendingPayments}</span>
                </Link>
              )}
            </div>
          </div>
        </>
      )}

      {/* Circle button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
        title="Pending Approvals"
      >
        <Clock className="w-6 h-6 text-white" />
        <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold shadow">
          {totalPending}
        </span>
      </button>
    </div>
  );
}