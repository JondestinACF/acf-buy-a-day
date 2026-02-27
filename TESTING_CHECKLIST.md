# ACF Buy a Day — Testing Checklist

Use this checklist before any production deployment or major release.

---

## 1. Purchase Flow (Happy Path)

- [ ] Open the calendar page — all 365 days load correctly
- [ ] Available days show as clickable with a hover state
- [ ] Clicking an available day opens the checkout modal
- [ ] **Step A (Confirm):** Date and $100 price are displayed correctly
- [ ] Clicking "Continue" creates a checkout hold — day status changes to `CHECKOUT_HOLD` in DB
- [ ] The 10-minute countdown timer appears and ticks correctly
- [ ] **Step B (Dedication):**
  - [ ] Characters count in real time
  - [ ] Input rejects more than 20 characters
  - [ ] Emojis are rejected when `emojisAllowed = false`
  - [ ] Error message appears for invalid characters
  - [ ] "Continue without Dedication" works when text is not required
- [ ] **Step C (Buyer Info):**
  - [ ] All required fields are validated (first name, last name, email, address)
  - [ ] Email field rejects invalid format
  - [ ] Form does not submit with empty required fields
  - [ ] Billing address fields auto-complete correctly
- [ ] **Step D (Payment):**
  - [ ] Stripe Elements load without errors
  - [ ] Test card `4242 4242 4242 4242` succeeds
  - [ ] Processing spinner appears during payment
  - [ ] On success, modal shows "Thank You" and day turns `SOLD`
- [ ] Buyer receives a confirmation email with correct details
- [ ] ACF admin receives an internal notification email
- [ ] Sold day is visually marked on calendar (no longer clickable)
- [ ] Refreshing the calendar still shows the date as sold

---

## 2. Concurrency / Double-Booking Prevention

- [ ] Open two browser windows and navigate to the same available date simultaneously
- [ ] Window A: click the date and reach the payment step
- [ ] Window B: click the same date → should receive a "date unavailable" error (409)
- [ ] Complete payment in Window A → date is `SOLD`
- [ ] Window B is unable to purchase the date at any point
- [ ] After Window B's hold expires (10 min), date returns to `AVAILABLE` if Window A did not pay

**Automated test:** Run a script that fires 10 simultaneous `POST /api/checkout/hold` requests for the same date. Exactly 1 should succeed; the rest should return `409 DATE_UNAVAILABLE`.

---

## 3. Hold Expiry

- [ ] Create a checkout hold (click any date, reach Step B)
- [ ] Wait 10 minutes without completing purchase
- [ ] Verify: date returns to `AVAILABLE` in the database
- [ ] Verify: the next `GET /api/calendar` call expires the hold and shows `AVAILABLE`
- [ ] Verify: a `CHECKOUT_HOLD_EXPIRED` audit log entry is created
- [ ] Navigating away from checkout calls `DELETE /api/checkout/hold` (browser sendBeacon)

---

## 4. Payment Failure

- [ ] Use Stripe test card `4000 0000 0000 9995` (declined)
- [ ] Error message appears in payment step
- [ ] Hold on the date is **not** released (buyer can retry)
- [ ] Use test card `4000 0000 0000 0002` (card declined generically)
- [ ] `payment_intent.payment_failed` webhook fires → hold is released → date back to `AVAILABLE`

---

## 5. Stripe Webhook Reliability

- [ ] Complete a test payment and verify the webhook is received (`stripe listen` shows the event)
- [ ] Webhook handler marks day as `SOLD` with correct order ID
- [ ] Buyer email is sent after webhook (not before)
- [ ] Test idempotency: replay the same `payment_intent.succeeded` event twice — day should only be processed once (check audit log for single `PAYMENT_RECEIVED` entry)
- [ ] Kill the webhook forwarder mid-test, complete a payment, then restart — Stripe retries the webhook and day is eventually marked `SOLD`

---

## 6. Admin Holds

- [ ] Log in to admin dashboard at `/admin`
- [ ] Find an available date → click **Hold** → add a note → confirm
- [ ] Date changes to `ADMIN_HOLD` in DB and on public calendar
- [ ] `ADMIN_HOLD` date cannot be purchased by a buyer (returns "unavailable")
- [ ] Click **Release** → date returns to `AVAILABLE`
- [ ] Both `HOLD_CREATED` and `HOLD_RELEASED` entries appear in the audit log
- [ ] Admin cannot hold a `SOLD` date (should return 409 error)

---

## 7. Refunds

- [ ] Find a sold date in the admin dashboard → click **Refund**
- [ ] Enter a reason
- [ ] Toggle "Restore date to Available" on and off
- [ ] Confirm refund → Stripe refund ID is shown
- [ ] Check [Stripe Dashboard → Payments](https://dashboard.stripe.com/test/payments) — refund appears
- [ ] If "Restore" was checked: date status is `AVAILABLE` in DB
- [ ] If "Restore" was unchecked: date status is `ADMIN_HOLD` in DB
- [ ] `REFUND_ISSUED` audit log entry is created

---

## 8. Dedication Text Editing (Admin)

- [ ] Find a sold date → click **Edit Text**
- [ ] Change the dedication text → save
- [ ] `TEXT_EDIT` audit log entry includes old and new values
- [ ] New text appears on the public calendar (after refresh)
- [ ] Attempt to set text longer than 20 characters → server returns validation error

---

## 9. CSV Export

- [ ] Click **Export CSV** in admin dashboard
- [ ] File downloads with today's date in filename
- [ ] Open in Excel/Google Sheets — verify:
  - All `SOLD` and `ADMIN_HOLD` days are included
  - Columns: date, status, dedication_text, order_id, buyer info, amount, stripe ID, timestamp
  - No `AVAILABLE` days in the export
- [ ] Special characters in dedication text are properly quoted
- [ ] Test filtered export: `GET /api/admin/export?status=SOLD&month=2027-03`

---

## 10. Admin Settings

- [ ] Log in → go to Settings
- [ ] Change price to $150 → save → verify new checkout shows $150 price
- [ ] Enable "Require dedication text" → attempt checkout without text → error shown
- [ ] Enable "Allow emojis" → attempt checkout with emoji in dedication → succeeds
- [ ] Set Sales Start Date to tomorrow → public calendar shows "Sales Opening Soon" message
- [ ] Set Sales End Date to yesterday → public calendar shows "Sold Out" message (if all gone)
- [ ] Settings changes are rejected without admin session (test with curl, no auth cookie)

---

## 11. Authentication & Security

- [ ] Navigate to `/admin` without login → redirected to `/admin/login`
- [ ] Navigate to `/api/admin/days` without auth header → returns 401
- [ ] Admin login with wrong password → error shown, no session created
- [ ] Admin login with 11+ wrong attempts from same IP within 15 min → rate limit error
- [ ] Admin session expires after 8 hours (or configured timeout)
- [ ] Test rate limits on `POST /api/checkout/hold` (10/min per IP)
- [ ] Test rate limits on `GET /api/calendar` (60/min per IP)

---

## 12. Accessibility

- [ ] Calendar is fully navigable with keyboard (Tab, Enter, Space)
- [ ] Screen reader announces date status (Available, Sold, Admin Hold)
- [ ] All form inputs have `label` elements
- [ ] Error messages use `role="alert"` for screen reader announcement
- [ ] Color contrast ratios meet WCAG AA (use browser DevTools / axe plugin)
- [ ] Calendar legend is marked with `role="legend"`

---

## 13. Mobile Responsiveness

- [ ] Calendar renders correctly on iPhone 12 mini (375px)
- [ ] Calendar renders correctly on iPad (768px)
- [ ] Checkout modal is usable on mobile (scroll, tap targets ≥ 44px)
- [ ] Stripe payment element is usable on mobile keyboard
- [ ] Admin dashboard is usable on tablet (sidebar collapses or scrolls)

---

## 14. Edge Cases

| Scenario | Expected behavior |
|---|---|
| User clicks a date mid-hold by someone else | "Date unavailable" error (409) |
| User pays after hold expires | Stripe succeeds but webhook finds date AVAILABLE — should still mark SOLD (or fail gracefully) |
| All 365 days sold | Calendar page shows "Sold Out" messaging |
| Stripe webhook arrives before PaymentIntent is stored in DB | Webhook logs warning, retries on next Stripe attempt |
| Admin tries to refund a date with no Stripe PI | Returns 400 with helpful error message |
| DB connection drops mid-transaction | Transaction rolls back, buyer receives no charge (Stripe PI not confirmed) |
| Buyer submits dedication with SQL injection | Prisma parameterization prevents SQL injection |
| Buyer submits HTML in dedication field | Stored as plain text, rendered escaped in email template |

---

## Quick Smoke Test (5 minutes)

1. `npm run dev` — server starts without errors
2. Open `http://localhost:3000` — calendar loads, shows 365 days
3. Click an available date → checkout opens → confirm → enter `Test` as dedication → fill form → use test card `4242...` → complete
4. Check DB: `npx prisma studio` → calendar_days → find the date → status = `SOLD`
5. Open `http://localhost:3000/admin` → login → see the sold date in the table
6. Export CSV → verify the date appears in the download

---

*Last updated: 2025. Run this checklist after every significant code change and before each production deployment.*
