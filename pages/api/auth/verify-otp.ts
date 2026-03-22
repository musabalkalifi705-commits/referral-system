import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, token } = req.body;
  if (!phone || !token) return res.status(400).json({ error: 'phone and token are required' });

  const { data, error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error) return res.status(401).json({ error: error.message });

  return res.status(200).json({
    access_token: data.session?.access_token,
    refresh_token: data.session?.refresh_token,
    user: data.user,
  });
}
