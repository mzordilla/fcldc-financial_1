import { createClientFromRequest } from 'npm:@base44/sdk@0.8.51';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const users = await base44.asServiceRole.entities.User.list('full_name', 200);
  const approvers = users
    .filter((u) => u.full_name)
    .map((u) => ({ id: u.id, full_name: u.full_name }));
  return Response.json({ approvers });
});