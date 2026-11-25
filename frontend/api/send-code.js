import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Internal-Secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { toEmail, code, secret } = req.body || {};
  const headerSecret = req.headers['x-internal-secret'];
  const expectedSecret = 'bv_relay_sec_993418';

  if (secret !== expectedSecret && headerSecret !== expectedSecret) {
    return res.status(403).json({ error: 'Unauthorized relay request' });
  }

  if (!toEmail || !code) {
    return res.status(400).json({ error: 'toEmail and code are required' });
  }

  const user = process.env.MAIL_USERNAME;
  const pass = process.env.MAIL_PASSWORD;

  if (!user || !pass) {
    console.error('[SMTP RELAY ERROR] MAIL_USERNAME and MAIL_PASSWORD environment variables must be configured on Vercel.');
    return res.status(500).json({ success: false, error: 'Mail environment credentials not configured' });
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    connectionTimeout: 10000,
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f17; color: #f8fafc; margin: 0; padding: 24px; }
        .card { max-width: 520px; margin: 0 auto; background: #131b2a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        .brand { font-size: 20px; font-weight: 900; color: #00f2fe; margin-bottom: 24px; }
        .badge { display: inline-block; padding: 4px 10px; background: rgba(0,242,254,0.1); border: 1px solid rgba(0,242,254,0.3); border-radius: 6px; font-size: 11px; font-weight: 700; color: #00f2fe; margin-bottom: 16px; }
        h2 { margin: 0 0 12px 0; font-size: 22px; color: #ffffff; }
        p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; }
        .code-box { background: #070d17; border: 2px dashed #00f2fe; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
        .code { font-family: 'SFMono-Regular', Consolas, monospace; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #38bdf8; }
        .footer { font-size: 12px; color: #64748b; margin-top: 28px; border-top: 1px solid #1e293b; padding-top: 16px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="brand">⚡ BidVelocity</div>
        <div class="badge">SECURITY VERIFICATION</div>
        <h2>Password Reset Verification</h2>
        <p>We received a request to reset the password for your account (<strong>${toEmail}</strong>). Use the verification code below to complete your reset:</p>
        <div class="code-box">
          <div class="code">${code}</div>
        </div>
        <p>This verification code is valid for <strong>15 minutes</strong>. If you did not request this verification, please ignore this email.</p>
        <div class="footer">
          &copy; ${new Date().getFullYear()} BidVelocity Platform Engine. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"BidVelocity Security" <${user}>`,
      to: toEmail,
      subject: `BidVelocity - Password Reset Verification Code: ${code}`,
      html,
    });
    console.log(`[SMTP RELAY] Email dispatched to ${toEmail}: ${info.messageId}`);
    return res.status(200).json({ success: true, messageId: info.messageId });
  } catch (err) {
    console.error(`[SMTP RELAY ERROR] ${err.message}`);
    return res.status(500).json({ success: false, error: err.message });
  }
}
