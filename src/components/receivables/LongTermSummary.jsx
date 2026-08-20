export default function LongTermSummary({ items }) {
  const open = items.filter((r) => r.status !== "paid");
  const outstanding = open.reduce((s, r) => s + ((r.amount || 0) - (r.amount_paid || 0)), 0);
  const collected = items.reduce((s, r) => s + (r.amount_paid || 0), 0);

  return (
    <div className="bg-card rounded-2xl border border-border p-5">
      <h3 className="text-sm font-semibold text-foreground mb-1">Long-Term Receivables</h3>
      <p className="text-xs text-muted-foreground mb-4">
        Funding &amp; loan receivables are long-term (non-current) — no aging analysis applied.
      </p>
      <div className="grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Open Accounts</p>
          <p className="text-sm font-bold mt-0.5 text-foreground">{open.length}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Outstanding Balance</p>
          <p className="text-sm font-bold mt-0.5 text-foreground">₱{outstanding.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total Collected</p>
          <p className="text-sm font-bold mt-0.5 text-primary">₱{collected.toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}