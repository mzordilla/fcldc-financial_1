import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Trash2, Building2, Phone, Mail, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddFormDialog from "../components/shared/AddFormDialog";

const statusStyles = {
  active: "bg-primary/10 text-primary border-primary/20",
  inactive: "bg-muted text-muted-foreground border-border",
  on_hold: "bg-chart-3/10 text-chart-3 border-chart-3/20",
};

const categoryColors = {
  materials: "bg-chart-2/10 text-chart-2",
  equipment: "bg-chart-4/10 text-chart-4",
  subcontractor: "bg-chart-1/10 text-chart-1",
  services: "bg-chart-3/10 text-chart-3",
  utilities: "bg-muted text-muted-foreground",
  other: "bg-muted text-muted-foreground",
};

const fields = [
  { name: "name", label: "Supplier Name", required: true, placeholder: "e.g. SteelCo Supplies" },
  { name: "contact_name", label: "Contact Person", placeholder: "e.g. John Smith" },
  { name: "email", label: "Email", type: "email", placeholder: "contact@supplier.com" },
  { name: "phone", label: "Phone", placeholder: "+1 555 000 0000" },
  { name: "category", label: "Category", type: "select", options: [
    { value: "materials", label: "Materials" },
    { value: "equipment", label: "Equipment" },
    { value: "subcontractor", label: "Subcontractor" },
    { value: "services", label: "Services" },
    { value: "utilities", label: "Utilities" },
    { value: "other", label: "Other" },
  ]},
  { name: "payment_terms", label: "Payment Terms", type: "select", options: [
    { value: "net_7", label: "Net 7" },
    { value: "net_15", label: "Net 15" },
    { value: "net_30", label: "Net 30" },
    { value: "net_60", label: "Net 60" },
    { value: "cod", label: "Cash on Delivery" },
    { value: "prepaid", label: "Prepaid" },
  ]},
  { name: "credit_limit", label: "Credit Limit ($)", type: "number", placeholder: "0.00" },
  { name: "outstanding_balance", label: "Outstanding Balance ($)", type: "number", placeholder: "0.00" },
  { name: "status", label: "Status", type: "select", options: [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
    { value: "on_hold", label: "On Hold" },
  ]},
  { name: "notes", label: "Notes", placeholder: "Any additional notes..." },
];

export default function Suppliers() {
  const [showAdd, setShowAdd] = useState(false);
  const [catFilter, setCatFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => base44.entities.Supplier.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Supplier.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Supplier.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });

  const filtered = catFilter === "all" ? suppliers : suppliers.filter(s => s.category === catFilter);
  const totalOutstanding = suppliers.reduce((s, sup) => s + (sup.outstanding_balance || 0), 0);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground mt-1">
            {suppliers.filter(s => s.status === "active").length} active · ${totalOutstanding.toLocaleString()} total owed
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="materials">Materials</SelectItem>
              <SelectItem value="equipment">Equipment</SelectItem>
              <SelectItem value="subcontractor">Subcontractor</SelectItem>
              <SelectItem value="services">Services</SelectItem>
              <SelectItem value="utilities">Utilities</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Supplier
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading && <p className="text-muted-foreground col-span-full text-center py-12">Loading...</p>}
        {!isLoading && filtered.length === 0 && <p className="text-muted-foreground col-span-full text-center py-12">No suppliers yet</p>}
        {filtered.map((s) => (
          <div key={s.id} className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{s.name}</h3>
                  {s.contact_name && <p className="text-xs text-muted-foreground">{s.contact_name}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className={`text-xs ${statusStyles[s.status] || ""}`}>
                  <CircleDot className="w-2.5 h-2.5 mr-1" />
                  {(s.status || "active").replace(/_/g, " ")}
                </Badge>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {s.category && (
                <Badge className={`text-xs ${categoryColors[s.category] || ""}`}>
                  {s.category}
                </Badge>
              )}
              {s.payment_terms && (
                <Badge variant="secondary" className="text-xs">
                  {s.payment_terms.replace(/_/g, " ").toUpperCase()}
                </Badge>
              )}
            </div>

            <div className="space-y-1.5 mb-4">
              {s.email && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" /> {s.email}
                </div>
              )}
              {s.phone && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" /> {s.phone}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border">
              <div className="text-xs text-muted-foreground">
                {s.credit_limit ? `Credit: $${(s.credit_limit).toLocaleString()}` : "No credit limit"}
              </div>
              <div className="flex items-center gap-2">
                {s.outstanding_balance > 0 && (
                  <span className="text-sm font-semibold text-destructive">-${(s.outstanding_balance).toLocaleString()}</span>
                )}
                <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(s.id)} className="text-muted-foreground hover:text-destructive h-7 w-7">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <AddFormDialog
        open={showAdd}
        onOpenChange={setShowAdd}
        title="Add Supplier"
        fields={fields}
        onSubmit={(data) => createMutation.mutateAsync(data)}
      />
    </div>
  );
}