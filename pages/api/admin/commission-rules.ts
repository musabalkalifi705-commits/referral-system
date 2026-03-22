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
  const token = req.headers.authorization?.replace('Bearer ', '');
  const admin = await requireAdmin(token);
  if (!admin) return res.status(403).json({ error: 'Admin access required' });

  if (req.method === 'GET') {
    const { data, error } = await supabaseAdmin
      .from('commission_rules')
      .select('*')
      .eq('tenant_id', admin.tenant_id)
      .order('level', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ rules: data });
  }

  if (req.method === 'POST') {
    const { level, rate, description } = req.body;
    if (level === undefined || rate === undefined)
      return res.status(400).json({ error: 'level and rate are required' });

    const { data, error } = await supabaseAdmin
      .from('commission_rules')
      .upsert(
        { tenant_id: admin.tenant_id, level, rate, description },
        { onConflict: 'tenant_id,level' }
      )
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ rule: data });
  }

  if (req.method === 'DELETE') {
    const { level } = req.body;
    if (level === undefined) return res.status(400).json({ error: 'level is required' });

    const { error } = await supabaseAdmin
      .from('commission_rules')
      .delete()
      .eq('tenant_id', admin.tenant_id)
      .eq('level', level);

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ message: 'Rule deleted' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
