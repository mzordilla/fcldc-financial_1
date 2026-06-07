import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ReceivableFormDialog({ open, onOpenChange, title, fields, onSubmit, initialData }) {
  const [formData, setFormData] = useState(initialData || {});
  const [saving, setSaving] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date", 100),
    enabled: open,
  });

  useEffect(() => {
    if (open) setFormData(initialData || {});
  }, [open, initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const cleanedData = {};
    fields.forEach(field => {
      let value = formData[field.name];
      if (field.type === "number" && value !== "" && value !== null && value !== undefined) {
        value = parseFloat(value) || 0;
      }
      if (value !== "" && value !== null && value !== undefined) {
        cleanedData[field.name] = value;
      }
    });
    // Use project_code instead of project_name
    cleanedData.project_name = formData.project_name;
    await onSubmit(cleanedData);
    setSaving(false);
    setFormData({});
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.name} className="space-y-1.5">
              <Label className="text-sm">{field.label}</Label>
              {field.type === "textarea" ? (
                <Textarea
                  rows={field.rows || 4}
                  placeholder={field.placeholder}
                  value={formData[field.name] ?? ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                  required={field.required}
                />
              ) : field.type === "select" ? (
                <Select
                  value={formData[field.name] || ""}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, [field.name]: val }))}
                >
                  <SelectTrigger><SelectValue placeholder={`Select ${field.label.toLowerCase()}`} /></SelectTrigger>
                  <SelectContent>
                    {field.options.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={field.type || "text"}
                  step={field.type === "number" ? "0.01" : undefined}
                  placeholder={field.placeholder}
                  value={formData[field.name] ?? ""}
                  onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: field.type === "number" ? parseFloat(e.target.value) || "" : e.target.value }))}
                  required={field.required}
                />
              )}
            </div>
          ))}
          
          <div className="space-y-1.5">
            <Label className="text-sm">Project Code <span className="text-destructive">*</span></Label>
            <Select
              value={formData.project_name || ""}
              onValueChange={(val) => {
                const project = projects.find(p => p.project_code === val);
                setFormData(prev => ({
                  ...prev,
                  project_name: val,
                  client_name: project?.client_name || prev.client_name
                }));
              }}
            >
              <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
              <SelectContent>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.project_code}>{p.project_code} ({p.project_name})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || !formData.project_name}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}