import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { serial, referrer_code, device_fp } = req.body;
  if (!serial) return res.status(400).json({ error: 'serial مطلوب' });

  const salt = process.env.SECRET_SALT ?? '';
  const hash = createHash('sha256').update(serial + salt).digest('hex');

  let referrer_id: string | null = null;
  if (referrer_code) {
    const { data: refUser } = await admin
      .from('users')
      .select('id')
      .ilike('id', `${referrer_code}%`)
      .single();
    if (refUser) referrer_id = refUser.id;
  }

  const { data, error } = await admin.rpc('redeem_card', {
    p_serial: serial,
    p_hash: hash,
    p_referrer_id: referrer_id,
    p_device_fp: device_fp ?? null,
  });

  if (error) {
    if (error.message.includes('already_used')) return res.status(409).json({ error: 'هذا الكرت مستخدم مسبقاً' });
    if (error.message.includes('not_found')) return res.status(404).json({ error: 'الكرت غير موجود أو الرقم خاطئ' });
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true, redemption: data });
}
