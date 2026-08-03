import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ClientPaymentGroup from "./ClientPaymentGroup";

const fmt = (n) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

export default function ClientPaymentTracker({ salesOnly = false }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["property_listings"],
    queryFn: () => base44.entities.PropertyListing.list("-date_closed", 500),
  });

  const { data: allClients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("client_name", 500),
  });
  const clientsById = useMemo(() => Object.fromEntries(allClients.map(c => [c.id, c])), [allClients]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const listing = await base44.entities.PropertyListing.update(id, data);
      if (listing.status === "sold") {
        const salePrice = listing.final_price || listing.asking_price || 0;
        const amountPaid = (listing.payment_history || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
        const linked = listing.receivable_id ? [await base44.entities.Receivable.get(listing.receivable_id)] : await base44.entities.Receivable.filter({ property_listing_id: listing.id }, "-created_date", 1);
        if (linked[0]) await base44.entities.Receivable.update(linked[0].id, {
          amount: salePrice,
          amount_paid: amountPaid,
          status: amountPaid >= salePrice ? "paid" : amountPaid > 0 ? "partially_paid" : "outstanding",
          payment_history: (listing.payment_history || []).map((payment) => ({ collection_date: payment.payment_date, amount: payment.amount, reference: payment.reference || "", notes: payment.notes || payment.payment_method || "Condo sale payment" })),
        });
      }
      return listing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property_listings"] });
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
    },
  });

  const closedListings = useMemo(
    () => listings.filter((l) => salesOnly
      ? l.listing_type === "for_sale" && l.status === "sold"
      : l.status === "sold" || l.status === "leased"),
    [listings, salesOnly]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return closedListings.filter((l) => {
      if (typeFilter !== "all" && l.status !== typeFilter) return false;
      if (q && !(l.buyer_tenant_name || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [closedListings, search, typeFilter]);

  const totals = useMemo(() => {
    let totalDue = 0, totalCollected = 0;
    closedListings.forEach((l) => {
      totalDue += l.final_price || l.asking_price || 0;
      totalCollected += (l.payment_history || []).reduce((s, p) => s + (p.amount || 0), 0);
    });
    return { totalDue, totalCollected, outstanding: totalDue - totalCollected };
  }, [closedListings]);

  const handleAddPayment = (listing, payment) => {
    const history = [...(listing.payment_history || []), payment];
    updateMutation.mutate({ id: listing.id, data: { payment_history: history } });
  };

  const clientGroups = useMemo(() => {
    const groups = {};
    filtered.forEach((l) => {
      const key = l.client_id || l.buyer_tenant_name || "unknown";
      if (!groups[key]) {
        groups[key] = {
          key,
          clientName: l.buyer_tenant_name || "—",
          clientCode: clientsById[l.client_id]?.client_code,
          listings: [],
        };
      }
      groups[key].listings.push(l);
    });
    return Object.values(groups).sort((a, b) => a.clientName.localeCompare(b.clientName));
  }, [filtered, clientsById]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: salesOnly ? "Condo Sales" : "Sold + Leased Clients", value: closedListings.length },
          { label: "Total Value", value: fmt(totals.totalDue) },
          { label: "Total Collected", value: fmt(totals.totalCollected), highlight: true },
          { label: "Outstanding Balance", value: fmt(totals.outstanding) },
        ].map((kpi, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className={`text-lg font-bold mt-1 ${kpi.highlight ? "text-primary" : "text-foreground"}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by client name..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {!salesOnly && <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="leased">Leased</SelectItem>
          </SelectContent>
        </Select>}
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <p className="text-center py-12 text-muted-foreground">Loading...</p>
        ) : clientGroups.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">{salesOnly ? "No condo sales found." : "No sold or leased clients found."}</p>
        ) : (
          clientGroups.map((group) => (
            <ClientPaymentGroup key={group.key} clientName={group.clientName} clientCode={group.clientCode} listings={group.listings} onAddPayment={handleAddPayment} />
          ))
        )}
      </div>
    </div>
  );
}