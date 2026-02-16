require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmailConnection() {
  console.log('Testing email configuration...');
  console.log('SMTP_HOST:', process.env.SMTP_HOST || 'not set');
  console.log('SMTP_PORT:', process.env.SMTP_PORT || 'not set');
  console.log('SMTP_USER:', process.env.SMTP_USER || 'not set');
  console.log('SMTP_PASS:', process.env.SMTP_PASS ? '***set***' : 'not set');
  console.log('EMAIL_FROM:', process.env.EMAIL_FROM || 'not set');
  console.log('');

  const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER || process.env.EMAIL_FROM;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.error('❌ Email not configured: SMTP_USER/SMTP_PASS missing');
    process.exit(1);
  }

  try {
    console.log('Creating transporter...');
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user,
        pass
      }
    });

    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');

    console.log('\nSending test email...');
    const testEmail = process.argv[2] || user; // Use provided email or SMTP_USER
    const info = await transporter.sendMail({
      from: `"PrequaliQ" <${process.env.EMAIL_FROM || user}>`,
      to: testEmail,
      subject: 'Test Email from PrequaliQ',
      html: '<h1>Test Email</h1><p>This is a test email from PrequaliQ. If you receive this, email configuration is working!</p>'
    });

    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Sent to:', testEmail);
    process.exit(0);
  } catch (error) {
    console.error('❌ Email test failed:');
    console.error('Error:', error.message);
    if (error.code) console.error('Error code:', error.code);
    if (error.response) console.error('SMTP response:', error.response);
    process.exit(1);
  }
}

testEmailConnection();
