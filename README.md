# ACF Buy a Day — 2027 Community Calendar

A full-stack web application that allows supporters of the **Albany Community Foundation** to purchase a specific day on the 2027 ACF Community Calendar for a $100 donation. Built with Next.js 14, Prisma, PostgreSQL, and Stripe.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Local Development Setup](#local-development-setup)
4. [Environment Variables](#environment-variables)
5. [Database Setup](#database-setup)
6. [Creating an Admin User](#creating-an-admin-user)
7. [Stripe Configuration](#stripe-configuration)
8. [Email Configuration](#email-configuration)
9. [Deployment to Vercel + Supabase/Neon](#deployment)
10. [Project Structure](#project-structure)
11. [Key Design Decisions](#key-design-decisions)
12. [Admin Dashboard Guide](#admin-dashboard-guide)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   Next.js 14 App                        │
│                                                         │
│   Public Routes          Admin Routes (protected)       │
│   ─────────────          ──────────────────────         │
│   /           ──┐        /admin         (dashboard)     │
│   /confirmation │        /admin/settings                │
│                 │        /admin/login                   │
│   API Routes    │                                       │
│   ─────────── ──┘        API Routes                     │
│   /api/calendar           /api/admin/days               │
│   /api/checkout/hold      /api/admin/holds              │
│   /api/stripe/webhook     /api/admin/refund             │
│                           /api/admin/export             │
│                           /api/admin/settings           │
└──────────────┬──────────────────────────────────────────┘
               │
     ┌─────────┼─────────┐
     │         │         │
  Stripe   PostgreSQL  Email
  (Payments) (Prisma)  (SMTP)
```

**Concurrency model:** Dates are locked using Prisma interactive transactions (`$transaction`) with `SELECT FOR UPDATE` semantics. A 10-minute checkout hold prevents double-booking while the buyer completes the form. The Stripe webhook is the sole source of truth for marking a day as sold.

---

## Prerequisites

- **Node.js** 18.17 or later
- **npm** 9+
- **PostgreSQL** database (Supabase Free Tier or Neon recommended)
- **Stripe** account (test keys are free)
- **Stripe CLI** for local webhook testing (`brew install stripe/stripe-cli/stripe`)
- **SMTP** email service (Gmail with App Password, SendGrid, Postmark, etc.)

---

## Local Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/your-org/acf-buy-a-day.git
cd acf-buy-a-day

# 2. Install dependencies
npm install

# 3. Copy environment file and fill in values
cp .env.example .env.local

# 4. Push the database schema
npm run db:push

# 5. Seed all 365 calendar days for 2027
npm run db:seed

# 6. Create your first admin user (interactive prompt)
npm run create-admin

# 7. Start the development server
npm run dev
# → App is running at http://localhost:3000
# → Admin at http://localhost:3000/admin

# 8. In a separate terminal, start Stripe webhook forwarding
npm run stripe:listen
# → Copy the webhook signing secret (whsec_...) into .env.local as STRIPE_WEBHOOK_SECRET
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in each value:

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `NEXTAUTH_SECRET` | Random 32-byte secret for JWT signing | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Full URL of the app | `http://localhost:3000` |
| `STRIPE_SECRET_KEY` | Stripe secret key (starts with `sk_`) | `sk_test_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret | `whsec_...` |
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_SECURE` | Use TLS (`true`/`false`) | `false` |
| `SMTP_USER` | SMTP username | `you@gmail.com` |
| `SMTP_PASS` | SMTP password or app password | `xxxx xxxx xxxx xxxx` |
| `SMTP_FROM` | From address in emails | `ACF <noreply@albanycf.org>` |
| `ACF_ADMIN_EMAIL` | Receives internal purchase notifications | `admin@albanycf.org` |
| `NEXT_PUBLIC_APP_URL` | Public URL (no trailing slash) | `https://buyaday.albanycf.org` |

> **Gmail tip:** Enable 2FA, then generate an [App Password](https://myaccount.google.com/apppasswords) under Security → App Passwords. Use that as `SMTP_PASS`.

---

## Database Setup

### Using Supabase (recommended)

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **Project Settings → Database → Connection String → URI**
3. Copy the URI and set it as `DATABASE_URL` in `.env.local`
4. Run `npm run db:push` to create tables
5. Run `npm run db:seed` to populate 365 days

### Using Neon

1. Create a free project at [neon.tech](https://neon.tech)
2. Copy the connection string from the dashboard
3. Follow steps 4–5 above

### Schema overview

| Table | Purpose |
|---|---|
| `calendar_days` | One row per day in 2027. Tracks status, buyer info, dedication text, Stripe PI. |
| `audit_logs` | Immutable log of every status change, edit, and refund. |
| `admin_settings` | Singleton row storing global config (price, emoji toggle, sales dates). |
| `admin_users` | Admin login credentials (bcrypt-hashed passwords). |

---

## Creating an Admin User

After seeding, run the interactive creation script:

```bash
npm run create-admin
# Prompts for: Full name, Email, Password (min 12 chars)
```

To add additional admins, run the script again or insert directly:

```bash
npx prisma studio
# Navigate to admin_users table → Add record
# Use bcrypt.hash(password, 12) to hash the password first
```

---

## Stripe Configuration

### Local testing

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Log in
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:3000/api/stripe/webhook

# Copy the "whsec_..." key shown and set it as STRIPE_WEBHOOK_SECRET
```

### Production webhooks

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks)
2. Add endpoint: `https://your-domain.com/api/stripe/webhook`
3. Subscribe to events:
   - `payment_intent.succeeded` ← **critical**
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copy the signing secret → set as `STRIPE_WEBHOOK_SECRET`

### Test cards (Stripe test mode)

| Scenario | Card number |
|---|---|
| Success | `4242 4242 4242 4242` |
| Requires authentication | `4000 0025 0000 3155` |
| Declined | `4000 0000 0000 9995` |

Use any future expiry and any CVC/ZIP.

---

## Email Configuration

The app uses Nodemailer with SMTP. Two emails are sent per purchase:

1. **Buyer confirmation** — Includes date, dedication, amount, order ID, and tax receipt language.
2. **Admin notification** — Full order details sent to `ACF_ADMIN_EMAIL`.

### Gmail setup

1. Enable 2-Factor Authentication on your Google account
2. Go to **myaccount.google.com → Security → App Passwords**
3. Generate a password for "Mail" / "Other (custom name)"
4. Use this password as `SMTP_PASS`

### Alternative providers

| Provider | `SMTP_HOST` | `SMTP_PORT` | `SMTP_SECURE` |
|---|---|---|---|
| Gmail | `smtp.gmail.com` | `587` | `false` |
| SendGrid | `smtp.sendgrid.net` | `587` | `false` |
| Postmark | `smtp.postmarkapp.com` | `587` | `false` |
| Mailgun | `smtp.mailgun.org` | `587` | `false` |

---

## Deployment

### Vercel + Supabase/Neon (recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel Dashboard → Project → Settings → Environment Variables
# OR use the CLI:
vercel env add DATABASE_URL
vercel env add NEXTAUTH_SECRET
vercel env add STRIPE_SECRET_KEY
# ... (add all variables from .env.example)

# Run migrations on production DB
vercel env pull .env.production.local
npx prisma migrate deploy

# Seed production DB
npx prisma db seed
```

### Important production checklist

- [ ] Switch Stripe keys from `sk_test_` / `pk_test_` to `sk_live_` / `pk_live_`
- [ ] Register production webhook in Stripe Dashboard (see above)
- [ ] Set `NEXTAUTH_URL` to the production domain
- [ ] Set `NEXT_PUBLIC_APP_URL` to the production domain
- [ ] Update ACF EIN in `src/lib/email.ts` (search `ACF-EIN-HERE`)
- [ ] Verify SMTP email works in production
- [ ] Run `npm run create-admin` targeting the production DB
- [ ] Test a full purchase with a real Stripe test card

---

## Project Structure

```
acf-buy-a-day/
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seeds 365 days + admin settings
├── scripts/
│   └── create-admin.ts      # Interactive admin user creation
├── src/
│   ├── app/
│   │   ├── page.tsx         # Public calendar page
│   │   ├── confirmation/    # Post-payment confirmation
│   │   ├── admin/           # Admin dashboard + login + settings
│   │   └── api/
│   │       ├── auth/        # NextAuth credentials
│   │       ├── calendar/    # Public calendar data
│   │       ├── checkout/    # Hold creation/release
│   │       ├── stripe/      # PaymentIntent + Webhook
│   │       └── admin/       # Protected admin endpoints
│   ├── components/
│   │   ├── Calendar/        # Year-view calendar with day cells
│   │   ├── Checkout/        # Multi-step checkout flow
│   │   └── admin/           # Admin UI components
│   ├── lib/
│   │   ├── prisma.ts        # Prisma singleton
│   │   ├── stripe.ts        # Stripe client
│   │   ├── email.ts         # Nodemailer email sending
│   │   ├── validation.ts    # Shared validation (client + server)
│   │   ├── ratelimit.ts     # In-memory rate limiting
│   │   ├── auditLog.ts      # Audit log helpers
│   │   └── orderNumber.ts   # Order ID generation
│   ├── middleware.ts         # Admin route protection
│   └── types/index.ts       # Shared TypeScript types
└── README.md
```

---

## Key Design Decisions

### Concurrency safety

Two buyers clicking the same date simultaneously is handled with Prisma interactive transactions:

```typescript
await prisma.$transaction(async (tx) => {
  const day = await tx.calendarDay.findUnique({ where: { date: dateObj } });
  if (day.status !== 'AVAILABLE') throw new Error('DATE_UNAVAILABLE');
  await tx.calendarDay.update({ where: { id: day.id }, data: { status: 'CHECKOUT_HOLD', ... } });
});
```

PostgreSQL row-level locking via `$transaction` ensures only one buyer can hold a date at a time.

### Checkout hold lifecycle

```
AVAILABLE
    ↓ (user clicks date)
CHECKOUT_HOLD (10 min TTL, holdToken issued)
    ↓ (Stripe webhook: payment_intent.succeeded)
SOLD
    ↑ (hold expires / payment fails → back to AVAILABLE)
```

### Webhook as source of truth

The Stripe webhook is the sole mechanism that marks a day as `SOLD`. The client-side payment confirmation also calls `onSuccess()`, but this is only for UI purposes. The actual state change always flows through the webhook.

### Admin authentication

NextAuth with a Credentials provider backed by `AdminUser` records (bcrypt-hashed passwords). Sessions last 8 hours. Rate limiting on login (10 attempts per 15 minutes per IP) prevents brute force.

---

## Admin Dashboard Guide

| Feature | How to access |
|---|---|
| View all purchases | Dashboard → Calendar Days table |
| Filter by month/status | Use dropdowns above the table |
| Create admin hold | Find an Available day → click **Hold** |
| Release admin hold | Find a held day → click **Release** |
| Edit dedication text | Find a Sold day → click **Edit Text** |
| Issue a refund | Find a Sold day → click **Refund** |
| Export CSV | Dashboard → top-right **Export CSV** button |
| View audit log | Dashboard → Recent Activity section |
| Configure settings | Settings page (sidebar) |
