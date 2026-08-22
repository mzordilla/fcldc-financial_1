import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BarChart2, Home, Users, List, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import LeaseForecastReport from "@/components/realestate/LeaseForecastReport";
import PortfolioStatusBreakdown from "@/components/realestate/PortfolioStatusBreakdown";

const fmt = (n) => `₱${Number(n || 0).toLocaleString()}`;

export default function PortfolioReports() {
  const { data: units = [] } = useQuery({
    queryKey: ["condo-units"],
    queryFn: () => base44.entities.CondoUnit.list("-created_date", 200),
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => base44.entities.Tenant.list("-created_date", 200),
  });

  const { data: listings = [] } = useQuery({
    queryKey: ["property-listings"],
    queryFn: () => base44.entities.PropertyListing.list("-created_date", 200),
  });

  const parkingUnits = units.filter(unit => unit.unit_type === "parking");
  const regularUnits = units.filter(unit => unit.unit_type !== "parking");

  // Unit type breakdown
  const typeCount = regularUnits.reduce((acc, u) => {
    const key = u.unit_type || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const typeLabels = { studio: "Studio", "1br": "1BR", "2br": "2BR", "3br": "3BR", penthouse: "PH", commercial: "Comm." };
  const typeData = Object.entries(typeCount).map(([key, value]) => ({
    name: typeLabels[key] || key,
    value,
  }));

  // Monthly rental income
  const activeTenants = tenants.filter(t => t.status === "active");
  const totalMonthlyRent = activeTenants.reduce((s, t) => s + (t.monthly_rent || 0), 0);
  const annualRent = totalMonthlyRent * 12;

  // Listings pipeline
  const closedSales = listings.filter(l => l.status === "sold");
  const closedLeases = listings.filter(l => l.status === "leased");
  const totalSalesValue = closedSales.reduce((s, l) => s + (l.final_price || l.asking_price || 0), 0);

  // Buildings breakdown with occupancy rates
  const buildingStats = regularUnits.reduce((acc, u) => {
    const b = u.building || "Unknown";
    if (!acc[b]) acc[b] = { total: 0, leased: 0, sold: 0, available: 0 };
    acc[b].total += 1;
    if (u.status === "leased") acc[b].leased += 1;
    else if (u.status === "sold") acc[b].sold += 1;
    else if (u.status === "available_for_lease" || u.status === "available_for_sale") acc[b].available += 1;
    return acc;
  }, {});

  const buildingRent = activeTenants.reduce((acc, t) => {
    const b = t.building || "Unknown";
    acc[b] = (acc[b] || 0) + (t.monthly_rent || 0);
    return acc;
  }, {});

  const buildingData = Object.entries(buildingStats).map(([name, stats]) => ({
    name,
    total: stats.total,
    leased: stats.leased,
    sold: stats.sold,
    available: stats.available,
    occupancyRate: stats.total > 0 ? Math.round((stats.leased / stats.total) * 100) : 0,
    rent: buildingRent[name] || 0,
  }));

  // Overall occupancy rate
  const totalLeased = regularUnits.filter(u => u.status === "leased").length;
  const totalSold = regularUnits.filter(u => u.status === "sold").length;
  const overallOccupancyRate = regularUnits.length > 0 ? Math.round(((totalLeased + totalSold) / regularUnits.length) * 100) : 0;
  const rentalOccupancyRate = regularUnits.length > 0 ? Math.round((totalLeased / regularUnits.length) * 100) : 0;

  const kpis = [
    { label: "Total Units", value: regularUnits.length, icon: Home, color: "text-foreground" },
    { label: "Parking", value: parkingUnits.length, icon: List, color: "text-slate-600" },
    { label: "Occupancy Rate", value: `${overallOccupancyRate}%`, icon: TrendingUp, color: "text-emerald-600" },
    { label: "Rental Occupancy", value: `${rentalOccupancyRate}%`, icon: TrendingUp, color: "text-blue-600" },
    { label: "Active Tenants", value: activeTenants.length, icon: Users, color: "text-emerald-600" },
    { label: "Monthly Revenue", value: fmt(totalMonthlyRent), icon: TrendingUp, color: "text-primary" },
    { label: "Annual Revenue", value: fmt(annualRent), icon: TrendingUp, color: "text-primary" },
  ];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Portfolio Reports</h1>
        <p className="text-muted-foreground mt-1">Real estate portfolio summary and analytics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <k.icon className={`w-4 h-4 ${k.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid sm:grid-cols-2 gap-6">
        <PortfolioStatusBreakdown units={regularUnits} parking={parkingUnits} />

        {/* Unit Type Bar */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Units by Type</h3>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={typeData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-muted-foreground text-sm text-center py-8">No data</p>}
        </div>

        {/* Occupancy Rate by Building */}
        {buildingData.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5 sm:col-span-2">
            <h3 className="font-semibold text-foreground mb-4">Occupancy Rate by Building</h3>
            <div className="space-y-4">
              {buildingData.map(b => (
                <div key={b.name} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-foreground">{b.name}</span>
                    <span className="text-sm text-muted-foreground">{b.leased}/{b.total} units ({b.occupancyRate}%)</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all" 
                      style={{ width: `${b.occupancyRate}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Revenue: {fmt(b.rent)}/mo</span>
                    <span>Available: {b.available}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <LeaseForecastReport units={units} />
    </div>
  );
}