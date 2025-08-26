// Vercel Serverless Function: Send email via Gmail SMTP using Nodemailer
// Required env vars in Vercel: gmail_user (full Gmail address), gmail_pass (App Password)

const nodemailer = require('nodemailer');

const EMAIL_TO = 'lucaszhao09@gmail.com';

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
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

    await transporter.sendMail({
      from: user, // must match authenticated Gmail account
      to: EMAIL_TO,
      subject,
      text,
      replyTo: email,
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error', details: String(err && err.message || err) });
  }
};


