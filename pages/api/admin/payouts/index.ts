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
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  const admin = await requireAdmin(token);
  if (!admin) return res.status(403).json({ error: 'Admin access required' });

  const { status, page = '1', limit = '20' } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = Math.min(parseInt(limit as string, 10), 100);
  const from = (pageNum - 1) * limitNum;

  let query = supabaseAdmin
    .from('payout_requests')
    .select(`
      id, amount, method, account_details, status, created_at, paid_at,
      user:users(id, phone, name)
    `, { count: 'exact' })
    .eq('users.tenant_id', admin.tenant_id)
    .order('created_at', { ascending: false })
    .range(from, from + limitNum - 1);

  if (status) query = query.eq('status', status as string);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ payouts: data, total: count, page: pageNum, limit: limitNum });
}
