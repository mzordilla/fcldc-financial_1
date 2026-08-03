import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildLeaseClientGroups } from "@/lib/leaseCollectionAging";
import LeaseCollectionClientRow from "./LeaseCollectionClientRow";

export default function LeaseCollectionReceivablesTable({ tenants, monthOptions, collections, onCellClick, onGroupCellClick, onGroupsChange }) {
  const groups = useMemo(() => buildLeaseClientGroups(tenants, monthOptions, collections), [tenants, monthOptions, collections]);
  const [expanded, setExpanded] = useState(new Set());
  useEffect(() => onGroupsChange(groups), [groups, onGroupsChange]);
  const openRow = (row) => row.tenants.length === 1
    ? onCellClick(row.tenants[0], row.month, row.records[0])
    : onGroupCellClick(row.tenants, row.month, row.records);
  if (!groups.length) return <p className="text-sm text-muted-foreground text-center py-12">No lease collections yet</p>;
  return <div className="space-y-4">
    <div className="flex items-center justify-between"><p className="text-sm font-semibold text-muted-foreground">{groups.length} client{groups.length !== 1 ? "s" : ""}</p>
      <div className="flex gap-2"><Button size="sm" variant="outline" className="text-xs" onClick={() => setExpanded(new Set(groups.map((g) => g.client)))}><ChevronDown className="w-3 h-3 mr-1" />Expand All</Button>
        <Button size="sm" variant="outline" className="text-xs" onClick={() => setExpanded(new Set())}><ChevronUp className="w-3 h-3 mr-1" />Collapse All</Button></div>
    </div>
    <div className="overflow-x-auto"><div className="min-w-[900px]">
      <div className="grid grid-cols-[1.6fr_1fr_1fr_1fr_1fr_1fr_1fr_2.5rem] px-5 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide"><span>Client</span>{["Current", "1-30", "31-60", "61-90", "90+", "Total", ""].map((h, i) => <span key={`${h}-${i}`} className="text-right">{h}</span>)}</div>
      <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border max-h-[70vh] overflow-y-auto">{groups.map((group) => <LeaseCollectionClientRow key={group.client} group={group} expanded={expanded.has(group.client)} onToggle={() => setExpanded((prev) => { const next = new Set(prev); next.has(group.client) ? next.delete(group.client) : next.add(group.client); return next; })} onOpen={openRow} />)}</div>
    </div></div>
  </div>;
}