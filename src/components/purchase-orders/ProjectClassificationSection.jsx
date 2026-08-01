import ProjectDeliveryCard from "@/components/purchase-orders/ProjectDeliveryCard";

const LABELS = {
  owned_project: "Owned Projects",
  client_project: "Client Projects",
  monitoring_project: "Monitoring Projects",
  unclassified: "Unclassified Projects",
};

export default function ProjectClassificationSection({ classification, projects }) {
  const total = projects.reduce((sum, project) => sum + project.total_value, 0);
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-4 px-1">
        <div><h2 className="text-base font-bold text-foreground">{LABELS[classification] || classification}</h2><p className="text-xs text-muted-foreground">{projects.length} project{projects.length !== 1 ? "s" : ""}</p></div>
        <div className="text-right"><p className="text-lg font-bold text-primary">₱{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p><p className="text-xs text-muted-foreground">Classification Total</p></div>
      </div>
      <div className="space-y-3">{projects.map((project) => <ProjectDeliveryCard key={project.project_name} project={project} />)}</div>
    </section>
  );
}