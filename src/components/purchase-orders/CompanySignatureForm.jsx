import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function CompanySignatureForm({ onSaved }) {
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!name.trim() || !file) return setError("Enter a signatory name and choose a signature image.");
    setSaving(true);
    setError("");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.CompanySignature.create({ signatory_name: name.trim(), signatory_title: title.trim(), signature_url: file_url });
      setName(""); setTitle(""); setFile(null);
      form.reset();
      await onSaved();
    } catch (err) {
      setError(err.message || "Could not save the signature.");
    } finally {
      setSaving(false);
    }
  };

  return <form onSubmit={handleSubmit} className="space-y-3">
    <Input placeholder="Authorized signatory name" value={name} onChange={(e) => setName(e.target.value)} />
    <Input placeholder="Position / title" value={title} onChange={(e) => setTitle(e.target.value)} />
    <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} />
    {error && <p className="text-sm text-destructive">{error}</p>}
    <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Signature"}</Button>
  </form>;
}