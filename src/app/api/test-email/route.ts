/**
 * GET /api/test-email
 * Temporary diagnostic endpoint — sends a test email and returns the result.
 * DELETE THIS FILE after debugging is complete.
 */

import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function GET() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SMTP_FROM || 'NOT SET — using fallback';
  const adminEmail = process.env.ACF_ADMIN_EMAIL || 'NOT SET';

  // Check if env vars exist
  const diagnostics: Record<string, string> = {
    RESEND_API_KEY: apiKey ? `Set (starts with ${apiKey.substring(0, 6)}...)` : 'NOT SET',
    SMTP_FROM: from,
    ACF_ADMIN_EMAIL: adminEmail,
  };

  if (!apiKey) {
    return NextResponse.json({ diagnostics, error: 'RESEND_API_KEY is not set' }, { status: 500 });
  }

  const resend = new Resend(apiKey);

  try {
    const result = await resend.emails.send({
      from: from.includes('NOT SET') ? 'ACF <onboarding@resend.dev>' : from,
      to: adminEmail,
      subject: 'ACF Email Test — ' + new Date().toISOString(),
      text: 'If you received this, email sending is working!',
    });

    return NextResponse.json({
      diagnostics,
      success: true,
      result: result.data,
      error: result.error,
    });
  } catch (err) {
    return NextResponse.json({
      diagnostics,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
