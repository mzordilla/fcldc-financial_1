import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Loader2, UserPlus } from "lucide-react";

const defaults = {
  units: [], listing_type: "for_sale",
  asking_price: "", status: "active", client_id: "", buyer_tenant_name: "",
  buyer_tenant_contact: "", date_listed: "", date_closed: "", payment_due_date: "",
  final_price: "", agent: "", contract_attachment_url: "", notes: "",
};

export default function ListingFormDialog({ open, onOpenChange, initialData, units = [], onSubmit }) {
  const [form, setForm] = useState(defaults);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const queryClient = useQueryClient();

  const { data: allClients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => base44.entities.Client.list("client_name", 500),
  });
  const clients = allClients.filter(c => c.client_category === "real_estate");

  const createClientMutation = useMutation({
    mutationFn: (name) => base44.entities.Client.create({ client_name: name, client_category: "real_estate" }),
    onSuccess: (newClient) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setForm(f => ({ ...f, client_id: newClient.id, buyer_tenant_name: newClient.client_name }));
      setNewClientName("");
      setShowAddClient(false);
    },
  });

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set("contract_attachment_url", file_url);
    setUploading(false);
  };

  useEffect(() => {
    setForm(initialData ? { ...defaults, ...initialData, units: initialData.units || [] } : defaults);
  }, [initialData, open]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const toggleUnit = (unit) => {
    setForm(f => {
      const exists = f.units.some(u => u.unit_id === unit.id);
      const nextUnits = exists
        ? f.units.filter(u => u.unit_id !== unit.id)
        : [...f.units, { unit_id: unit.id, unit_number: unit.unit_number || "", building: unit.building || "" }];
      return { ...f, units: nextUnits };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await onSubmit({
      ...form,
      asking_price: form.asking_price ? Number(form.asking_price) : undefined,
      final_price: form.final_price ? Number(form.final_price) : undefined,
    });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Listing" : "New Listing"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Units * (select one or more)</Label>
              <div className="border border-input rounded-md max-h-40 overflow-y-auto p-2 space-y-1">
                {units.map(u => {
                  const checked = form.units.some(x => x.unit_id === u.id);
                  return (
                    <label key={u.id} className="flex items-center gap-2 text-sm py-1 px-1 rounded hover:bg-muted/40 cursor-pointer">
                      <Checkbox checked={checked} onCheckedChange={() => toggleUnit(u)} />
                      Unit {u.unit_number}{u.building ? ` — ${u.building}` : ""}
                    </label>
                  );
                })}
              </div>
              {form.units.length === 0 && (
                <p className="text-xs text-destructive">Select at least one unit</p>
              )}
            </div>
            <div className="space-y-1">
              <Label>Listing Type *</Label>
              <Select value={form.listing_type} onValueChange={v => set("listing_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="for_sale">For Sale</SelectItem>
                  <SelectItem value="for_lease">For Lease</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="under_negotiation">Under Negotiation</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="leased">Leased</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="inquiry">Inquiry</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="impasse">Impasse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Asking Price (₱) *</Label>
              <Input type="number" value={form.asking_price} onChange={e => set("asking_price", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Final Price (₱)</Label>
              <Input type="number" value={form.final_price} onChange={e => set("final_price", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Client (Buyer / Tenant) *</Label>
              {!showAddClient ? (
                <div className="flex items-center gap-2">
                  <Select
                    value={form.client_id}
                    onValueChange={v => {
                      const client = clients.find(c => c.id === v);
                      setForm(f => ({
                        ...f,
                        client_id: v,
                        buyer_tenant_name: client?.client_name || "",
                        buyer_tenant_contact: client?.email || client?.phone || f.buyer_tenant_contact,
                      }));
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Select client..." /></SelectTrigger>
                    <SelectContent>
                      {clients.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.client_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => setShowAddClient(true)} title="Add new client">
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    autoFocus
                    placeholder="New client name..."
                    value={newClientName}
                    onChange={e => setNewClientName(e.target.value)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    disabled={!newClientName.trim() || createClientMutation.isPending}
                    onClick={() => createClientMutation.mutate(newClientName.trim())}
                  >
                    {createClientMutation.isPending ? "Adding..." : "Add"}
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddClient(false)}>Cancel</Button>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label>Buyer / Tenant Contact</Label>
              <Input value={form.buyer_tenant_contact} onChange={e => set("buyer_tenant_contact", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Agent / Broker</Label>
              <Input value={form.agent} onChange={e => set("agent", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Date Listed</Label>
              <Input type="date" value={form.date_listed} onChange={e => set("date_listed", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Date Closed</Label>
              <Input type="date" value={form.date_closed} onChange={e => set("date_closed", e.target.value)} />
            </div>
            {form.listing_type === "for_sale" && <div className="space-y-1">
              <Label>Unpaid Balance Due Date</Label>
              <Input type="date" value={form.payment_due_date} onChange={e => set("payment_due_date", e.target.value)} required={form.status === "sold"} />
            </div>}
          </div>
          <div className="space-y-1">
            <Label>Contract</Label>
            {form.contract_attachment_url && (
              <a href={form.contract_attachment_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                <Paperclip className="w-3.5 h-3.5" /> View current contract
              </a>
            )}
            <Input type="file" onChange={e => handleFileUpload(e.target.files?.[0])} disabled={uploading} />
            {uploading && (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</p>
            )}
          </div>
          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || form.units.length === 0}>{saving ? "Saving..." : "Save Listing"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}