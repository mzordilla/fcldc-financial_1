import { Package, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PendingReceiptBanner({ awaitingReceipt = [], readyToPay = [], onShowAwaitingReceipt, onShowReadyToPay }) {
  if (awaitingReceipt.length === 0 && readyToPay.length === 0) return null;

  const awaitingValue = awaitingReceipt.reduce((s, o) => s + (o.amount || 0), 0);
  const payValue = readyToPay.reduce((s, o) => s + (o.amount || 0), 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {awaitingReceipt.length > 0 &&
        <div className="rounded-2xl border border-chart-2/20 bg-chart-2/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-chart-2 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-chart-2">{awaitingReceipt.length} approved PO{awaitingReceipt.length > 1 ? "s" : ""} for receiving — no receipt uploaded</p>
              <p className="text-xs text-muted-foreground mt-0.5">₱{awaitingValue.toLocaleString()} cannot be paid until a receipt is attached</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={onShowAwaitingReceipt}>Show these</Button>
        </div>
      }
      {readyToPay.length > 0 &&
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-primary flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-primary">{readyToPay.length} PO{readyToPay.length > 1 ? "s" : ""} received and ready to pay</p>
              <p className="text-xs text-muted-foreground mt-0.5">₱{payValue.toLocaleString()} awaiting payment</p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={onShowReadyToPay}>Show these</Button>
        </div>
      }
    </div>
  );
}