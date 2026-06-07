import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle, Clock, XCircle, ChevronRight, ShoppingCart, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function ApprovalSidebar() {
  const [isOpen, setIsOpen] = useState(true);

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

  if (totalPending === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 top-20 z-40">
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-80">
        <CollapsibleTrigger asChild>
          <Button 
            variant="default" 
            className="h-12 px-4 rounded-full shadow-lg bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700"
          >
            <Clock className="w-5 h-5 mr-2" />
            <span className="font-semibold">Approvals</span>
            <Badge className="ml-2 bg-white text-orange-600 hover:bg-white/90">
              {totalPending}
            </Badge>
            <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${isOpen ? "rotate-90" : ""}`} />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="mt-2">
          <div className="bg-card border border-border rounded-xl shadow-xl overflow-hidden">
            <div className="p-4 bg-gradient-to-r from-orange-500 to-amber-600">
              <h3 className="font-bold text-white text-lg">Pending Approvals</h3>
              <p className="text-white/80 text-sm">{totalPending} items awaiting your review</p>
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-border">
              {/* Purchase Orders */}
              {pendingPOs.length > 0 && (
                <div className="p-3 bg-orange-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <ShoppingCart className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-semibold text-orange-900">Purchase Orders</span>
                    <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                      {pendingPOs.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {pendingPOs.slice(0, 5).map(po => (
                      <div key={po.id} className="bg-white rounded-lg p-3 border border-orange-200 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{po.po_number || "PO"}</p>
                            <p className="text-xs text-gray-500 truncate">{po.supplier_name}</p>
                            <p className="text-xs font-semibold text-orange-600 mt-1">
                              ₱{(po.amount || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full mt-2 h-8 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                          onClick={() => window.location.href = `/payment-approvals`}
                        >
                          Review
                        </Button>
                      </div>
                    ))}
                    {pendingPOs.length > 5 && (
                      <p className="text-xs text-center text-gray-500 mt-2">
                        +{pendingPOs.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Requests */}
              {pendingPayments.length > 0 && (
                <div className="p-3 bg-blue-50/50">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-900">Payment Requests</span>
                    <Badge variant="outline" className="text-xs border-blue-300 text-blue-700">
                      {pendingPayments.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {pendingPayments.slice(0, 5).map(pr => (
                      <div key={pr.id} className="bg-white rounded-lg p-3 border border-blue-200 shadow-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{pr.request_number || "Request"}</p>
                            <p className="text-xs text-gray-500 truncate">{pr.payee}</p>
                            <p className="text-xs font-semibold text-blue-600 mt-1">
                              ₱{(pr.amount || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="w-full mt-2 h-8 text-xs border-blue-300 text-blue-700 hover:bg-blue-50"
                          onClick={() => window.location.href = `/payment-approvals`}
                        >
                          Review
                        </Button>
                      </div>
                    ))}
                    {pendingPayments.length > 5 && (
                      <p className="text-xs text-center text-gray-500 mt-2">
                        +{pendingPayments.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border bg-muted/30">
              <Button 
                variant="default" 
                className="w-full"
                onClick={() => window.location.href = `/payment-approvals`}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                View All Approvals
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}