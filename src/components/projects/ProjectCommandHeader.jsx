import { Download, FileUp, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statuses = [["all", "All Status"], ["pending", "Pending"], ["approved", "Approved"], ["active", "Active"], ["completed", "Completed"], ["on_hold", "On Hold"], ["cancelled", "Cancelled"]];
const classes = [["all", "All Classifications"], ["owned_project", "Owned Project"], ["client_project", "Client Project"], ["monitoring_project", "Monitoring Project"]];

export default function ProjectCommandHeader({ projects, activeCount, pendingCount, totalApprovedValue, approvedCount, statusFilter, setStatusFilter, classificationFilter, setClassificationFilter, onExport, importRef, onImport, onNew }) {
  return (
    <section className="grid gap-6 border-b border-slate-200 pb-6 lg:grid-cols-[1fr_1.15fr] dark:border-slate-700">
      <div className="space-y-5 lg:border-r lg:border-slate-200 lg:pr-8 dark:lg:border-slate-700">
        <div><h1 className="font-project-display text-4xl font-bold tracking-tight text-slate-950 dark:text-white">Projects</h1><p className="mt-1 text-sm text-slate-500">{projects.length} total · {activeCount} active · {pendingCount} pending contract</p></div>
        <div className="flex flex-wrap gap-2"><Button onClick={onNew} className="bg-sky-600 hover:bg-sky-700"><Plus className="h-4 w-4" />New Project</Button><Button variant="outline" onClick={onExport}><Download className="h-4 w-4" />Export</Button><Button variant="outline" onClick={() => importRef.current?.click()}><FileUp className="h-4 w-4" />Import</Button><input ref={importRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onImport} /></div>
        <div className="flex flex-wrap gap-2"><Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-40 bg-white dark:bg-slate-950"><SelectValue /></SelectTrigger><SelectContent>{statuses.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><Select value={classificationFilter} onValueChange={setClassificationFilter}><SelectTrigger className="w-48 bg-white dark:bg-slate-950"><SelectValue /></SelectTrigger><SelectContent>{classes.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <div className="grid items-center gap-5 sm:grid-cols-[1fr_auto]">
        <div><p className="text-xs font-medium text-slate-500">Approved Contract Value</p><p className="font-project-display text-3xl font-bold tracking-tight text-slate-950 dark:text-white">₱{totalApprovedValue.toLocaleString()}</p><svg viewBox="0 0 260 86" className="mt-3 h-20 w-full" aria-hidden="true"><defs><linearGradient id="projectArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0284c7" stopOpacity=".25"/><stop offset="1" stopColor="#0284c7" stopOpacity="0"/></linearGradient></defs><path d="M2 76 L54 49 L103 62 L151 18 L202 22 L258 2 L258 86 L2 86 Z" fill="url(#projectArea)"/><path d="M2 76 L54 49 L103 62 L151 18 L202 22 L258 2" fill="none" stroke="#0284c7" strokeWidth="2"/></svg></div>
        <div className="relative h-32 w-32 rounded-full" style={{ background: "conic-gradient(#334155 0 46%, #0369a1 46% 72%, #16a085 72% 88%, #f0b44d 88% 100%)" }}><div className="absolute inset-4 flex flex-col items-center justify-center rounded-full bg-background"><span className="font-project-display text-2xl font-bold">{approvedCount}</span><span className="text-xs text-slate-500">contracts</span></div></div>
      </div>
    </section>
  );
}