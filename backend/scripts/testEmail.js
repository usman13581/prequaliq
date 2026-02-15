/**
 * Email test script - run: node scripts/testEmail.js
 * Sends a test email to verify SMTP configuration
 */
require('dotenv').config();
const nodemailer = require('nodemailer');

const TO_EMAIL = process.argv[2] || process.env.SMTP_USER || 'info@Prequaliq.com';

async function testEmail() {
  console.log('=== PrequaliQ Email Test ===\n');
  console.log('Config:', {
    host: process.env.SMTP_HOST || 'smtp.hostinger.com',
    port: process.env.SMTP_PORT || 465,
    user: process.env.SMTP_USER || process.env.EMAIL_FROM,
    hasPassword: !!process.env.SMTP_PASS,
    to: TO_EMAIL
  });
  console.log('');

  if (!process.env.SMTP_PASS) {
    console.error('ERROR: SMTP_PASS is not set in .env. Add your email password.');
    process.exit(1);
  }

  const hostsToTry = [
    process.env.SMTP_HOST || 'smtp.hostinger.com',
    'smtp.titan.email'
  ];

  for (const host of hostsToTry) {
    console.log(`Trying ${host}...`);
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || '465', 10),
      secure: true,
      auth: {
        user: process.env.SMTP_USER || process.env.EMAIL_FROM,
        pass: process.env.SMTP_PASS
      },
      debug: true
    });

    try {
      await transporter.verify();
      console.log(`  ✓ Connection to ${host} successful!\n`);

      const info = await transporter.sendMail({
        from: `"PrequaliQ Test" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
        to: TO_EMAIL,
        subject: 'PrequaliQ - Email Test Successful',
        html: '<p>If you received this, your email configuration is working correctly.</p>'
      });

      console.log('Email sent successfully!');
      console.log('Message ID:', info.messageId);
      console.log('\nCheck your inbox (and spam folder) at:', TO_EMAIL);
      process.exit(0);
    } catch (err) {
      console.log(`  ✗ Failed: ${err.message}\n`);
      if (err.response) {
        console.log('  Server response:', err.response);
      }
    }
  }

  console.error('All SMTP servers failed. Try:');
  console.error('1. Use smtp.titan.email - set SMTP_HOST=smtp.titan.email in .env');
  console.error('2. Try port 587 - set SMTP_PORT=587 in .env');
  console.error('3. Verify your password in Hostinger hPanel > Emails');
  process.exit(1);
}

testEmail();
