import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { Paperclip, Loader2 } from "lucide-react";

export default function AddFormDialog({ open, onOpenChange, title, fields, onSubmit, initialData }) {
  const [formData, setFormData] = useState(initialData || {});
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);

  const handleFileUpload = async (fieldName, file) => {
    if (!file) return;
    setUploadingField(fieldName);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setFormData(prev => ({ ...prev, [fieldName]: file_url }));
    setUploadingField(null);
  };

  useEffect(() => {
    if (open) setFormData(initialData || {});
  }, [open, initialData]);

  const isVisible = (field) => !field.showWhen || field.showWhen.values.includes(formData[field.showWhen.field]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const cleanedData = {};
    fields.filter(isVisible).forEach(field => {
      let value = formData[field.name];
      if (field.type === "number" && value !== "" && value !== null && value !== undefined) {
        value = parseFloat(value) || 0;
      }
      if (value !== "" && value !== null && value !== undefined) {
        cleanedData[field.name] = value;
      }
    });
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
          {fields.filter(isVisible).map((field) => (
            <div key={field.name} className="space-y-1.5">
              <Label className="text-sm">{field.label}</Label>
              {field.type === "file" ? (
                <div className="space-y-1.5">
                  {formData[field.name] && (
                    <a href={formData[field.name]} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                      <Paperclip className="w-3.5 h-3.5" /> View current file
                    </a>
                  )}
                  <Input
                    type="file"
                    onChange={(e) => handleFileUpload(field.name, e.target.files?.[0])}
                    disabled={uploadingField === field.name}
                  />
                  {uploadingField === field.name && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="w-3 h-3 animate-spin" /> Uploading...</p>
                  )}
                </div>
              ) : field.type === "textarea" ? (
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
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}