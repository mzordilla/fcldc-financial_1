import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function Field({ label, ...props }) {
  return <div><Label>{label}</Label><Input {...props} /></div>;
}

export default function InsuranceRegistrationFields({ form, set, suppliers = [] }) {
  return <>
    <div className="sm:col-span-2 border-t border-border pt-3"><p className="text-sm font-semibold text-foreground">Insurance</p></div>
    <Field label="Insurance Premium" type="number" min="0" step="0.01" value={form.insurance_cost || ""} onChange={e => set("insurance_cost", e.target.value)} />
    <div><Label>Insurance Provider</Label><Select value={form.insurance_provider || ""} onValueChange={value => set("insurance_provider", value)}><SelectTrigger><SelectValue placeholder="Select from supplier masterlist" /></SelectTrigger><SelectContent>{suppliers.map(supplier => <SelectItem key={supplier.id} value={supplier.name}>{supplier.name}</SelectItem>)}</SelectContent></Select></div>
    <Field label="Policy Number" value={form.insurance_policy_number || ""} onChange={e => set("insurance_policy_number", e.target.value)} />
    <Field label="Insurance Expiry / Renewal" type="date" value={form.insurance_expiry_date || ""} onChange={e => set("insurance_expiry_date", e.target.value)} />
    <div className="sm:col-span-2 border-t border-border pt-3"><p className="text-sm font-semibold text-foreground">Registration</p></div>
    <Field label="Registration Fee" type="number" min="0" step="0.01" value={form.registration_cost || ""} onChange={e => set("registration_cost", e.target.value)} />
    <Field label="Registration Number" value={form.registration_number || ""} onChange={e => set("registration_number", e.target.value)} />
    <Field label="Registration Expiry / Renewal" type="date" value={form.registration_expiry_date || ""} onChange={e => set("registration_expiry_date", e.target.value)} />
  </>;
}