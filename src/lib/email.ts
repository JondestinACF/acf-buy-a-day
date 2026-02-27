/**
 * src/lib/email.ts
 * Email sending via Resend.
 * Used for buyer confirmations and ACF internal notifications.
 */

import { Resend } from 'resend';
import { format } from 'date-fns';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.SMTP_FROM || 'Albany Community Foundation <onboarding@resend.dev>';
const ACF_ADMIN_EMAIL = process.env.ACF_ADMIN_EMAIL || 'destin@albanycommunityfoundation.org';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return format(new Date(year, month - 1, day), 'MMMM d, yyyy');
}

function formatMoney(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

// ─── Buyer Confirmation Email ─────────────────────────────────────────────────

interface BuyerEmailParams {
  toEmail: string;
  toName: string;
  orderId: string;
  date: string;
  dedicationText?: string;
  amountCents: number;
  paidAt: string;
}

export async function sendBuyerConfirmation(params: BuyerEmailParams): Promise<void> {
  const { toEmail, toName, orderId, date, dedicationText, amountCents, paidAt } = params;
  const formattedDate = formatDate(date);
  const amount = formatMoney(amountCents);
  const paidDate = format(new Date(paidAt), "MMMM d, yyyy 'at' h:mm a");

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Thank You — ACF Buy a Day Confirmation</title>
<style>
  body { font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 0; }
  .wrapper { max-width: 600px; margin: 0 auto; background: #fff; }
  .header { background: #2d5a40; padding: 32px 40px; text-align: center; }
  .header h1 { color: #fff; margin: 0; font-size: 22px; font-weight: bold; }
  .header p { color: #a8c5b0; margin: 8px 0 0; font-size: 14px; }
  .body { padding: 40px; color: #333; }
  .greeting { font-size: 18px; font-weight: bold; margin-bottom: 16px; color: #2d5a40; }
  .detail-box { background: #eaf5ee; border-radius: 8px; padding: 24px; margin: 24px 0; }
  .detail-row { display: flex; justify-content: space-between; padding: 6px 0;
                border-bottom: 1px solid #c5ddc9; font-size: 14px; }
  .detail-row:last-child { border-bottom: none; }
  .detail-label { color: #666; }
  .detail-value { font-weight: bold; color: #2d5a40; }
  .dedication { background: #fffbeb; border-left: 4px solid #bf3a2b; padding: 16px 20px;
                margin: 20px 0; border-radius: 0 8px 8px 0; }
  .dedication-label { font-size: 12px; text-transform: uppercase; letter-spacing: 1px;
                       color: #bf3a2b; margin-bottom: 6px; }
  .dedication-text { font-size: 20px; font-weight: bold; color: #5a4400; }
  .tax-note { font-size: 13px; color: #666; line-height: 1.6; margin: 20px 0;
              padding: 16px; background: #f7f7f7; border-radius: 6px; }
  .footer { background: #1e3d2b; padding: 24px 40px; text-align: center;
            font-size: 12px; color: #a8c5b0; }
  .footer a { color: #f0ec8a; text-decoration: none; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>Albany Community Foundation</h1>
    <p>2027 Community Calendar — Buy a Day</p>
  </div>
  <div class="body">
    <div class="greeting">Thank you, ${toName}!</div>
    <p>Your donation has been received and your day on the 2027 ACF Community Calendar is confirmed. We're so grateful for your support of the Albany Community Foundation and the grants and programs that strengthen our community.</p>

    ${dedicationText ? `
    <div class="dedication">
      <div class="dedication-label">Your Dedication</div>
      <div class="dedication-text">"${dedicationText}"</div>
    </div>
    ` : ''}

    <div class="detail-box">
      <div class="detail-row">
        <span class="detail-label">Confirmation #</span>
        <span class="detail-value">${orderId}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Calendar Date</span>
        <span class="detail-value">${formattedDate}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Donation Amount</span>
        <span class="detail-value">${amount}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Date Processed</span>
        <span class="detail-value">${paidDate}</span>
      </div>
    </div>

    <div class="tax-note">
      <strong>Tax Receipt:</strong> Albany Community Foundation is a 501(c)(3) nonprofit organization. Your donation of ${amount} may be tax-deductible to the extent allowed by law. No goods or services were provided in exchange for this contribution. Please retain this email as your official receipt.
    </div>

    <p>Look for the 2027 ACF Community Calendar later this year featuring your special dedication. If you have any questions, please contact us at <a href="mailto:${ACF_ADMIN_EMAIL}">${ACF_ADMIN_EMAIL}</a>.</p>

    <p style="color:#2d5a40; font-weight: bold;">With gratitude,<br>The Albany Community Foundation Team</p>
  </div>
  <div class="footer">
    <p>Albany Community Foundation &bull; 1164 Solano Ave, Box 133, Albany, CA 94706</p>
    <p>You are receiving this because you made a donation. This is not a marketing email.</p>
  </div>
</div>
</body>
</html>`.trim();

  const text = `
Thank You, ${toName}!

Your donation has been received and your day on the 2027 ACF Community Calendar is confirmed.

${dedicationText ? `Your Dedication: "${dedicationText}"\n` : ''}
Confirmation #: ${orderId}
Calendar Date: ${formattedDate}
Donation Amount: ${amount}
Date Processed: ${paidDate}

Tax Receipt: Albany Community Foundation is a 501(c)(3) nonprofit. Your donation of ${amount} may be tax-deductible. No goods or services were provided in exchange.

Questions? Contact us at ${ACF_ADMIN_EMAIL}.

With gratitude,
The Albany Community Foundation Team`.trim();

  await resend.emails.send({
    from: FROM,
    to: toEmail,
    subject: `Your 2027 ACF Calendar Day Confirmed — ${formattedDate} (${orderId})`,
    html,
    text,
  });
}

// ─── Admin Notification Email ─────────────────────────────────────────────────

interface AdminEmailParams extends BuyerEmailParams {
  buyerPhone?: string;
  stripePaymentIntentId: string;
}

export async function sendAdminNotification(params: AdminEmailParams): Promise<void> {
  const { toName, toEmail, orderId, date, dedicationText, amountCents,
    paidAt, buyerPhone, stripePaymentIntentId } = params;
  const formattedDate = formatDate(date);
  const amount = formatMoney(amountCents);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>New Calendar Purchase — ACF Admin</title>
<style>
  body { font-family: Arial, sans-serif; background: #f9f9f9; margin: 0; padding: 20px; }
  .box { background: #fff; max-width: 580px; margin: 0 auto; border-radius: 8px;
         padding: 32px; border: 1px solid #e0e0e0; }
  h2 { color: #2d5a40; margin-top: 0; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
  td:first-child { color: #666; width: 40%; }
  td:last-child { font-weight: bold; }
  .badge { background: #2d5a40; color: #fff; padding: 4px 12px; border-radius: 20px;
           font-size: 12px; font-weight: bold; }
</style>
</head>
<body>
<div class="box">
  <h2>🎉 New Calendar Day Purchase</h2>
  <p>A new "Buy a Day" order has been successfully processed.</p>
  <table>
    <tr><td>Order ID</td><td>${orderId}</td></tr>
    <tr><td>Calendar Date</td><td>${formattedDate}</td></tr>
    <tr><td>Dedication</td><td>${dedicationText || '<em>none</em>'}</td></tr>
    <tr><td>Buyer Name</td><td>${toName}</td></tr>
    <tr><td>Buyer Email</td><td>${toEmail}</td></tr>
    <tr><td>Buyer Phone</td><td>${buyerPhone || 'not provided'}</td></tr>
    <tr><td>Amount</td><td>${amount} <span class="badge">PAID</span></td></tr>
    <tr><td>Stripe PI</td><td>${stripePaymentIntentId}</td></tr>
    <tr><td>Processed At</td><td>${format(new Date(paidAt), 'PPpp')}</td></tr>
  </table>
  <p style="margin-top:24px;font-size:13px;color:#888;">
    View in admin: <a href="${APP_URL}/admin">${APP_URL}/admin</a>
  </p>
</div>
</body>
</html>`.trim();

  await resend.emails.send({
    from: FROM,
    to: ACF_ADMIN_EMAIL,
    subject: `[ACF] New Calendar Purchase: ${formattedDate} — ${toName} (${orderId})`,
    html,
  });
}

// ─── Test Connection ───────────────────────────────────────────────────────────

export async function testEmailConnection(): Promise<boolean> {
  try {
    const result = await resend.emails.send({
      from: FROM,
      to: ACF_ADMIN_EMAIL,
      subject: 'ACF Email Test',
      text: 'Email connection is working!',
    });
    return !!result.data;
  } catch {
    return false;
  }
}
