import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { DEFAULT_ACCESS } from "@/lib/access-control";

const QUERY_KEY = ["role-access-config"];
const fields = ["disbursement", "accounting", "procurement", "marketing"];
const copyDefaults = () => Object.fromEntries(fields.map(role => [role, [...DEFAULT_ACCESS[role]]]));

export default function useRoleAccess() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => base44.entities.RoleAccessConfig.list("-updated_date", 1),
    staleTime: Infinity,
  });

  useEffect(() => base44.entities.RoleAccessConfig.subscribe(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }), [queryClient]);

  const record = query.data?.[0];
  const config = useMemo(() => record
    ? Object.fromEntries(fields.map(role => [role, record[role] || []]))
    : copyDefaults(), [record]);

  const saveAccess = async (next) => {
    const payload = Object.fromEntries(fields.map(role => [role, next[role] || []]));
    if (record) await base44.entities.RoleAccessConfig.update(record.id, payload);
    else await base44.entities.RoleAccessConfig.create(payload);
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  };

  return { config, isLoading: query.isLoading, saveAccess, copyDefaults };
}