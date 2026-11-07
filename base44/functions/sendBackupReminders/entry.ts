import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const recent = await base44.asServiceRole.entities.BackupRecord.filter(
      { status: { $in: ['completed', 'completed_with_warnings'] } }, '-backup_created_at', 1
    );
    const last = recent[0];
    let lastText = 'No system backup has been created yet.';
    if (last?.backup_created_at) {
      const days = Math.floor((Date.now() - new Date(last.backup_created_at).getTime()) / 86400000);
      lastText = `Your last successful backup was ${days} day${days === 1 ? '' : 's'} ago (${new Date(last.backup_created_at).toDateString()}).`;
    }

    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const results = [];
    for (let i = 0; i < admins.length; i += 6) {
      const batch = await Promise.allSettled(admins.slice(i, i + 6).map((a) =>
        base44.asServiceRole.integrations.Core.SendEmail({
          to: a.email,
          template_name: 'BackupReminder',
          category: 'transactional',
          variables: { first_name: (a.full_name || 'there').split(' ')[0], last_backup_text: lastText },
        })
      ));
      results.push(...batch.map((r) => r.status));
    }
    return Response.json({ admins: admins.length, sent: results.filter((s) => s === 'fulfilled').length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}