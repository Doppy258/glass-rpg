// Vercel Serverless Function: Send email via Gmail SMTP using Nodemailer
// Required env vars in Vercel: gmail_user (full Gmail address), gmail_pass (App Password)

const nodemailer = require('nodemailer');

async function readBody(req) {
  const contentType = (req.headers['content-type'] || '').toLowerCase();
  // If already parsed by Vercel
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8') || '';
  if (contentType.includes('application/json')) {
    try { return JSON.parse(raw || '{}'); } catch { return {}; }
  }
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(raw);
    const obj = {};
    for (const [k, v] of params.entries()) obj[k] = v;
    return obj;
  }
  return {};
}

// Optional override: set EMAIL_TO to a comma-separated list in Vercel env vars.

export default async function handler(req, res) {
  // Basic CORS/same-origin safety
  res.setHeader('Access-Control-Allow-Origin', process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = await readBody(req);
    const {
      name,
      role,
      email,
      grade,
      region,
      eventCode,
      timePerWeek,
    } = body;

    const bad = (v) => !v || !String(v).trim();
    if ([name, role, email, grade, region, eventCode, timePerWeek].some(bad)) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }
    // Minimal email format validation (must contain @ and extension)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email))) {
      res.status(400).json({ error: 'Invalid email address' });
      return;
    }

    const subject = 'Coaching Inquiry';
    const text = [
      `Name: ${name}`,
      `Parent/Student: ${role}`,
      `Email: ${email}`,
      `Grade: ${grade}`,
      `Region: ${region}`,
      `Event Code: ${eventCode}`,
      `Time per week: ${timePerWeek}`,
    ].join('\n');

    const userCandidates = ['gmail_user','GMAIL_USER','SMTP_USER','EMAIL_USER'];
    const passCandidates = ['gmail_pass','GMAIL_PASS','SMTP_PASS','EMAIL_PASS'];
    const user = (process.env.gmail_user || process.env.GMAIL_USER || process.env.SMTP_USER || process.env.EMAIL_USER || '').trim();
    const pass = (process.env.gmail_pass || process.env.GMAIL_PASS || process.env.SMTP_PASS || process.env.EMAIL_PASS || '').trim();
    if (!user || !pass) {
      res.status(500).json({
        error: 'Missing gmail_user/gmail_pass env vars',
        checked: {
          user: Object.fromEntries(userCandidates.map(k => [k, Boolean(process.env[k])])),
          pass: Object.fromEntries(passCandidates.map(k => [k, Boolean(process.env[k])]))
        }
      });
      return;
    }

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
    });

    // Verify connection/auth first to surface clear errors
    await transporter.verify();

    const to = (process.env.EMAIL_TO || user).split(',').map(s => s.trim()).filter(Boolean);
    const info = await transporter.sendMail({
      from: user, // must match authenticated Gmail account
      to,
      subject,
      text,
    });

    res.status(200).json({ ok: true, id: info && info.messageId });
  } catch (err) {
    console.error('send-email error:', err);
    res.status(500).json({ error: 'Server error', details: String((err && err.message) || err) });
  }
}


