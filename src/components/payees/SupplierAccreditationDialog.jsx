import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { format } from "date-fns";

const defaultSections = [
  { section_name: "1. General Information", checklist_items: "Company Profile, Organizational Chart, Resume of Key Personnel, List of Customers", remarks: "", finding: "qualified" },
  { section_name: "2. Business Permits/Registration and Licenses", checklist_items: "Business Name Registration, VAT Registration Certificate", remarks: "", finding: "qualified" },
  { section_name: "3. Products and Services", checklist_items: "Products Supplied, Services Supplied", remarks: "", finding: "qualified" },
  { section_name: "4. Facilities and Equipment", checklist_items: "Owned Equipment, Owned Tools, Owned Vehicles, Facility Rent/Owned", remarks: "", finding: "qualified" },
  { section_name: "5. Finance", checklist_items: "Assets, Liabilities, Income Statement, Credit Line Facilities", remarks: "", finding: "qualified" },
  { section_name: "6. Quality and other Standards", checklist_items: "ISO 9001/ISO 14001/OSHAS, Other Standards Used", remarks: "", finding: "qualified" },
];

const defaultForm = (payee) => ({
  payee_id: payee?.id || "",
  supplier_name: payee?.name || "",
  product_line: "",
  address: "",
  tel_nos: "",
  fax_nos: "",
  contact_person: payee?.contact || "",
  date_evaluated: format(new Date(), "yyyy-MM-dd"),
  sections: defaultSections.map(s => ({ ...s })),
  general_remarks_recommendations: "",
  overall_result: "accredited",
  evaluated_by: "",
  approved_by: "",
  doc_code: "FM-FIN-04-01",
});

export default function SupplierAccreditationDialog({ open, onOpenChange, payee }) {
  const [form, setForm] = useState(defaultForm(payee));
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) setForm(defaultForm(payee));
  }, [open, payee]);

  const { data: history = [] } = useQuery({
    queryKey: ["supplier-accreditations", payee?.id],
    queryFn: () => base44.entities.SupplierAccreditation.filter({ payee_id: payee.id }, "-created_date", 10),
    enabled: open && !!payee?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SupplierAccreditation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-accreditations", payee?.id] });
      queryClient.invalidateQueries({ queryKey: ["supplier-accreditations-all"] });
    },
  });

  const setSection = (idx, key, value) => {
    setForm(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) => i === idx ? { ...s, [key]: value } : s),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await createMutation.mutateAsync(form);
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Supplier Accreditation Form — {payee?.name}</DialogTitle>
        </DialogHeader>

        {history.length > 0 && (
          <div className="space-y-1.5 border border-border rounded-lg p-3 bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Past Accreditations</p>
            {history.map(h => (
              <div key={h.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{h.date_evaluated || format(new Date(h.created_date), "yyyy-MM-dd")}</span>
                <Badge variant="outline" className={h.overall_result === "accredited" ? "bg-primary/10 text-primary border-primary/20" : "bg-destructive/10 text-destructive border-destructive/20"}>
                  {h.overall_result === "accredited" ? "Accredited" : "Not Accredited"}
                </Badge>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Name of Business</Label>
              <Input value={form.supplier_name} onChange={e => setForm(p => ({ ...p, supplier_name: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Product Line</Label>
              <Input value={form.product_line} onChange={e => setForm(p => ({ ...p, product_line: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Address</Label>
            <Input value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Tel. Nos.</Label>
              <Input value={form.tel_nos} onChange={e => setForm(p => ({ ...p, tel_nos: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Fax Nos.</Label>
              <Input value={form.fax_nos} onChange={e => setForm(p => ({ ...p, fax_nos: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Date Evaluated</Label>
              <Input type="date" value={form.date_evaluated} onChange={e => setForm(p => ({ ...p, date_evaluated: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Contact Person</Label>
            <Input value={form.contact_person} onChange={e => setForm(p => ({ ...p, contact_person: e.target.value }))} />
          </div>

          <div className="space-y-3">
            {form.sections.map((s, idx) => (
              <div key={s.section_name} className="border border-border rounded-lg p-3 space-y-2">
                <p className="text-sm font-semibold">{s.section_name}</p>
                <p className="text-xs text-muted-foreground">{s.checklist_items}</p>
                <Textarea rows={2} placeholder="Remarks..." value={s.remarks} onChange={e => setSection(idx, "remarks", e.target.value)} />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSection(idx, "finding", "qualified")}
                    className={`flex-1 text-xs px-3 py-1.5 rounded-md border font-medium transition-colors ${s.finding === "qualified" ? "bg-primary/10 text-primary border-primary/30" : "bg-muted text-muted-foreground border-border"}`}
                  >
                    Qualified
                  </button>
                  <button
                    type="button"
                    onClick={() => setSection(idx, "finding", "not_qualified")}
                    className={`flex-1 text-xs px-3 py-1.5 rounded-md border font-medium transition-colors ${s.finding === "not_qualified" ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-muted text-muted-foreground border-border"}`}
                  >
                    Not Qualified
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label>General Remarks and Recommendations</Label>
            <Textarea rows={3} value={form.general_remarks_recommendations} onChange={e => setForm(p => ({ ...p, general_remarks_recommendations: e.target.value }))} />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm(p => ({ ...p, overall_result: p.overall_result === "accredited" ? "not_accredited" : "accredited" }))}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${form.overall_result === "accredited" ? "bg-primary/10 text-primary border-primary/30" : "bg-destructive/10 text-destructive border-destructive/30"}`}
            >
              {form.overall_result === "accredited" ? <ShieldCheck className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
              {form.overall_result === "accredited" ? "Accredited" : "Not Accredited"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Evaluated By</Label>
              <Input value={form.evaluated_by} onChange={e => setForm(p => ({ ...p, evaluated_by: e.target.value }))} placeholder="Procurement and Logistic Officer" />
            </div>
            <div className="space-y-1.5">
              <Label>Approved By</Label>
              <Input value={form.approved_by} onChange={e => setForm(p => ({ ...p, approved_by: e.target.value }))} placeholder="Finance Director" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Accreditation"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}