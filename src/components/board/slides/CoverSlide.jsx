import { format } from "date-fns";

export default function CoverSlide({ report }) {
  return (
    <section className="board-slide aspect-video w-full rounded-2xl overflow-hidden bg-sidebar text-sidebar-foreground flex flex-col justify-between p-12 shadow-sm">
      <img src="https://media.base44.com/images/public/69f02f8501c3688565579a10/2155e7792_dfic.jpg" alt="FCLDC" className="h-16 w-16 rounded-xl object-cover" />
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-sidebar-primary">Board of Directors</p>
        <h1 className="font-project-display text-5xl font-bold mt-3">Monthly Financial Report</h1>
        <p className="font-project-display text-3xl font-semibold mt-2 text-sidebar-foreground/80">{report.month.label}</p>
        <div className="h-1 w-24 bg-sidebar-primary mt-6 rounded-full" />
      </div>
      <div className="flex justify-between text-sm text-sidebar-foreground/60">
        <span>FCL Aranang Development Corporation</span>
        <span>Prepared {format(new Date(), "MMMM d, yyyy")} · Confidential</span>
      </div>
    </section>
  );
}