-- ══════════════════════════════════════════════════════════════════════
--  Referral System — Migrations
--  Compatible with PostgreSQL (Supabase)
-- ══════════════════════════════════════════════════════════════════════

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Enums ─────────────────────────────────────────────────────────────
CREATE TYPE user_role        AS ENUM ('member', 'admin', 'super_admin');
CREATE TYPE card_status      AS ENUM ('unused', 'used', 'disabled');
CREATE TYPE referral_status  AS ENUM ('pending', 'confirmed', 'cancelled');
CREATE TYPE payout_status    AS ENUM ('pending', 'approved', 'paid', 'rejected');

-- ── Tenants ───────────────────────────────────────────────────────────
CREATE TABLE tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  config      JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Users ─────────────────────────────────────────────────────────────
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  auth_uid    UUID UNIQUE,                    -- Supabase Auth uid
  phone       TEXT NOT NULL,
  name        TEXT,
  role        user_role NOT NULL DEFAULT 'member',
  referrer_id UUID REFERENCES users(id),      -- who referred this user
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (phone, tenant_id)
);
CREATE INDEX idx_users_tenant   ON users(tenant_id);
CREATE INDEX idx_users_referrer ON users(referrer_id);

-- ── Cards ─────────────────────────────────────────────────────────────
CREATE TABLE cards (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  serial          TEXT NOT NULL,
  hash            TEXT NOT NULL,
  denomination    NUMERIC(12,2) NOT NULL,
  wholesale_price NUMERIC(12,2) NOT NULL,
  status          card_status NOT NULL DEFAULT 'unused',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, serial)
);
CREATE INDEX idx_cards_hash   ON cards(hash);
CREATE INDEX idx_cards_status ON cards(status);

-- ── Redemptions ───────────────────────────────────────────────────────
CREATE TABLE redemptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id     UUID NOT NULL REFERENCES cards(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  device_fp   TEXT,                            -- device fingerprint
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_redemptions_card ON redemptions(card_id);  -- one redemption per card
CREATE INDEX idx_redemptions_user        ON redemptions(user_id);

-- ── Referrals ─────────────────────────────────────────────────────────
CREATE TABLE referrals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  redemption_id     UUID NOT NULL REFERENCES redemptions(id),
  referrer_id       UUID NOT NULL REFERENCES users(id),
  level             SMALLINT NOT NULL DEFAULT 1,   -- 1 = direct, 2 = second tier …
  commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status            referral_status NOT NULL DEFAULT 'pending',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_referrals_referrer    ON referrals(referrer_id);
CREATE INDEX idx_referrals_redemption  ON referrals(redemption_id);

-- ── Commission Rules ──────────────────────────────────────────────────
CREATE TABLE commission_rules (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  level       SMALLINT NOT NULL,               -- 1, 2, 3 …
  rate        NUMERIC(5,4) NOT NULL,           -- e.g. 0.1000 = 10%
  description TEXT,
  UNIQUE (tenant_id, level)
);

-- ── Payout Requests ───────────────────────────────────────────────────
CREATE TABLE payout_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  method          TEXT NOT NULL,               -- e.g. 'bank_transfer', 'wallet'
  account_details JSONB,
  status          payout_status NOT NULL DEFAULT 'pending',
  approved_by     UUID REFERENCES users(id),
  transaction_ref TEXT,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_payouts_user   ON payout_requests(user_id);
CREATE INDEX idx_payouts_status ON payout_requests(status);

-- ── Audit Logs ────────────────────────────────────────────────────────
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES users(id),
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT,
  meta        JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_audit_actor  ON audit_logs(actor_id);
CREATE INDEX idx_audit_action ON audit_logs(action);

-- ══════════════════════════════════════════════════════════════════════
--  Atomic Redeem Function — called by /api/cards/redeem
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION redeem_card(
  p_serial      TEXT,
  p_hash        TEXT,
  p_referrer_id UUID,
  p_device_fp   TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_card        cards%ROWTYPE;
  v_user        users%ROWTYPE;
  v_redemption  redemptions%ROWTYPE;
  v_rule        commission_rules%ROWTYPE;
  v_referrer    users%ROWTYPE;
  v_level       SMALLINT := 1;
  v_commission  NUMERIC(12,2);
BEGIN
  -- Lock card row for atomic check-and-update
  SELECT * INTO v_card
  FROM cards
  WHERE serial = p_serial AND hash = p_hash
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: card % does not exist', p_serial;
  END IF;

  IF v_card.status <> 'unused' THEN
    RAISE EXCEPTION 'already_used: card % is %', p_serial, v_card.status;
  END IF;

  -- Mark card as used
  UPDATE cards SET status = 'used' WHERE id = v_card.id;

  -- Resolve the redeeming user (create if first redemption from this fingerprint)
  -- In production, derive user_id from the authenticated JWT instead
  IF p_referrer_id IS NOT NULL THEN
    SELECT * INTO v_referrer FROM users WHERE id = p_referrer_id;
  END IF;

  -- Create redemption
  INSERT INTO redemptions (card_id, user_id, device_fp)
  VALUES (v_card.id, COALESCE(p_referrer_id, v_card.tenant_id::UUID), p_device_fp)
  RETURNING * INTO v_redemption;

  -- Walk up referral chain and create commission rows
  IF p_referrer_id IS NOT NULL THEN
    v_referrer.id := p_referrer_id;
    LOOP
      SELECT * INTO v_rule
      FROM commission_rules
      WHERE tenant_id = v_card.tenant_id AND level = v_level;

      EXIT WHEN NOT FOUND OR v_level > 5;

      v_commission := ROUND(v_card.denomination * v_rule.rate, 2);

      INSERT INTO referrals (tenant_id, redemption_id, referrer_id, level, commission_amount, status)
      VALUES (v_card.tenant_id, v_redemption.id, v_referrer.id, v_level, v_commission, 'pending');

      -- Traverse to next level referrer
      SELECT * INTO v_referrer FROM users WHERE id = v_referrer.referrer_id;
      EXIT WHEN NOT FOUND OR v_referrer.id IS NULL;

      v_level := v_level + 1;
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'redemption_id', v_redemption.id,
    'card_id',       v_card.id,
    'denomination',  v_card.denomination
  );
END;
$$;

-- ══════════════════════════════════════════════════════════════════════
--  Helper: get available payout balance for a user
-- ══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_available_balance(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    (SELECT SUM(commission_amount) FROM referrals WHERE referrer_id = p_user_id AND status = 'confirmed')
    -
    (SELECT COALESCE(SUM(amount), 0) FROM payout_requests WHERE user_id = p_user_id AND status IN ('pending','approved','paid'))
  , 0);
$$;
