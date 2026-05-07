import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Upload, Camera, CheckCircle2, AlertCircle, Loader2, ReceiptText, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

const CATEGORIES = [
  { value: "material_cost", label: "Material Cost" },
  { value: "labor", label: "Labor" },
  { value: "equipment", label: "Equipment" },
  { value: "subcontractor", label: "Subcontractor" },
  { value: "overhead", label: "Overhead" },
  { value: "permits", label: "Permits" },
  { value: "insurance", label: "Insurance" },
  { value: "other", label: "Other" },
];

function ReceiptCard({ result, onConfirm, onDiscard }) {
  const [edited, setEdited] = useState({ ...result.extracted });
  const set = (k, v) => setEdited(prev => ({ ...prev, [k]: v }));

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2">
        {/* Receipt image preview */}
        <div className="bg-muted/30 flex items-center justify-center p-4 min-h-48">
          <img
            src={result.previewUrl}
            alt="Receipt"
            className="max-h-64 max-w-full object-contain rounded-lg shadow"
          />
        </div>

        {/* Extracted data form */}
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {result.confidence === "high" ? (
                <CheckCircle2 className="w-4 h-4 text-primary" />
              ) : (
                <AlertCircle className="w-4 h-4 text-chart-3" />
              )}
              <span className="text-sm font-medium text-foreground">Extracted Data</span>
              <Badge variant="outline" className={`text-xs ${result.confidence === "high" ? "text-primary border-primary/30" : "text-chart-3 border-chart-3/30"}`}>
                {result.confidence} confidence
              </Badge>
            </div>
            <button onClick={onDiscard} className="text-muted-foreground hover:text-destructive">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description / Merchant</Label>
            <Input value={edited.description || ""} onChange={e => set("description", e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Amount (₱)</Label>
              <Input
                type="number"
                step="0.01"
                value={edited.amount ?? ""}
                onChange={e => set("amount", parseFloat(e.target.value) || "")}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={edited.date || ""}
                onChange={e => set("date", e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select value={edited.category || "other"} onValueChange={v => set("category", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Project (optional)</Label>
            <Input
              placeholder="e.g. Oak Street Project"
              value={edited.project_name || ""}
              onChange={e => set("project_name", e.target.value)}
            />
          </div>

          <Button className="w-full" onClick={() => onConfirm(edited)}>
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Create Transaction (Pending Approval)
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ReceiptScanner() {
  const [results, setResults] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [confirmed, setConfirmed] = useState([]);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Transaction.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }),
  });

  const handleFiles = async (files) => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith("image/"));
    if (!validFiles.length) return;

    setProcessing(true);
    for (const file of validFiles) {
      try {
        // Upload file
        const { file_url } = await base44.integrations.Core.UploadFile({ file });

        // Use LLM vision to extract receipt data
        const extracted = await base44.integrations.Core.InvokeLLM({
          prompt: `You are an OCR assistant for a construction company in the Philippines. 
Analyze this receipt/invoice image and extract the following fields:
- description: merchant name or what was purchased (string)
- amount: the total amount paid as a number (no currency symbol, just the number). If you see ₱ sign, extract the number after it.
- date: the transaction date in YYYY-MM-DD format. If only month/year visible, use the 1st of that month. If no date, use today: ${format(new Date(), "yyyy-MM-dd")}
- category: one of: material_cost, labor, equipment, subcontractor, overhead, permits, insurance, other
- confidence: "high" if you can clearly read all fields, "low" if any fields are unclear or missing

Return ONLY valid JSON with these exact fields.`,
          file_urls: [file_url],
          response_json_schema: {
            type: "object",
            properties: {
              description: { type: "string" },
              amount: { type: "number" },
              date: { type: "string" },
              category: { type: "string" },
              confidence: { type: "string" },
            },
          },
        });

        setResults(prev => [...prev, {
          id: Math.random().toString(36).slice(2),
          extracted: {
            description: extracted.description || "Receipt expense",
            amount: extracted.amount || 0,
            date: extracted.date || format(new Date(), "yyyy-MM-dd"),
            category: extracted.category || "other",
            project_name: "",
          },
          confidence: extracted.confidence || "low",
          previewUrl: file_url,
        }]);
      } catch (err) {
        console.error("Failed to process receipt:", err);
      }
    }
    setProcessing(false);
  };

  const handleConfirm = async (resultId, data) => {
    await createMutation.mutateAsync({
      description: data.description,
      amount: data.amount,
      date: data.date,
      category: data.category,
      project_name: data.project_name || undefined,
      type: "expense",
      status: "pending",
    });
    setResults(prev => prev.filter(r => r.id !== resultId));
    setConfirmed(prev => [...prev, data.description]);
  };

  const handleDiscard = (resultId) => {
    setResults(prev => prev.filter(r => r.id !== resultId));
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Receipt Scanner</h1>
        <p className="text-muted-foreground mt-1">Upload receipt photos to automatically extract and create expense transactions</p>
      </div>

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => e.preventDefault()}
        onClick={() => !processing && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors
          ${processing ? "border-primary/40 bg-primary/5 cursor-wait" : "border-border hover:border-primary/50 hover:bg-primary/5"}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        {processing ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm font-medium text-primary">Scanning receipt with AI...</p>
            <p className="text-xs text-muted-foreground">Extracting date, merchant & amount</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 bg-primary/10 rounded-full">
              <ReceiptText className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Drop receipt photos here or click to upload</p>
              <p className="text-xs text-muted-foreground mt-1">Supports JPG, PNG, HEIC — multiple files at once</p>
            </div>
            <div className="flex gap-2 mt-1">
              <Button size="sm" variant="outline" type="button">
                <Upload className="w-4 h-4 mr-2" /> Browse Files
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Success notifications */}
      {confirmed.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">{confirmed.length} transaction(s) created — pending approval</span>
          </div>
          <ul className="space-y-1">
            {confirmed.map((desc, i) => (
              <li key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
                {desc}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Results to review */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">Review & Confirm ({results.length})</h2>
          {results.map(result => (
            <ReceiptCard
              key={result.id}
              result={result}
              onConfirm={(data) => handleConfirm(result.id, data)}
              onDiscard={() => handleDiscard(result.id)}
            />
          ))}
        </div>
      )}

      {results.length === 0 && confirmed.length === 0 && !processing && (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Upload receipt images above to get started
        </div>
      )}
    </div>
  );
}