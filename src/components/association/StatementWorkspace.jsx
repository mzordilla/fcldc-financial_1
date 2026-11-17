import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, FileDown, Loader2, Printer, Save } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { toPayload, periodLabel } from "@/lib/associationStatement";
import { printElement, exportElementPdf } from "@/lib/printDocument";
import StatementEditor from "./StatementEditor";
import StatementDocument from "./StatementDocument";

export default function StatementWorkspace({ draft, setDraft, onBack }) {
  const queryClient = useQueryClient();
  const docRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const title = `${draft.condominium_name || "Association"} Financial Statement ${periodLabel(draft)}`;

  const save = async () => {
    if (!draft.condominium_name.trim()) return setError("Enter the condominium name before saving.");
    setSaving(true);
    setError("");
    try {
      const payload = toPayload(draft);
      const record = draft.id
        ? await base44.entities.AssociationFinancialStatement.update(draft.id, payload)
        : await base44.entities.AssociationFinancialStatement.create(payload);
      setDraft({ ...draft, id: record.id });
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["association-statements"] });
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const exportPdf = async () => {
    setExporting(true);
    await exportElementPdf(docRef.current, `${title.replace(/[^\w]+/g, "_")}.pdf`);
    setExporting(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" onClick={onBack}><ArrowLeft /> All statements</Button>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => printElement(docRef.current, title)}><Printer /> Print</Button>
          <Button variant="outline" onClick={exportPdf} disabled={exporting}>{exporting ? <Loader2 className="animate-spin" /> : <FileDown />} Export PDF</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" /> : saved ? <Check /> : <Save />} {saved ? "Saved" : draft.id ? "Save Changes" : "Save Statement"}
          </Button>
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_auto] items-start">
        <StatementEditor value={draft} onChange={(d) => { setDraft(d); setSaved(false); }} />
        <div className="overflow-x-auto"><div className="flex justify-center min-w-max"><StatementDocument ref={docRef} statement={draft} /></div></div>
      </div>
    </div>
  );
}