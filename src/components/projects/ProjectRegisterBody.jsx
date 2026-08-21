import { Fragment } from "react";
import ProjectRegisterRow from "@/components/projects/ProjectRegisterRow";

const groupByClient = (projects) => Object.entries(projects.reduce((groups, project) => {
  const client = project.client_name || "Unassigned Client";
  if (!groups[client]) groups[client] = [];
  groups[client].push(project);
  return groups;
}, {})).sort(([a], [b]) => a.localeCompare(b));

export default function ProjectRegisterBody({ classification, projects, costBased, projectCosts, statusStyles, navigate, setEditingProject, deleteProject, updateStatus }) {
  const groups = classification === "client_project" ? groupByClient(projects) : [[null, projects]];
  const columnCount = costBased ? 5 : 7;
  return groups.map(([client, clientProjects]) => (
    <Fragment key={client || classification}>
      {client && <tr className="border-b border-slate-200 bg-sky-50/70 dark:border-slate-700 dark:bg-sky-950/20"><td colSpan={columnCount} className="px-4 py-2 text-xs font-bold uppercase tracking-wide text-sky-800 dark:text-sky-300">{client}<span className="ml-2 font-normal text-slate-500">{clientProjects.length} project{clientProjects.length !== 1 ? "s" : ""}</span></td></tr>}
      {clientProjects.map((project) => (
        <ProjectRegisterRow
          key={project.id}
          project={project}
          costBased={costBased}
          projectCost={projectCosts[project.id] || 0}
          statusStyles={statusStyles}
          onOpen={(tab) => navigate(`/projects/${project.id}${tab ? `?tab=${tab}` : ""}`)}
          onEdit={() => setEditingProject(project)}
          onDelete={() => deleteProject(project.id)}
          onStatusChange={(status) => updateStatus(project.id, status)}
        />
      ))}
    </Fragment>
  ));
}