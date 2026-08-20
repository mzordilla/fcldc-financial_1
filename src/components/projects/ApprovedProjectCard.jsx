import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const money = (value) => `₱${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export default function ApprovedProjectCard({ label, projects, onOpen, statusStyles }) {
  const total = projects.reduce((sum, project) => sum + (project.contract_amount || 0), 0);
  const completed = projects.reduce((sum, project) => sum + (project.contract_amount || 0) * ((project.completed_percentage || 0) / 100), 0);
  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_20px_-12px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-3 flex items-start justify-between gap-3 border-b border-slate-200 pb-3 dark:border-slate-700"><div><h4 className="font-project-display text-sm font-bold text-slate-950 dark:text-white">{label}</h4><p className="text-xs text-slate-500">{projects.length} contract{projects.length !== 1 ? "s" : ""}</p></div><p className="text-right text-xs font-semibold text-slate-700 dark:text-slate-200">{money(total)}</p></div>
      <div className="space-y-3">
        {projects.map((project) => {
          const completedAmount = (project.contract_amount || 0) * ((project.completed_percentage || 0) / 100);
          const retention = completedAmount * ((project.retention_rate || 0) / 100);
          const balance = (project.contract_amount || 0) - completedAmount;
          return <div key={project.id} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0 dark:border-slate-800"><div className="flex items-start justify-between gap-3"><button onClick={() => onOpen(project.id)} className="flex min-w-0 items-center gap-1 text-left text-xs font-semibold text-slate-900 hover:text-sky-600 dark:text-white"><span className="truncate">{project.project_name}</span><ExternalLink className="h-3 w-3 shrink-0" /></button><Badge variant="outline" className={`shrink-0 text-[10px] ${statusStyles[project.contract_status]}`}>{project.contract_status}</Badge></div><p className="mt-0.5 truncate text-[11px] text-slate-500">{project.client_name}</p><div className="mt-2 grid grid-cols-4 gap-2 text-[10px]"><span><b className="block text-slate-400">Contract</b>{money(project.contract_amount || 0)}</span><span><b className="block text-slate-400">Completed</b>{money(completedAmount)}</span><span className="text-amber-600"><b className="block text-slate-400">Retention</b>{money(retention)}</span><span><b className="block text-slate-400">Balance</b>{money(balance)}</span></div><div className="mt-2 h-1 rounded-full bg-slate-200"><div className="h-1 rounded-full bg-teal-600" style={{ width: `${Math.min(project.completed_percentage || 0, 100)}%` }} /></div></div>;
        })}
      </div>
      <div className="mt-3 flex justify-between border-t border-slate-200 pt-3 text-xs dark:border-slate-700"><span className="font-semibold">Portfolio subtotal</span><span className="text-teal-700">Completed {money(completed)}</span></div>
    </article>
  );
}