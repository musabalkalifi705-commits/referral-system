# Referral System — Next.js + Supabase

Multi-tenant referral card redemption platform with commission tracking and payout management.

## Architecture

```
Next.js (TypeScript) → Supabase (Postgres + Auth)
```

---

## 🚀 Deploy Steps

### 1. Supabase Setup
1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** → paste and run `migrations.sql`
3. Then paste and run `scripts/seed.sql` (update `SECRET_SALT` value first)
4. Copy your project URL, anon key, and service role key from **Settings → API**

### 2. Environment Variables
Copy `.env.example` to `.env.local` for local dev:

```bash
cp .env.example .env.local
# Edit .env.local with your actual values
```

For production on **Vercel**: add all vars in **Project → Settings → Environment Variables**

### 3. Deploy to Vercel
```bash
# Option A: GitHub (recommended)
# 1. Push this repo to GitHub
# 2. Import project in vercel.com
# 3. Set env vars (step 2)
# 4. Deploy

# Option B: CLI
npm i -g vercel
vercel --prod
```

### 4. Local Development
```bash
npm install
npm run dev
# App runs at http://localhost:3000
```

---

## 📡 API Reference + Sample curl Commands

> Replace `BASE_URL` with your deployment URL or `http://localhost:3000`

### Register + Verify (OTP Flow)

```bash
# Step 1 — Register (sends OTP via Supabase Auth / SMS)
curl -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+966500000001","tenant_id":"00000000-0000-0000-0000-000000000001"}'

# Step 2 — Verify OTP (returns access_token)
curl -X POST "$BASE_URL/api/auth/verify-otp" \
  -H "Content-Type: application/json" \
  -d '{"phone":"+966500000001","token":"123456"}'
# → { "access_token": "eyJ...", "user": {...} }
```

### Redeem Sample Card

First, compute the hash of the sample card:
```bash
# Bash (replace 'changeme' with your SECRET_SALT)
echo -n "TEST-0001changeme" | sha256sum

# Node.js
node -e "const c=require('crypto');console.log(c.createHash('sha256').update('TEST-0001'+'changeme').digest('hex'))"
```

Then redeem:
```bash
curl -X POST "$BASE_URL/api/cards/redeem" \
  -H "Content-Type: application/json" \
  -d '{
    "serial": "TEST-0001",
    "hash": "<computed-hash-above>",
    "referrer_id": "00000000-0000-0000-0000-000000000010",
    "device_fp": "fp_abc123"
  }'
# → { "success": true, "redemption": { "redemption_id": "...", "denomination": 100 } }
```

### Request Payout

```bash
curl -X POST "$BASE_URL/api/payouts/request" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <access_token>" \
  -d '{
    "amount": 50,
    "method": "bank_transfer",
    "account_details": { "iban": "SA0380000000608010167519", "name": "John Doe" }
  }'
```

### Admin: Upload Cards CSV

CSV format: `serial,hash,denomination,wholesale_price`

```bash
curl -X POST "$BASE_URL/api/admin/cards/upload" \
  -H "Content-Type: text/plain" \
  -H "Authorization: Bearer <admin_access_token>" \
  --data-binary @cards.csv
# → { "imported": 98, "duplicates_skipped": 2, "total": 100 }
```

### Admin: Approve + Mark Paid

```bash
# Approve
curl -X POST "$BASE_URL/api/admin/payouts/<payout_id>/approve" \
  -H "Authorization: Bearer <admin_access_token>"

# Mark as paid
curl -X POST "$BASE_URL/api/admin/payouts/<payout_id>/mark-paid" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_access_token>" \
  -d '{"transaction_ref":"TXN-20240315-001"}'
```

---

## 🔒 Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` is never exposed to the client — server-side only
- Card hashes use `SHA256(serial + SECRET_SALT)` — rotate `SECRET_SALT` if compromised
- Rate limiting placeholder in `/api/cards/redeem` — implement with Upstash Redis or similar before production
- All admin endpoints validate JWT + check `role = 'admin'` in DB

---

## 📁 Project Structure

```
├── lib/
│   └── supabase.ts           # Supabase client(s)
├── pages/
│   └── api/
│       ├── auth/
│       │   ├── register.ts
│       │   └── verify-otp.ts
│       ├── cards/
│       │   └── redeem.ts     # Atomic redemption + referral chain
│       ├── referrals/
│       │   └── me.ts
│       ├── payouts/
│       │   └── request.ts
│       └── admin/
│           ├── cards/upload.ts
│           ├── payouts/
│           │   ├── index.ts
│           │   └── [id]/
│           │       ├── approve.ts
│           │       └── mark-paid.ts
│           └── commission-rules.ts
├── migrations.sql            # Full DB schema + stored procedures
├── scripts/seed.sql          # Seed data
├── .env.example
└── README.md
```
