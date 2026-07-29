import { TrendingUp, Home } from "lucide-react";

const fmt = (n) => `₱${Number(n || 0).toLocaleString()}`;

const typeLabels = { studio: "Studio", "1br": "1BR", "2br": "2BR", "3br": "3BR", penthouse: "PH", commercial: "Comm.", parking: "Parking" };

export default function LeaseForecastReport({ units }) {
  const unsoldUnits = units.filter((u) => u.status === "available_for_sale" || u.status === "available_for_lease");

  const rows = unsoldUnits.map((u) => {
    const estMonthlyRent = u.monthly_rent || (u.area_sqm && u.price_per_sqm_rent ? u.area_sqm * u.price_per_sqm_rent : 0);
    return { ...u, estMonthlyRent };
  });

  const totalMonthly = rows.reduce((s, r) => s + (r.estMonthlyRent || 0), 0);
  const totalAnnual = totalMonthly * 12;
  const unitsWithEstimate = rows.filter((r) => r.estMonthlyRent > 0).length;

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="font-semibold text-foreground">Lease Forecast — Unsold Units</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Projected rental income if the {unsoldUnits.length} currently unsold/unleased unit{unsoldUnits.length === 1 ? "" : "s"} were leased out
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-muted rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Unsold Units</p>
          <p className="text-lg font-bold text-foreground">{unsoldUnits.length}</p>
        </div>
        <div className="bg-muted rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Potential Monthly</p>
          <p className="text-lg font-bold text-primary">{fmt(totalMonthly)}</p>
        </div>
        <div className="bg-muted rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Potential Annual</p>
          <p className="text-lg font-bold text-emerald-600">{fmt(totalAnnual)}</p>
        </div>
      </div>

      {rows.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="text-left font-semibold px-2 py-2">Unit</th>
                <th className="text-left font-semibold px-2 py-2">Building</th>
                <th className="text-left font-semibold px-2 py-2">Type</th>
                <th className="text-right font-semibold px-2 py-2">Area (sqm)</th>
                <th className="text-right font-semibold px-2 py-2">Est. Monthly Rent</th>
                <th className="text-right font-semibold px-2 py-2">Est. Annual Rent</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-2 py-2 font-medium text-foreground whitespace-nowrap">{r.unit_number}</td>
                  <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">{r.building || "—"}</td>
                  <td className="px-2 py-2 text-muted-foreground whitespace-nowrap">{typeLabels[r.unit_type] || r.unit_type}</td>
                  <td className="px-2 py-2 text-right text-muted-foreground">{r.area_sqm ? r.area_sqm.toLocaleString() : "—"}</td>
                  <td className="px-2 py-2 text-right font-medium text-foreground">
                    {r.estMonthlyRent > 0 ? fmt(r.estMonthlyRent) : <span className="text-muted-foreground">No rate set</span>}
                  </td>
                  <td className="px-2 py-2 text-right font-semibold text-primary">{r.estMonthlyRent > 0 ? fmt(r.estMonthlyRent * 12) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {unitsWithEstimate < rows.length && (
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1">
              <Home className="w-3 h-3" /> {rows.length - unitsWithEstimate} unit(s) missing a rent rate — set price per sqm (rent) or monthly rent to include them in the forecast.
            </p>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm text-center py-6">No unsold or unleased units to forecast</p>
      )}
    </div>
  );
}