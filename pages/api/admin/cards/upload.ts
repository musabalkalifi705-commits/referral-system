import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';
import { parse } from 'csv-parse/sync';

export const config = { api: { bodyParser: { sizeLimit: '5mb' } } };

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

  const csvText: string = req.body;
  if (!csvText) return res.status(400).json({ error: 'CSV body required' });

  // Expected columns: serial, hash, denomination, wholesale_price
  let records: Array<{ serial: string; hash: string; denomination: string; wholesale_price: string }>;
  try {
    records = parse(csvText, { columns: true, skip_empty_lines: true, trim: true });
  } catch {
    return res.status(400).json({ error: 'Invalid CSV format' });
  }

  const required = ['serial', 'hash', 'denomination', 'wholesale_price'];
  if (!required.every(k => k in (records[0] ?? {}))) {
    return res.status(400).json({ error: `CSV must include columns: ${required.join(', ')}` });
  }

  const rows = records.map(r => ({
    tenant_id: admin.tenant_id,
    serial: r.serial,
    hash: r.hash,
    denomination: parseFloat(r.denomination),
    wholesale_price: parseFloat(r.wholesale_price),
    status: 'unused',
  }));

  let imported = 0;
  let duplicates_skipped = 0;

  // Insert in batches of 100, ignoring conflicts on (tenant_id, serial)
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    const { data, error } = await supabaseAdmin
      .from('cards')
      .upsert(batch, { onConflict: 'tenant_id,serial', ignoreDuplicates: true })
      .select('id');
    if (error) return res.status(500).json({ error: error.message });
    imported += data?.length ?? 0;
    duplicates_skipped += batch.length - (data?.length ?? 0);
  }

  return res.status(200).json({ imported, duplicates_skipped, total: records.length });
}
