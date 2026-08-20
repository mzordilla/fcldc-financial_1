export default function WorkingCapitalCommandHeader({ outstanding, available, monthlyPayments, controls }) {
  const money = (value) => `₱${(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <section className="rounded-xl border border-chart-2/20 bg-chart-2/10 px-4 py-3 shadow-sm md:px-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid flex-1 grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <div className="pb-3 sm:pb-0 sm:pr-5">
            <p className="font-project-display text-2xl font-bold tracking-tight text-foreground">{money(outstanding)}</p>
            <p className="text-xs font-medium text-muted-foreground">outstanding</p>
          </div>
          <div className="py-3 sm:px-5 sm:py-0">
            <p className="font-project-display text-2xl font-bold tracking-tight text-foreground">{money(available)}</p>
            <p className="text-xs font-medium text-muted-foreground">available</p>
          </div>
          <div className="pt-3 sm:pl-5 sm:pt-0">
            <p className="font-project-display text-2xl font-bold tracking-tight text-foreground">{money(monthlyPayments)}<span className="text-base">/mo</span></p>
            <p className="text-xs font-medium text-muted-foreground">payments</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">{controls}</div>
      </div>
    </section>
  );
}