// =============================================================================
//  POST /api/otp — OTP Generation, Delivery & Verification
//  Actions:
//    - 'send': Generates & sends a 6-digit OTP code to email
//    - 'verify': Validates the OTP and creates/authenticates the user
//    - 'resend': Resends fresh OTP code (with cooldown rate limit)
// =============================================================================

import { supabaseAdmin } from './_supabase.js';
import { handleCors, sendError, sendSuccess } from './_middleware.js';
import { sendEmail, buildOtpEmailHtml } from './_mailer.js';

// In-memory cache for instant serverless resilience alongside DB
globalThis._zaronaOtpStore = globalThis._zaronaOtpStore || new Map();
globalThis._zaronaRateLimit = globalThis._zaronaRateLimit || new Map();

export default async function handler(req, res) {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed');
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  const { action = 'send', email, full_name, password, otp } = body;

  if (!email) {
    return sendError(res, 400, 'Email address is required');
  }

  const cleanEmail = email.toLowerCase().trim();

  // ── ACTION: SEND or RESEND ────────────────────────────────────────────────
  if (action === 'send' || action === 'resend') {
    // 1. Check if user already exists
    try {
      const { data: existingUser } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', cleanEmail)
        .single();

      if (existingUser) {
        return sendError(res, 400, 'An account with this email address already exists. Please login instead.');
      }
    } catch (e) {
      // Not found is good
    }

    // 2. Cooldown check (45 seconds between sends)
    const lastSent = globalThis._zaronaRateLimit.get(cleanEmail);
    const now = Date.now();
    if (lastSent && now - lastSent < 45 * 1000) {
      const waitSec = Math.ceil((45 * 1000 - (now - lastSent)) / 1000);
      return sendError(res, 429, `Please wait ${waitSec} seconds before requesting a new code.`);
    }

    // 3. Generate 6-digit code
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(now + 10 * 60 * 1000); // 10 minutes

    // Preserve existing payload if resending
    const existing = globalThis._zaronaOtpStore.get(cleanEmail) || {};
    const metaFullName = full_name || existing.full_name || '';
    const metaPassword = password || existing.password || '';

    if (!metaPassword && action === 'send') {
      return sendError(res, 400, 'Password is required to initiate registration');
    }

    // Store in memory
    globalThis._zaronaOtpStore.set(cleanEmail, {
      otp: generatedOtp,
      full_name: metaFullName,
      password: metaPassword,
      expiresAt,
    });
    globalThis._zaronaRateLimit.set(cleanEmail, now);

    // Also persist to Supabase email_otps table if it exists
    try {
      await supabaseAdmin.from('email_otps').insert([{
        email: cleanEmail,
        otp_code: generatedOtp,
        metadata: { full_name: metaFullName, password: metaPassword },
        expires_at: expiresAt.toISOString(),
      }]);
    } catch (dbErr) {
      console.warn('DB OTP insert skipped (memory active):', dbErr.message);
    }

    // 4. Send email
    const emailResult = await sendEmail({
      to: cleanEmail,
      subject: `Your Zarona Verification Code: ${generatedOtp}`,
      html: buildOtpEmailHtml({
        otp: generatedOtp,
        email: cleanEmail,
        name: metaFullName,
      }),
      text: `Your Zarona Unisex verification code is ${generatedOtp}. It will expire in 10 minutes.`,
    });

    return sendSuccess(res, {
      message: 'Verification code sent to your email.',
      email: cleanEmail,
      provider: emailResult.provider,
    });
  }

  // ── ACTION: VERIFY ────────────────────────────────────────────────────────
  if (action === 'verify') {
    if (!otp) {
      return sendError(res, 400, 'Please enter the 6-digit verification code.');
    }

    const cleanOtp = String(otp).trim().replace(/\s+/g, '');
    let matched = false;
    let metadata = {};

    // 1. Check memory store
    const memRecord = globalThis._zaronaOtpStore.get(cleanEmail);
    if (memRecord && memRecord.otp === cleanOtp && new Date() < memRecord.expiresAt) {
      matched = true;
      metadata = { full_name: memRecord.full_name, password: memRecord.password };
    }

    // 2. Check DB if not matched in memory
    if (!matched) {
      try {
        const { data: dbRecords } = await supabaseAdmin
          .from('email_otps')
          .select('*')
          .eq('email', cleanEmail)
          .eq('otp_code', cleanOtp)
          .eq('verified', false)
          .order('created_at', { ascending: false })
          .limit(1);

        if (dbRecords && dbRecords.length > 0) {
          const dbRec = dbRecords[0];
          if (new Date(dbRec.expires_at) > new Date()) {
            matched = true;
            metadata = dbRec.metadata || {};
            // Mark verified in DB
            await supabaseAdmin.from('email_otps').update({ verified: true }).eq('id', dbRec.id);
          }
        }
      } catch (dbErr) {
        console.warn('DB OTP lookup error:', dbErr.message);
      }
    }

    if (!matched) {
      return sendError(res, 400, 'Invalid or expired verification code. Please request a new one.');
    }

    // Clear from memory store
    globalThis._zaronaOtpStore.delete(cleanEmail);

    const full_name = metadata.full_name || '';
    const regPassword = metadata.password;

    if (!regPassword) {
      return sendError(res, 400, 'Registration session expired. Please start over.');
    }

    // 3. Create confirmed user account in Supabase Auth
    const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: regPassword,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError && !createError.message?.toLowerCase().includes('already')) {
      return sendError(res, 400, createError.message);
    }

    const user = createData?.user;

    // Check if admin email
    const adminEmails = [
      (process.env.ADMIN_EMAIL || '').toLowerCase(),
      'tekawasthi16@gmail.com'
    ].filter(Boolean);

    let role = 'customer';
    if (adminEmails.includes(cleanEmail)) {
      if (user) {
        await supabaseAdmin.from('profiles').update({ role: 'admin' }).eq('id', user.id);
      }
      role = 'admin';
    }

    // 4. Authenticate user immediately
    const { data: signInData, error: signInErr } = await supabaseAdmin.auth.signInWithPassword({
      email: cleanEmail,
      password: regPassword,
    });

    if (signInErr || !signInData?.session) {
      return sendSuccess(res, {
        message: 'Account verified successfully. Please sign in.',
        user: { id: user?.id, email: cleanEmail, role },
      }, 201);
    }

    return sendSuccess(res, {
      token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      user: {
        id: signInData.user.id,
        email: signInData.user.email,
        full_name,
        role,
      },
    }, 201);
  }

  return sendError(res, 400, 'Invalid action specified');
}
