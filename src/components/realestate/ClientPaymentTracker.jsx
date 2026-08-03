import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ClientPaymentGroup from "./ClientPaymentGroup";
import CompactClientPaymentGroup from "./CompactClientPaymentGroup";

const fmt = (n) => `₱${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

const unitBreakdown = (units) => units.reduce((totals, unit) => {
  const total = Number(unit.selling_price || 0);
  const vatRate = Number(unit.vat_percentage || 12);
  const closingRate = Number(unit.closing_fees_percentage || 8);
  const base = total / (1 + (vatRate + closingRate) / 100);
  totals.base += base;
  totals.vat += base * vatRate / 100;
  totals.closing += base * closingRate / 100;
  totals.total += total;
  return totals;
}, { base: 0, vat: 0, closing: 0, total: 0 });

export default function ClientPaymentTracker({ salesOnly = false }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: listings = [], isLoading } = useQuery({
    queryKey: ["property_listings"],
    queryFn: () => base44.entities.PropertyListing.list("-date_closed", 500),
  });

  const { data: condoUnits = [], isLoading: isLoadingUnits } = useQuery({
    queryKey: ["condo-units"],
    queryFn: () => base44.entities.CondoUnit.list("-created_date", 500),
    enabled: salesOnly,
  });

  const { data: allClients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("client_name", 500),
  });
  const clientsById = useMemo(() => Object.fromEntries(allClients.map(c => [c.id, c])), [allClients]);
  const buyerClients = useMemo(() => allClients.filter((client) => client.client_category === "real_estate"), [allClients]);

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

  const assignBuyerMutation = useMutation({
    mutationFn: async ({ sale, client }) => {
      const today = new Date().toISOString().slice(0, 10);
      const unitLabel = sale.units.map((unit) => unit.unit_number).filter(Boolean).join(", ");
      const listing = await base44.entities.PropertyListing.create({
        units: sale.units.map((unit) => ({ unit_id: unit.id, unit_number: unit.unit_number, building: unit.building })),
        listing_type: "for_sale",
        asking_price: sale.final_price,
        final_price: sale.final_price,
        status: "sold",
        client_id: client.id,
        buyer_tenant_name: client.client_name,
        buyer_tenant_contact: client.email || client.phone || "",
        date_listed: today,
        date_closed: today,
        payment_due_date: today,
        payment_history: [],
      });
      const receivable = await base44.entities.Receivable.create({
        client_name: client.client_name,
        project_name: `${unitLabel} Condo Sale`,
        invoice_number: `SALE-${listing.id.slice(-8).toUpperCase()}`,
        property_listing_id: listing.id,
        amount: sale.final_price,
        amount_paid: 0,
        due_date: today,
        status: "outstanding",
        payment_history: [],
        notes: `Unpaid balance for sold condo unit(s): ${unitLabel}`,
      });
      await base44.entities.PropertyListing.update(listing.id, { receivable_id: receivable.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["property_listings"] });
      queryClient.invalidateQueries({ queryKey: ["property-listings"] });
      queryClient.invalidateQueries({ queryKey: ["receivables"] });
    },
  });

  const closedListings = useMemo(() => {
    if (!salesOnly) return listings.filter((listing) => listing.status === "sold" || listing.status === "leased");

    const soldUnits = condoUnits.filter((unit) => unit.status === "sold");
    const linkedUnitIds = new Set();
    const linkedSales = listings
      .filter((listing) => listing.listing_type === "for_sale" && listing.status === "sold")
      .map((listing) => {
        const units = soldUnits.filter((unit) => listing.units?.some((linked) => linked.unit_id === unit.id));
        units.forEach((unit) => linkedUnitIds.add(unit.id));
        if (!units.length) return null;
        const breakdown = unitBreakdown(units);
        return { ...listing, units, final_price: breakdown.total, price_breakdown: breakdown, can_record_payment: true };
      })
      .filter(Boolean);

    const unlinkedSales = soldUnits
      .filter((unit) => !linkedUnitIds.has(unit.id))
      .map((unit) => {
        const breakdown = unitBreakdown([unit]);
        return {
          id: `unit-${unit.id}`,
          units: [unit],
          listing_type: "for_sale",
          status: "sold",
          buyer_tenant_name: "Unassigned Buyer",
          final_price: breakdown.total,
          price_breakdown: breakdown,
          payment_history: [],
          can_record_payment: false,
        };
      });

    return [...linkedSales, ...unlinkedSales];
  }, [listings, condoUnits, salesOnly]);

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
    if (listing.can_record_payment === false) return;
    const history = [...(listing.payment_history || []), payment];
    updateMutation.mutate({ id: listing.id, data: { payment_history: history } });
  };

  const handleAssignBuyer = (sale, client) => assignBuyerMutation.mutateAsync({ sale, client });

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

      <div className={salesOnly ? "overflow-x-auto" : "space-y-3"}>
        {isLoading || (salesOnly && isLoadingUnits) ? (
          <p className="text-center py-12 text-muted-foreground">Loading...</p>
        ) : clientGroups.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">{salesOnly ? "No condo sales found." : "No sold or leased clients found."}</p>
        ) : salesOnly ? (
          <div className="min-w-[1280px]">
            <div className="grid grid-cols-[1.5fr_1.2fr_1fr_1fr_1fr_1fr_1fr_7rem_2.5rem] gap-3 px-5 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              <span>Buyer</span><span>Units</span><span className="text-right">Closing Fees (8%)</span><span className="text-right">VAT (12%)</span><span className="text-right">Final Price</span><span className="text-right">Collected</span><span className="text-right">Balance</span><span className="text-center">Status</span><span />
            </div>
            <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border max-h-[70vh] overflow-y-auto">
              {clientGroups.map((group) => (
                <CompactClientPaymentGroup key={group.key} clientName={group.clientName} listings={group.listings} clients={buyerClients} onAddPayment={handleAddPayment} onAssignBuyer={handleAssignBuyer} />
              ))}
            </div>
          </div>
        ) : (
          clientGroups.map((group) => (
            <ClientPaymentGroup key={group.key} clientName={group.clientName} clientCode={group.clientCode} listings={group.listings} clients={buyerClients} onAddPayment={handleAddPayment} onAssignBuyer={handleAssignBuyer} />
          ))
        )}
      </div>
    </div>
  );
}