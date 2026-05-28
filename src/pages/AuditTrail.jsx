import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, parseISO } from "date-fns";
import { Search, PlusCircle, Pencil, Trash2, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ACTION_CONFIG = {
  create: { label: "Created", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: PlusCircle },
  update: { label: "Updated", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Pencil },
  delete: { label: "Deleted", color: "bg-red-100 text-red-700 border-red-200", icon: Trash2 },
};

const ENTITIES = [
  "All", "Transaction", "PaymentRequest", "PurchaseOrder", "Payable",
  "Receivable", "Project", "BillingCycle", "BankAccount", "WorkingCapitalLoan",
];

export default function AuditTrail() {
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [entityFilter, setEntityFilter] = useState("All");

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["auditlogs"],
    queryFn: () => base44.entities.AuditLog.list("-timestamp", 500),
  });

  const filtered = logs.filter(log => {
    const matchesSearch =
      !search ||
      log.summary?.toLowerCase().includes(search.toLowerCase()) ||
      log.actor?.toLowerCase().includes(search.toLowerCase()) ||
      log.entity_name?.toLowerCase().includes(search.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    const matchesEntity = entityFilter === "All" || log.entity_name === entityFilter;
    return matchesSearch && matchesAction && matchesEntity;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">Audit Trail</h1>
        <p className="text-muted-foreground mt-1">Track all data changes, additions, and deletions across the system</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by summary, user, or entity…"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="create">Created</SelectItem>
            <SelectItem value="update">Updated</SelectItem>
            <SelectItem value="delete">Deleted</SelectItem>
          </SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            {ENTITIES.map(e => (
              <SelectItem key={e} value={e}>{e === "All" ? "All Entities" : e}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground ml-auto whitespace-nowrap">
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Log List */}
      {isLoading ? (
        <div className="text-center text-muted-foreground py-16">Loading audit logs…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted-foreground py-16">No audit log entries found.</div>
      ) : (
        <div className="bg-card border rounded-xl divide-y divide-border overflow-hidden">
          {filtered.map(log => {
            const cfg = ACTION_CONFIG[log.action] || ACTION_CONFIG.update;
            const Icon = cfg.icon;
            const ts = log.timestamp ? (() => {
              try { return parseISO(log.timestamp); } catch { return null; }
            })() : null;

            return (
              <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/40 transition-colors">
                {/* Icon */}
                <div className={`mt-0.5 flex-shrink-0 rounded-full p-1.5 border ${cfg.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={`text-xs border ${cfg.color}`}>
                      {cfg.label}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {log.entity_name}
                    </Badge>
                    {log.changed_fields?.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Fields: {log.changed_fields.slice(0, 6).join(", ")}
                        {log.changed_fields.length > 6 ? ` +${log.changed_fields.length - 6} more` : ""}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-foreground">{log.summary || "—"}</p>
                </div>

                {/* Meta */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-medium text-foreground">{log.actor || "—"}</p>
                  {ts && (
                    <>
                      <p className="text-xs text-muted-foreground">{format(ts, "MMM d, yyyy")}</p>
                      <p className="text-xs text-muted-foreground">{format(ts, "h:mm a")}</p>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}