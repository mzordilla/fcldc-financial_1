import Slide from "../Slide";
import RankedTable from "../RankedTable";
import { peso } from "@/lib/boardReport";

export default function IncomeSlide({ report: r, number }) {
  const rows = [
    ["Revenue", "totalRevenue"], ["Cost of Sales", "totalCOGS"], ["Gross Profit", "grossProfit", true],
    ["Operating Expenses", "totalOpex"], ["Net Income", "incomeBeforeTax", true],
  ];
  return (
    <Slide title="Income Statement" subtitle="Current month vs prior month and year-to-date" number={number} monthLabel={r.month.label}>
      <div className="grid grid-cols-5 gap-8 h-full">
        <table className="col-span-3 w-full text-sm self-start">
          <thead><tr className="border-b-2 border-foreground/80 text-xs uppercase text-muted-foreground">
            <th className="text-left py-2">Line item</th><th className="text-right py-2">{r.month.short}</th><th className="text-right py-2">{r.prev.short}</th><th className="text-right py-2">Change</th><th className="text-right py-2">YTD</th>
          </tr></thead>
          <tbody>
            {rows.map(([label, key, bold]) => {
              const ch = r.change(r.cur[key], r.prior[key]);
              return (
                <tr key={key} className={`border-b border-border ${bold ? "font-bold bg-muted/40" : ""}`}>
                  <td className="py-2.5 px-1">{label}</td>
                  <td className={`py-2.5 text-right tabular-nums ${r.cur[key] < 0 ? "text-destructive" : ""}`}>{peso(r.cur[key])}</td>
                  <td className="py-2.5 text-right tabular-nums text-muted-foreground">{peso(r.prior[key])}</td>
                  <td className={`py-2.5 text-right tabular-nums text-xs font-semibold ${ch >= 0 ? "text-primary" : "text-destructive"}`}>{ch >= 0 ? "+" : ""}{ch.toFixed(1)}%</td>
                  <td className="py-2.5 text-right tabular-nums">{peso(r.ytd[key])}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="col-span-2"><RankedTable title="Revenue by account" rows={r.revenueAccounts.slice(0, 8)} empty="No revenue recorded this month" /></div>
      </div>
    </Slide>
  );
}