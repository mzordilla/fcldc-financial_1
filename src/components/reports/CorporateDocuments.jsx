import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Upload, Trash2, Download, FileText, Search, Plus, X, FolderOpen, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, isPast, isWithinInterval, addDays } from "date-fns";

const CATEGORIES = [
  { value: "permits", label: "Permits", color: "bg-amber-100 text-amber-700 border-amber-200" },
  { value: "licenses", label: "Licenses", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "contracts", label: "Contracts", color: "bg-purple-100 text-purple-700 border-purple-200" },
  { value: "financial", label: "Financial", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { value: "legal", label: "Legal", color: "bg-rose-100 text-rose-700 border-rose-200" },
  { value: "hr", label: "HR", color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { value: "other", label: "Other", color: "bg-slate-100 text-slate-700 border-slate-200" },
];

const getCategoryStyle = (cat) => CATEGORIES.find(c => c.value === cat)?.color || "bg-slate-100 text-slate-700";
const getCategoryLabel = (cat) => CATEGORIES.find(c => c.value === cat)?.label || cat;

function ExpiryBadge({ date }) {
  if (!date) return null;
  const d = new Date(date);
  const expired = isPast(d);
  const expiringSoon = !expired && isWithinInterval(d, { start: new Date(), end: addDays(new Date(), 30) });
  if (expired) return <span className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Expired {format(d, "MMM d, yyyy")}</span>;
  if (expiringSoon) return <span className="text-xs text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Expires {format(d, "MMM d, yyyy")}</span>;
  return <span className="text-xs text-muted-foreground">Expires {format(d, "MMM d, yyyy")}</span>;
}

export default function CorporateDocuments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const [form, setForm] = useState({ name: "", category: "other", description: "", expiry_date: "", issued_by: "", tags: "" });
  const [selectedFile, setSelectedFile] = useState(null);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["corporate_documents"],
    queryFn: () => base44.entities.CorporateDocument.list("-created_date", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CorporateDocument.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["corporate_documents"] }); setShowAdd(false); resetForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CorporateDocument.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["corporate_documents"] }),
  });

  const resetForm = () => {
    setForm({ name: "", category: "other", description: "", expiry_date: "", issued_by: "", tags: "" });
    setSelectedFile(null);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    if (!form.name) setForm(f => ({ ...f, name: file.name.replace(/\.[^/.]+$/, "") }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name) return;
    setUploading(true);
    let file_url = "";
    let file_name = "";
    if (selectedFile) {
      const result = await base44.integrations.Core.UploadFile({ file: selectedFile });
      file_url = result.file_url;
      file_name = selectedFile.name;
    }
    await createMutation.mutateAsync({
      ...form,
      file_url,
      file_name,
      uploaded_by: user?.full_name || user?.email || "Unknown",
    });
    setUploading(false);
  };

  const filtered = docs.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = !q || (d.name || "").toLowerCase().includes(q) || (d.description || "").toLowerCase().includes(q) || (d.tags || "").toLowerCase().includes(q) || (d.issued_by || "").toLowerCase().includes(q);
    const matchCat = catFilter === "all" || d.category === catFilter;
    return matchSearch && matchCat;
  });

  const counts = docs.reduce((acc, d) => { acc[d.category] = (acc[d.category] || 0) + 1; return acc; }, {});
  const expiredCount = docs.filter(d => d.expiry_date && isPast(new Date(d.expiry_date))).length;
  const expiringSoonCount = docs.filter(d => d.expiry_date && !isPast(new Date(d.expiry_date)) && isWithinInterval(new Date(d.expiry_date), { start: new Date(), end: addDays(new Date(), 30) })).length;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Total Documents</p>
          <p className="text-2xl font-bold text-foreground mt-1">{docs.length}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">Categories</p>
          <p className="text-2xl font-bold text-foreground mt-1">{Object.keys(counts).length}</p>
        </div>
        {expiredCount > 0 && (
          <div className="bg-destructive/10 rounded-xl border border-destructive/20 p-4">
            <p className="text-xs text-destructive">Expired</p>
            <p className="text-2xl font-bold text-destructive mt-1">{expiredCount}</p>
          </div>
        )}
        {expiringSoonCount > 0 && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <p className="text-xs text-amber-600">Expiring Soon</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{expiringSoonCount}</p>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-3 flex-1 w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search documents..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label} {counts[c.value] ? `(${counts[c.value]})` : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-2" /> Upload Document
        </Button>
      </div>

      {/* Document List */}
      {isLoading ? (
        <p className="text-center py-16 text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No documents found</p>
          <p className="text-sm mt-1">Upload your first corporate document</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Document</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden sm:table-cell">Issued By</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden md:table-cell">Expiry</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden lg:table-cell">Uploaded By</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase hidden lg:table-cell">Date</th>
                <th className="w-24"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map(doc => (
                <tr key={doc.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <div>
                        <p className="font-medium text-foreground">{doc.name}</p>
                        {doc.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{doc.description}</p>}
                        {doc.tags && <p className="text-xs text-muted-foreground/60 mt-0.5">{doc.tags}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={`text-xs ${getCategoryStyle(doc.category)}`}>{getCategoryLabel(doc.category)}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground hidden sm:table-cell">{doc.issued_by || "—"}</td>
                  <td className="px-4 py-3 hidden md:table-cell"><ExpiryBadge date={doc.expiry_date} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{doc.uploaded_by || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">{doc.created_date ? format(new Date(doc.created_date), "MMM d, yyyy") : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" title="Download">
                          <Download className="w-4 h-4 text-muted-foreground hover:text-primary transition-colors" />
                        </a>
                      )}
                      <button onClick={() => deleteMutation.mutate(doc.id)} title="Delete">
                        <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive transition-colors" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showAdd} onOpenChange={(v) => { setShowAdd(v); if (!v) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Upload className="w-5 h-5 text-primary" /> Upload Corporate Document</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            {/* File picker */}
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium text-foreground">{selectedFile.name}</span>
                  <button type="button" onClick={e => { e.stopPropagation(); setSelectedFile(null); fileRef.current.value = ""; }}>
                    <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Click to select a file</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">PDF, Word, Excel, images supported</p>
                </>
              )}
              <input ref={fileRef} type="file" className="hidden" onChange={handleFileChange} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Document Name *</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Business Permit 2025" required />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Category *</label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Expiry Date</label>
                <Input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Issued By</label>
                <Input value={form.issued_by} onChange={e => setForm(f => ({ ...f, issued_by: e.target.value }))} placeholder="e.g. BIR, City Hall" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Tags</label>
                <Input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="e.g. 2025, tax, BIR" />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Brief description" />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => { setShowAdd(false); resetForm(); }}>Cancel</Button>
              <Button type="submit" disabled={uploading || createMutation.isPending}>
                {uploading ? "Uploading..." : "Save Document"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}