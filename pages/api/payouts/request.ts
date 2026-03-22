import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return res.status(401).json({ error: 'Invalid token' });

  const { amount, method, account_details } = req.body;
  if (!amount || !method) return res.status(400).json({ error: 'amount and method are required' });
  if (Number(amount) <= 0) return res.status(400).json({ error: 'amount must be positive' });

  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('auth_uid', user.id)
    .single();

  if (!userRow) return res.status(404).json({ error: 'User not found' });

  // Check available balance (confirmed referrals not yet paid out)
  const { data: balance } = await supabaseAdmin.rpc('get_available_balance', {
    p_user_id: userRow.id,
  });

  if ((balance ?? 0) < Number(amount)) {
    return res.status(400).json({ error: 'Insufficient balance', available: balance });
  }

  const { data: payout, error } = await supabaseAdmin
    .from('payout_requests')
    .insert({
      user_id: userRow.id,
      amount,
      method,
      account_details,
      status: 'pending',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  return res.status(201).json({ payout });
}
