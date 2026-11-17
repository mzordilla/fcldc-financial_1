import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PERIOD_TYPES, newStatement } from "@/lib/associationStatement";
import StatementWorkspace from "@/components/association/StatementWorkspace";
import StatementHistory from "@/components/association/StatementHistory";
import StatementComparison from "@/components/association/StatementComparison";

export default function AssociationFinancials() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(null);
  const [periodType, setPeriodType] = useState("all");

  const { data: statements = [], isLoading } = useQuery({
    queryKey: ["association-statements", periodType],
    queryFn: async () => {
      const page = await base44.entities.AssociationFinancialStatement.filter(periodType === "all" ? {} : { period_type: periodType }, { sort: "-period_end", limit: 200 });
      return page.items;
    },
  });

  const remove = async (s) => {
    if (!window.confirm(`Delete the ${s.period_label} financial statement? This cannot be undone.`)) return;
    await base44.entities.AssociationFinancialStatement.delete(s.id);
    queryClient.invalidateQueries({ queryKey: ["association-statements"] });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Condominium Association</p>
          <h1 className="text-2xl font-bold">Association Financial Statements</h1>
          <p className="text-sm text-muted-foreground">Statement of financial operations for unit owners, the Board of Directors, and the Association.</p>
        </div>
        {!draft && <Button onClick={() => setDraft(newStatement(statements[0], user))}><Plus /> New Statement</Button>}
      </div>

      {draft ? (
        <StatementWorkspace draft={draft} setDraft={setDraft} onBack={() => setDraft(null)} />
      ) : (
        <Tabs defaultValue="history" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <TabsList>
              <TabsTrigger value="history">Statement History</TabsTrigger>
              <TabsTrigger value="compare">Compare Periods</TabsTrigger>
            </TabsList>
            <Select value={periodType} onValueChange={setPeriodType}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All periods</SelectItem>
                {PERIOD_TYPES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <TabsContent value="history"><StatementHistory statements={statements} loading={isLoading} onOpen={setDraft} onDelete={remove} /></TabsContent>
          <TabsContent value="compare"><StatementComparison statements={statements} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}