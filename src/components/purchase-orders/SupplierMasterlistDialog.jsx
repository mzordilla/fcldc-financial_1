import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Building2, Phone, CreditCard, Receipt, ShieldCheck, ShieldOff } from "lucide-react";
import { useState, useMemo } from "react";

const categoryStyles = {
  supplier: "bg-chart-1/10 text-chart-1 border-chart-1/20",
  subcontractor: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  employee: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  government: "bg-chart-4/10 text-chart-4 border-chart-4/20",
  utility: "bg-chart-5/10 text-chart-5 border-chart-5/20",
  other: "bg-muted text-muted-foreground border-border",
};

export default function SupplierMasterlistDialog({ open, onOpenChange }) {
  const [search, setSearch] = useState("");

  const { data: payees = [], isLoading } = useQuery({
    queryKey: ["payees_masterlist"],
    queryFn: () => base44.entities.Payee.list("-created_date", 500),
  });

  const filtered = useMemo(() => {
    if (!search) return payees;
    const q = search.toLowerCase();
    return payees.filter(p =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q) ||
      (p.chart_of_account || "").toLowerCase().includes(q) ||
      (p.bank_account_name || "").toLowerCase().includes(q)
    );
  }, [payees, search]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Supplier Masterlist
          </DialogTitle>
        </DialogHeader>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, category, bank account..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto mt-3 rounded-xl border border-border">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {search ? "No suppliers match your search." : "No suppliers in masterlist."}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((payee) => (
                <div key={payee.id} className="p-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{payee.name}</h3>
                        {payee.category && (
                          <Badge variant="outline" className={`text-xs capitalize ${categoryStyles[payee.category] || categoryStyles.other}`}>
                            {payee.category.replace(/_/g, " ")}
                          </Badge>
                        )}
                        {payee.vat_status === "vat" ? (
                          <span className="text-xs text-primary flex items-center gap-1"><Receipt className="w-3 h-3" /> VAT</span>
                        ) : payee.vat_status === "non_vat" ? (
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><Receipt className="w-3 h-3" /> Non-VAT</span>
                        ) : null}
                        {payee.is_accredited ? (
                          <span className="text-xs text-primary flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Accredited</span>
                        ) : (
                          <span className="text-xs text-muted-foreground flex items-center gap-1"><ShieldOff className="w-3 h-3" /> Not Accredited</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-muted-foreground">
                        {payee.chart_of_account && <span>COA: {payee.chart_of_account}</span>}
                        {payee.terms_of_payment && <span>Terms: {payee.terms_of_payment}</span>}
                        {payee.credit_limit !== undefined && payee.credit_limit !== null && (
                          <span>Credit Limit: ₱{payee.credit_limit.toLocaleString()}</span>
                        )}
                      </div>
                      {(payee.bank_account_name || payee.bank_account_number) && (
                        <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                          <CreditCard className="w-3 h-3" />
                          <span>{payee.bank_account_name}{payee.bank_account_number ? ` — ${payee.bank_account_number}` : ""}</span>
                        </div>
                      )}
                      {payee.contact && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span>{payee.contact}</span>
                        </div>
                      )}
                      {payee.notes && (
                        <p className="text-xs text-muted-foreground mt-1.5 italic border-l-2 border-border pl-2 line-clamp-2">{payee.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-2 text-xs text-muted-foreground text-center">
          {filtered.length} supplier{filtered.length !== 1 ? "s" : ""} in masterlist
        </div>
      </DialogContent>
    </Dialog>
  );
}