import ClientPaymentTracker from "@/components/realestate/ClientPaymentTracker";

export default function CondoSales() {
  return (
    <div className="w-full p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Condo Sales</h1>
        <p className="text-muted-foreground mt-1">View final prices, closing fees, VAT, TCP, collections, and outstanding receivables</p>
      </div>
      <ClientPaymentTracker salesOnly />
    </div>
  );
}