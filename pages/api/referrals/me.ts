import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  // Validate JWT and get user
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token' });

  // Get user record from users table
  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('auth_uid', user.id)
    .single();

  if (!userRow) return res.status(404).json({ error: 'User not found' });

  const { data: referrals, error } = await supabaseAdmin
    .from('referrals')
    .select(`
      id, commission_amount, status, created_at,
      redemption:redemptions(card:cards(serial, denomination))
    `)
    .eq('referrer_id', userRow.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const totalEarned = referrals
    ?.filter(r => r.status === 'confirmed')
    .reduce((sum, r) => sum + Number(r.commission_amount), 0) ?? 0;

  return res.status(200).json({ referrals, total_earned: totalEarned });
}
