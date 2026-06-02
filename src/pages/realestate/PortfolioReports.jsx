import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { BarChart2, Home, Users, List, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const fmt = (n) => `₱${Number(n || 0).toLocaleString()}`;

const COLORS = ["#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#64748b"];

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

  // Unit status breakdown
  const statusCount = units.reduce((acc, u) => {
    const key = u.status || "unknown";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const statusLabels = {
    available_for_sale: "For Sale",
    available_for_lease: "For Lease",
    sold: "Sold",
    leased: "Leased",
    reserved: "Reserved",
    under_renovation: "Renovation",
  };

  const statusData = Object.entries(statusCount).map(([key, value]) => ({
    name: statusLabels[key] || key,
    value,
  }));

  // Unit type breakdown
  const typeCount = units.reduce((acc, u) => {
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

  // Buildings breakdown
  const buildingRent = activeTenants.reduce((acc, t) => {
    const b = t.building || "Unknown";
    acc[b] = (acc[b] || 0) + (t.monthly_rent || 0);
    return acc;
  }, {});
  const buildingData = Object.entries(buildingRent).map(([name, rent]) => ({ name, rent }));

  const kpis = [
    { label: "Total Units", value: units.length, icon: Home, color: "text-foreground" },
    { label: "Active Tenants", value: activeTenants.length, icon: Users, color: "text-emerald-600" },
    { label: "Active Listings", value: listings.filter(l => l.status === "active").length, icon: List, color: "text-blue-600" },
    { label: "Monthly Rental Income", value: fmt(totalMonthlyRent), icon: TrendingUp, color: "text-primary" },
    { label: "Annual Rental Income", value: fmt(annualRent), icon: TrendingUp, color: "text-primary" },
    { label: "Total Closed Sales Value", value: fmt(totalSalesValue), icon: BarChart2, color: "text-purple-600" },
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
        {/* Unit Status Breakdown - full width */}
        <div className="bg-card border border-border rounded-2xl p-5 sm:col-span-2">
          <h3 className="font-semibold text-foreground mb-1">Unit Status Breakdown</h3>
          <p className="text-xs text-muted-foreground mb-4">{units.length} total units</p>
          {statusData.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ResponsiveContainer width="100%" height={220} className="flex-1 min-w-0">
                <PieChart>
                  <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} innerRadius={40}>
                    {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, name) => [`${v} units`, name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 min-w-[180px]">
                {statusData.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-sm text-foreground">{d.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{d.value}</span>
                      <span className="text-xs text-muted-foreground">({Math.round(d.value / units.length * 100)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="text-muted-foreground text-sm text-center py-8">No data</p>}
        </div>

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

        {/* Rental Income by Building */}
        {buildingData.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-5 sm:col-span-2">
            <h3 className="font-semibold text-foreground mb-4">Monthly Rental Income by Building</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={buildingData}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(v)} />
                <Bar dataKey="rent" fill="#3b82f6" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}