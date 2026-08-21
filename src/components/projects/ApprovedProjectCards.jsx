import ApprovedProjectCard from "@/components/projects/ApprovedProjectCard";

const groupByClient = (projects) => Object.entries(projects.reduce((groups, project) => {
  const client = project.client_name || "Unassigned Client";
  if (!groups[client]) groups[client] = [];
  groups[client].push(project);
  return groups;
}, {})).sort(([a], [b]) => a.localeCompare(b));

export default function ApprovedProjectCards({ classification, label, projects, ...props }) {
  if (classification !== "client_project") {
    return <ApprovedProjectCard label={label} projects={projects} {...props} />;
  }

  return groupByClient(projects).map(([client, clientProjects]) => (
    <ApprovedProjectCard
      key={client}
      label={client}
      projects={clientProjects}
      {...props}
    />
  ));
}