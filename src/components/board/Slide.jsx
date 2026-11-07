export default function Slide({ title, subtitle, number, monthLabel, children }) {
  return (
    <section className="board-slide bg-card border border-border rounded-2xl shadow-sm aspect-video w-full flex flex-col overflow-hidden">
      <header className="flex items-end justify-between gap-4 px-8 pt-6 pb-3 border-b border-border">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">FCLDC Board Report · {monthLabel}</p>
          <h2 className="font-project-display text-2xl font-bold text-foreground">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <span className="text-xs text-muted-foreground font-medium">{number}</span>
      </header>
      <div className="flex-1 min-h-0 px-8 py-5">{children}</div>
    </section>
  );
}