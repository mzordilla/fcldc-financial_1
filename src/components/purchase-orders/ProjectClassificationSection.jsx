import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import ProjectDeliveryCard from "@/components/purchase-orders/ProjectDeliveryCard";

const LABELS = {
  owned_project: "Owned Projects",
  client_project: "Client Projects",
  monitoring_project: "Monitoring Projects",
  unclassified: "Unclassified Projects",
};

export default function ProjectClassificationSection({ classification, projects }) {
  const [expanded, setExpanded] = useState(false);
  const total = projects.reduce((sum, project) => sum + project.total_value, 0);
  return (
    <section className="bg-card rounded-2xl border border-border overflow-hidden">
      <button type="button" className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-muted/20" onClick={() => setExpanded(!expanded)}>
        <div><h2 className="text-base font-bold text-foreground">{LABELS[classification] || classification}</h2><p className="text-xs text-muted-foreground">{projects.length} project{projects.length !== 1 ? "s" : ""}</p></div>
        <div className="flex items-center gap-4"><div className="text-right"><p className="text-lg font-bold text-primary">₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p><p className="text-xs text-muted-foreground">Classification Total</p></div>{expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}</div>
      </button>
      {expanded && <div className="space-y-3 border-t border-border bg-muted/10 p-3">{projects.map((project) => <ProjectDeliveryCard key={project.project_name} project={project} />)}</div>}
    </section>
  );
}