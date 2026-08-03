export const statusLabels = {
  available_for_sale: "For Sale",
  available_for_lease: "For Lease",
  sold: "Sold",
  leased: "Leased",
  reserved: "Reserved",
  under_renovation: "Renovation",
};

export const mapLegend = [
  { status: "sold", label: "Sold", className: "bg-slate-200 border-slate-400" },
  { status: "leased", label: "Leased", className: "bg-purple-100 border-purple-300" },
  { status: "available_for_sale", label: "For Sale", className: "bg-emerald-100 border-emerald-300" },
  { status: "available_for_lease", label: "For Lease", className: "bg-blue-100 border-blue-300" },
  { status: "reserved", label: "Reserved", className: "bg-amber-100 border-amber-300" },
  { status: "under_renovation", label: "Renovation", className: "bg-orange-100 border-orange-300" },
];