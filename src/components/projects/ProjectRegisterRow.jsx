import { ExternalLink, FileText, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function ProjectRegisterRow({ project, costBased, projectCost, statusStyles, onOpen, onEdit, onDelete, onStatusChange }) {
  const completedPct = project.completed_percentage || 0;
  const completedAmt = (project.contract_amount || 0) * (completedPct / 100);
  const remainingAmt = (project.contract_amount || 0) - completedAmt;
  return (
    <tr className="border-b border-border/50 last:border-0 hover:bg-muted/20">
      <td className="px-4 py-2"><button onClick={() => onOpen()} className="flex items-center gap-1 font-medium text-primary hover:underline">{project.project_name}<ExternalLink className="h-3 w-3" /></button>{project.project_number && <span className="ml-1 text-xs text-muted-foreground">({project.project_number})</span>}</td>
      <td className="px-4 py-2 text-muted-foreground">{project.client_name}</td>
      <td className="px-4 py-2"><Badge variant="outline" className={`text-xs ${statusStyles[project.contract_status] || ""}`}>{(project.contract_status || "pending").replace(/_/g, " ")}</Badge></td>
      <td className="px-4 py-2 text-right font-semibold text-foreground">₱{(costBased ? projectCost : (project.contract_amount || 0)).toLocaleString()}</td>
      {!costBased && <td className="px-4 py-2 text-right text-primary">{completedPct}% · ₱{completedAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>}
      {!costBased && <td className="px-4 py-2 text-right font-semibold text-foreground">₱{remainingAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>}
      <td className="px-4 py-2"><div className="flex items-center justify-end gap-1">
        {project.contract_status === "approved" && <Button size="sm" variant="outline" onClick={() => onStatusChange("active")}>Set Active</Button>}
        {project.contract_status === "pending" && <Button size="sm" variant="outline" onClick={() => onStatusChange("approved")}>Approve</Button>}
        <Button variant="ghost" size="icon" onClick={() => onOpen("change_orders")} className="text-muted-foreground hover:text-foreground" title="Change Orders"><FileText className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={onEdit} className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="icon" onClick={onDelete} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
      </div></td>
    </tr>
  );
}