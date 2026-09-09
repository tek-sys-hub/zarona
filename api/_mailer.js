// =============================================================================
//  ZARONA — Email Dispatcher Utility
//  Supports Resend API and Nodemailer SMTP with luxury editorial HTML template
// =============================================================================

import { Resend } from 'resend';
import nodemailer from 'nodemailer';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465');
const FROM_EMAIL = process.env.EMAIL_FROM || 'Zarona Unisex <onboarding@resend.dev>';

/**
 * Builds the dark luxury Zarona HTML email template
 */
export function buildOtpEmailHtml({ otp, email, name = '' }) {
  const formattedOtp = otp.split('').join(' ');
  const greeting = name ? `Hello ${name},` : 'Hello,';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Zarona Verification Code</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0d0d0d;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #ede8df;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0d0d0d;
      padding: 40px 16px;
      box-sizing: border-box;
    }
    .container {
      max-width: 520px;
      margin: 0 auto;
      background: #141414;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      padding: 40px 32px;
      box-sizing: border-box;
      text-align: center;
    }
    .brand-eyebrow {
      font-size: 11px;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      color: #9e9a90;
      margin-bottom: 8px;
    }
    .brand-title {
      font-family: Georgia, serif;
      font-size: 26px;
      font-weight: 400;
      letter-spacing: 0.04em;
      color: #ffffff;
      margin: 0 0 24px;
    }
    .divider {
      height: 1px;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.12), transparent);
      margin: 20px 0 28px;
    }
    .greeting {
      font-size: 15px;
      color: #dcd7ce;
      line-height: 1.6;
      margin: 0 0 16px;
      text-align: left;
    }
    .text {
      font-size: 14px;
      color: #a39e94;
      line-height: 1.6;
      margin: 0 0 32px;
      text-align: left;
    }
    .otp-box {
      background: #1c1c1c;
      border: 1px solid rgba(212, 175, 55, 0.35);
      border-radius: 10px;
      padding: 22px 16px;
      margin: 0 auto 32px;
      text-align: center;
    }
    .otp-label {
      font-size: 11px;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #c9a86a;
      margin-bottom: 8px;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace;
      font-size: 34px;
      font-weight: 700;
      letter-spacing: 0.3em;
      color: #ffffff;
      margin: 0;
    }
    .expiry-note {
      font-size: 12px;
      color: #7a766e;
      line-height: 1.5;
      margin-bottom: 32px;
    }
    .footer {
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 24px;
      font-size: 11px;
      color: #5a5750;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <div class="brand-eyebrow">EXCLUSIVE ACCESS</div>
      <h1 class="brand-title">ZARONA UNISEX</h1>
      <div class="divider"></div>

      <p class="greeting">${greeting}</p>
      <p class="text">
        Please use the one-time verification code below to verify your email address (<strong>${email}</strong>) and activate your Zarona account.
      </p>

      <div class="otp-box">
        <div class="otp-label">Verification Code</div>
        <div class="otp-code">${formattedOtp}</div>
      </div>

      <p class="expiry-note">
        This code is confidential and will expire in <strong>10 minutes</strong>.<br>
        If you did not request this verification code, please ignore this email.
      </p>

      <div class="footer">
        <div>&copy; 2025 Zarona Unisex. All rights reserved.</div>
        <div style="margin-top: 4px;">Timeless Styles. For Everyone.</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Sends an email using Nodemailer SMTP, Resend, or dev preview
 */
export async function sendEmail({ to, subject, html, text }) {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : '';
  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465');

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || (smtpUser ? `Zarona Unisex <${smtpUser}>` : 'Zarona Unisex <onboarding@resend.dev>');

  // 1. Try SMTP if configured (Works with Gmail, Brevo, SendGrid without custom domain)
  if (smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const info = await transporter.sendMail({
        from: fromEmail,
        to,
        subject,
        html,
        text,
      });
      console.log('Email dispatched via SMTP:', info.messageId);
      return { success: true, provider: 'smtp', messageId: info.messageId };
    } catch (err) {
      console.error('SMTP error:', err);
    }
  }

  // 2. Try Resend if configured
  if (resendApiKey) {
    try {
      const resend = new Resend(resendApiKey);
      const data = await resend.emails.send({
        from: fromEmail,
        to,
        subject,
        html,
        text,
      });
      console.log('Email dispatched via Resend:', data);
      return { success: true, provider: 'resend', data };
    } catch (err) {
      console.error('Resend error:', err);
    }
  }

  // 3. Fallback for development / preview environments
  console.log(`\n======================================================`);
  console.log(`[EMAIL DISPATCHER (DEV FALLBACK)]`);
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`HTML Body Generated (${html.length} chars)`);
  console.log(`======================================================\n`);

  return { success: true, provider: 'dev_logger' };
}
