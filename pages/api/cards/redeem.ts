import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';

// TODO: Add rate-limit middleware — 3 attempts / 5 minutes per IP/device_fp
// Example: use 'upstash/ratelimit' or a Redis-based counter keyed on `${ip}:${device_fp}`

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function computeHash(serial: string): string {
  const salt = process.env.SECRET_SALT ?? '';
  return createHash('sha256').update(serial + salt).digest('hex');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { serial, hash, referrer_id, device_fp } = req.body;
  if (!serial || !hash) return res.status(400).json({ error: 'serial and hash are required' });

  // Validate hash client provided matches server-computed hash
  const expectedHash = computeHash(serial);
  if (hash !== expectedHash) return res.status(400).json({ error: 'Invalid card hash' });

  // ── Atomic redemption via RPC (Postgres function wraps transaction) ──────
  const { data, error } = await supabaseAdmin.rpc('redeem_card', {
    p_serial: serial,
    p_hash: hash,
    p_referrer_id: referrer_id ?? null,
    p_device_fp: device_fp ?? null,
  });

  if (error) {
    if (error.message.includes('already_used'))
      return res.status(409).json({ error: 'Card already redeemed' });
    if (error.message.includes('not_found'))
      return res.status(404).json({ error: 'Card not found' });
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true, redemption: data });
}
