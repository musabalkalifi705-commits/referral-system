import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { phone, tenant_id } = req.body;
  if (!phone || !tenant_id) return res.status(400).json({ error: 'phone and tenant_id are required' });

  // Verify tenant exists
  const { data: tenant, error: tenantErr } = await supabase
    .from('tenants')
    .select('id')
    .eq('id', tenant_id)
    .single();

  if (tenantErr || !tenant) return res.status(404).json({ error: 'Tenant not found' });

  // Upsert user
  const { error: upsertErr } = await supabase
    .from('users')
    .upsert({ phone, tenant_id, role: 'member' }, { onConflict: 'phone,tenant_id' });

  if (upsertErr) return res.status(500).json({ error: upsertErr.message });

  // Send OTP via Supabase Auth
  const { error: otpErr } = await supabase.auth.signInWithOtp({ phone });
  if (otpErr) return res.status(500).json({ error: otpErr.message });

  return res.status(200).json({ message: 'OTP sent' });
}
