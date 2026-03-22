-- ══════════════════════════════════════════════════════════════════════
--  Seed Data — run AFTER migrations.sql
-- ══════════════════════════════════════════════════════════════════════

-- 1. Seed Tenant
INSERT INTO tenants (id, name, slug, config)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Demo Network',
  'demo',
  '{"currency":"SAR","min_payout":50}'
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Seed Owner / Admin User
INSERT INTO users (id, tenant_id, phone, name, role)
VALUES (
  '00000000-0000-0000-0000-000000000010',
  '00000000-0000-0000-0000-000000000001',
  '+966500000000',
  'Owner Admin',
  'admin'
)
ON CONFLICT (phone, tenant_id) DO NOTHING;

-- 3. Seed Commission Rules (level 1 = 10%, level 2 = 5%)
INSERT INTO commission_rules (tenant_id, level, rate, description)
VALUES
  ('00000000-0000-0000-0000-000000000001', 1, 0.1000, 'Direct referral — 10%'),
  ('00000000-0000-0000-0000-000000000001', 2, 0.0500, 'Second tier — 5%')
ON CONFLICT (tenant_id, level) DO NOTHING;

-- 4. Seed Sample Card
--    serial  = 'TEST-0001'
--    salt    = value of SECRET_SALT env var (replace 'YOUR_SECRET_SALT' below for local testing)
--    hash    = SHA256('TEST-0001' || 'YOUR_SECRET_SALT')
--
--    Compute with:
--      echo -n "TEST-0001YOUR_SECRET_SALT" | sha256sum
--    Or in Node.js:
--      require('crypto').createHash('sha256').update('TEST-0001' + process.env.SECRET_SALT).digest('hex')
--
--    Example hash for SECRET_SALT='changeme':
--      echo -n "TEST-0001changeme" | sha256sum
--      => 3b4c7a... (will vary — replace hash value below after computing)

INSERT INTO cards (tenant_id, serial, hash, denomination, wholesale_price, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'TEST-0001',
  -- Replace this placeholder with: sha256('TEST-0001' || YOUR_SECRET_SALT)
  encode(digest('TEST-0001' || 'changeme', 'sha256'), 'hex'),
  100.00,
  80.00,
  'unused'
)
ON CONFLICT (tenant_id, serial) DO NOTHING;
