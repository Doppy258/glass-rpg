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

const EMAIL_TO = 'lucaszhao09@gmail.com';

export default async function handler(req, res) {
  // Basic CORS/same-origin safety
  res.setHeader('Access-Control-Allow-Origin', '*');
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
      phone,
      grade,
      school,
      stateProvince,
      eventType,
      timePerWeek,
    } = body;

    const bad = (v) => !v || !String(v).trim();
    if ([name, role, email, phone, grade, school, stateProvince, eventType, timePerWeek].some(bad)) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const emailOk = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(email);
    if (!emailOk) {
      res.status(400).json({ error: 'Invalid email' });
      return;
    }
    const phoneDigits = String(phone).replace(/\D/g, '');
    if (phoneDigits.length !== 10) {
      res.status(400).json({ error: 'Invalid phone' });
      return;
    }

    const subject = 'Coaching Inquiry';
    const text = [
      `Name: ${name}`,
      `Parent/Student: ${role}`,
      `Email: ${email}`,
      `Phone: ${phoneDigits}`,
      `Grade: ${grade}`,
      `School: ${school}`,
      `State/Province: ${stateProvince}`,
      `Event Type: ${eventType}`,
      `Time per week: ${timePerWeek}`,
    ].join('\n');

    const user = process.env.gmail_user;
    const pass = process.env.gmail_pass;
    if (!user || !pass) {
      res.status(500).json({ error: 'Missing gmail_user/gmail_pass env vars' });
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

    const info = await transporter.sendMail({
      from: user, // must match authenticated Gmail account
      to: EMAIL_TO,
      subject,
      text,
      replyTo: email,
    });

    res.status(200).json({ ok: true, id: info && info.messageId });
  } catch (err) {
    console.error('send-email error:', err);
    res.status(500).json({ error: 'Server error', details: String((err && err.message) || err) });
  }
}


