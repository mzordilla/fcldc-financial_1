import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Clock } from "lucide-react";
import { Link } from "react-router-dom";

export default function ApprovalSidebar() {
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchase_orders_approvals"],
    queryFn: () => base44.entities.PurchaseOrder.list("-created_date", 100),
  });

  const { data: paymentRequests = [] } = useQuery({
    queryKey: ["payment_requests_approvals"],
    queryFn: () => base44.entities.PaymentRequest.list("-created_date", 100),
  });

  const pendingPOs = purchaseOrders.filter(po => po.approval_status === "pending");
  const pendingPayments = paymentRequests.filter(pr => pr.approval_status === "pending");
  const totalPending = pendingPOs.length + pendingPayments.length;

  if (totalPending === 0) return null;

  return (
    <Link
      to="/payment-approvals"
      className="fixed right-5 bottom-24 md:bottom-8 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
      title="Pending Approvals"
    >
      <Clock className="w-6 h-6 text-white" />
      <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold shadow">
        {totalPending}
      </span>
    </Link>
  );
}