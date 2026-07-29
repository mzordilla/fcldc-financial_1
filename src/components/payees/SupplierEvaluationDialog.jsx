import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const scoreFields = [
  { key: "quality_score", label: "Quality" },
  { key: "delivery_score", label: "Delivery Timeliness" },
  { key: "pricing_score", label: "Pricing" },
  { key: "service_score", label: "Customer Service" },
  { key: "compliance_score", label: "Compliance" },
];

const ratingStyles = {
  excellent: "bg-primary/10 text-primary border-primary/20",
  good: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  fair: "bg-chart-3/10 text-chart-3 border-chart-3/20",
  poor: "bg-destructive/10 text-destructive border-destructive/20",
};

const ratingFromAvg = (avg) => {
  if (avg >= 4.5) return "excellent";
  if (avg >= 3.5) return "good";
  if (avg >= 2.5) return "fair";
  return "poor";
};

const defaultForm = (payee) => ({
  payee_id: payee?.id || "",
  supplier_name: payee?.name || "",
  evaluation_period: "",
  evaluation_date: format(new Date(), "yyyy-MM-dd"),
  quality_score: 5,
  delivery_score: 5,
  pricing_score: 5,
  service_score: 5,
  compliance_score: 5,
  recommendation: "continue",
  remarks: "",
  evaluated_by: "",
});

export default function SupplierEvaluationDialog({ open, onOpenChange, payee }) {
  const [form, setForm] = useState(defaultForm(payee));
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (open) setForm(defaultForm(payee));
  }, [open, payee]);

  const { data: history = [] } = useQuery({
    queryKey: ["supplier-evaluations", payee?.id],
    queryFn: () => base44.entities.SupplierEvaluation.filter({ payee_id: payee.id }, "-created_date", 10),
    enabled: open && !!payee?.id,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SupplierEvaluation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-evaluations", payee?.id] });
      queryClient.invalidateQueries({ queryKey: ["supplier-evaluations-all"] });
    },
  });

  const avg = useMemo(() => {
    const total = scoreFields.reduce((sum, f) => sum + (Number(form[f.key]) || 0), 0);
    return total / scoreFields.length;
  }, [form]);

  const overallRating = ratingFromAvg(avg);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    await createMutation.mutateAsync({
      ...form,
      total_score: Math.round(avg * scoreFields.length),
      overall_rating: overallRating,
    });
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Supplier Evaluation — {payee?.name}</DialogTitle>
        </DialogHeader>

        {history.length > 0 && (
          <div className="space-y-1.5 border border-border rounded-lg p-3 bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Past Evaluations</p>
            {history.map(h => (
              <div key={h.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{h.evaluation_period || h.evaluation_date}</span>
                <Badge variant="outline" className={ratingStyles[h.overall_rating] || "bg-muted text-muted-foreground border-border"}>
                  {h.overall_rating} ({h.total_score}/25)
                </Badge>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Evaluation Period</Label>
              <Input placeholder="e.g. Q1 2026" value={form.evaluation_period} onChange={e => setForm(p => ({ ...p, evaluation_period: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Evaluation Date</Label>
              <Input type="date" value={form.evaluation_date} onChange={e => setForm(p => ({ ...p, evaluation_date: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-3">
            {scoreFields.map(f => (
              <div key={f.key} className="flex items-center justify-between gap-3">
                <Label className="flex-1">{f.label}</Label>
                <Select value={String(form[f.key])} onValueChange={v => setForm(p => ({ ...p, [f.key]: Number(v) }))}>
                  <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between bg-muted/40 border border-border rounded-lg px-3 py-2.5">
            <span className="text-sm font-medium">Overall Rating</span>
            <Badge variant="outline" className={ratingStyles[overallRating]}>
              {overallRating} ({avg.toFixed(1)}/5)
            </Badge>
          </div>

          <div className="space-y-1.5">
            <Label>Recommendation</Label>
            <Select value={form.recommendation} onValueChange={v => setForm(p => ({ ...p, recommendation: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="continue">Continue Engagement</SelectItem>
                <SelectItem value="probation">Probation / Watch</SelectItem>
                <SelectItem value="discontinue">Discontinue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Remarks</Label>
            <Textarea rows={2} value={form.remarks} onChange={e => setForm(p => ({ ...p, remarks: e.target.value }))} />
          </div>

          <div className="space-y-1.5">
            <Label>Evaluated By</Label>
            <Input value={form.evaluated_by} onChange={e => setForm(p => ({ ...p, evaluated_by: e.target.value }))} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Evaluation"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}