import Slide from "../Slide";
import { peso } from "@/lib/boardReport";

export default function ProjectsSlide({ report: r, number }) {
  return (
    <Slide title="Project Performance" subtitle="Top projects by cost, project-to-date" number={number} monthLabel={r.month.label}>
      {r.projects.length === 0 ? <p className="text-muted-foreground">No project activity recorded.</p> : (
        <table className="w-full text-sm">
          <thead><tr className="border-b-2 border-foreground/80 text-xs uppercase text-muted-foreground">
            <th className="text-left py-2">Project</th><th className="text-left py-2">Client</th><th className="text-right py-2">Contract</th><th className="text-right py-2">Revenue</th><th className="text-right py-2">Cost</th><th className="text-right py-2">Margin</th><th className="py-2 w-40 text-left pl-4">Completion</th>
          </tr></thead>
          <tbody>
            {r.projects.map((p) => (
              <tr key={p.id} className="border-b border-border">
                <td className="py-2 font-medium truncate max-w-[200px]">{p.name}</td>
                <td className="py-2 text-muted-foreground truncate max-w-[150px]">{p.client}</td>
                <td className="py-2 text-right tabular-nums">{peso(p.contract)}</td>
                <td className="py-2 text-right tabular-nums">{peso(p.revenue)}</td>
                <td className="py-2 text-right tabular-nums">{peso(p.cost)}</td>
                <td className={`py-2 text-right tabular-nums font-semibold ${p.margin < 0 ? "text-destructive" : "text-primary"}`}>{p.margin.toFixed(1)}%</td>
                <td className="py-2 pl-4"><div className="flex items-center gap-2"><div className="h-2 flex-1 rounded-full bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${Math.min(100, p.completion)}%` }} /></div><span className="text-xs tabular-nums w-9 text-right">{p.completion}%</span></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Slide>
  );
}