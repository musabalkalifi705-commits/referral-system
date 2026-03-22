import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function requireAdmin(token: string | undefined) {
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  const { data } = await supabaseAdmin
    .from('users')
    .select('id, role, tenant_id')
    .eq('auth_uid', user.id)
    .single();
  return data?.role === 'admin' ? data : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  const admin = await requireAdmin(token);
  if (!admin) return res.status(403).json({ error: 'Admin access required' });

  const { id } = req.query;
  const { transaction_ref } = req.body;

  const { data: payout, error: fetchErr } = await supabaseAdmin
    .from('payout_requests')
    .select('id, status')
    .eq('id', id)
    .single();

  if (fetchErr || !payout) return res.status(404).json({ error: 'Payout not found' });
  if (payout.status !== 'approved') return res.status(409).json({ error: `Cannot mark paid: status is ${payout.status}` });

  const { data, error } = await supabaseAdmin
    .from('payout_requests')
    .update({ status: 'paid', paid_at: new Date().toISOString(), transaction_ref })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Audit log
  await supabaseAdmin.from('audit_logs').insert({
    actor_id: admin.id,
    action: 'payout.mark_paid',
    entity: 'payout_requests',
    entity_id: id,
    meta: { transaction_ref },
  });

  return res.status(200).json({ payout: data });
}
