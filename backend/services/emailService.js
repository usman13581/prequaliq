const nodemailer = require('nodemailer');

// Create transporter for Hostinger SMTP (info@Prequaliq.com)
const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10); // Default to 587 (TLS) instead of 465 (SSL)
  const user = process.env.SMTP_USER || process.env.EMAIL_FROM;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn('Email not configured: SMTP_USER/SMTP_PASS or EMAIL_FROM not set. Emails will not be sent.');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    requireTLS: port === 587, // Use STARTTLS for port 587
    auth: {
      user,
      pass
    },
    // Force IPv4 to avoid ENETUNREACH errors on Railway
    family: 4,
    // Additional options for better connectivity
    tls: {
      rejectUnauthorized: false // Allow self-signed certificates if needed
    }
  });
};

const transporter = createTransporter();
const FROM = process.env.EMAIL_FROM || 'info@Prequaliq.com';
const APP_NAME = process.env.APP_NAME || 'PrequaliQ';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * Shared email layout – header, content area, footer
 */
const emailLayout = (content, options = {}) => {
  const { titleColor = '#1e3a8a', showLoginButton = false, buttonText = 'Log in to ' + APP_NAME, buttonHref = FRONTEND_URL } = options;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${APP_NAME}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6; padding: 24px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 28px 32px; text-align: center;">
              <div style="display: inline-block; background: rgba(255,255,255,0.2); border-radius: 10px; padding: 10px 16px; margin-bottom: 8px;">
                <span style="font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px;">${APP_NAME}</span>
              </div>
              <p style="margin: 0; font-size: 13px; color: rgba(255,255,255,0.9);">Supplier Qualification & Procurement Platform</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px 36px; color: #374151; font-size: 15px; line-height: 1.6;">
              ${content}
              ${showLoginButton ? `
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin-top: 28px;">
                <tr>
                  <td>
                    <a href="${buttonHref}" style="display: inline-block; background: ${titleColor}; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">${buttonText}</a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 36px; background: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">This is an automated message from ${APP_NAME}. Please do not reply to this email.</p>
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #9ca3af;">&copy; ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Email templates
 */
const templates = {
  accountCreated: ({ recipientName, role, email }) => ({
    subject: `Your ${APP_NAME} account has been created`,
    html: emailLayout(`
      <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #1e3a8a;">Welcome to ${APP_NAME}!</h2>
      <p style="margin: 0 0 16px 0;">Dear ${recipientName},</p>
      <p style="margin: 0 0 20px 0;">Your <strong>${role === 'Supplier' ? 'Supplier' : 'Procuring Entity'}</strong> account has been successfully created by an administrator.</p>
      <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-weight: 600; color: #1e40af;">Login details</p>
        <p style="margin: 0;"><strong>Email:</strong> ${email}</p>
        <p style="margin: 8px 0 0 0;">Use the password provided by the administrator, or set a new one after first login.</p>
      </div>
    `, { showLoginButton: true, titleColor: '#1e3a8a' })
  }),

  accountActivated: ({ recipientName, role }) => ({
    subject: `Your ${APP_NAME} account has been activated`,
    html: emailLayout(`
      <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #047857;">Account activated</h2>
      <p style="margin: 0 0 16px 0;">Dear ${recipientName},</p>
      <p style="margin: 0 0 20px 0;">Your <strong>${role === 'Supplier' ? 'Supplier' : 'Procuring Entity'}</strong> account has been activated. You can now log in and access all features.</p>
    `, { showLoginButton: true, titleColor: '#047857' })
  }),

  accountDeactivated: ({ recipientName, role }) => ({
    subject: `Your ${APP_NAME} account has been deactivated`,
    html: emailLayout(`
      <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #b91c1c;">Account deactivated</h2>
      <p style="margin: 0 0 16px 0;">Dear ${recipientName},</p>
      <p style="margin: 0 0 20px 0;">Your <strong>${role === 'Supplier' ? 'Supplier' : 'Procuring Entity'}</strong> account has been deactivated by an administrator. You will not be able to log in until your account is reactivated.</p>
      <p style="margin: 0; color: #6b7280;">If you believe this was done in error, please contact your administrator.</p>
    `, { showLoginButton: false })
  }),

  accountLocked: ({ recipientName, role }) => ({
    subject: `Your ${APP_NAME} account has been locked`,
    html: emailLayout(`
      <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #b91c1c;">Account locked</h2>
      <p style="margin: 0 0 16px 0;">Dear ${recipientName},</p>
      <p style="margin: 0 0 20px 0;">Your <strong>${role === 'Supplier' ? 'Supplier' : 'Procuring Entity'}</strong> account has been locked by an administrator. You will not be able to log in until your account is unlocked.</p>
      <p style="margin: 0; color: #6b7280;">If you believe this was done in error, please contact your administrator.</p>
    `, { showLoginButton: false })
  }),

  passwordReset: ({ recipientName, role }) => ({
    subject: `Your ${APP_NAME} password has been reset`,
    html: emailLayout(`
      <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #1e3a8a;">Password reset by administrator</h2>
      <p style="margin: 0 0 16px 0;">Dear ${recipientName},</p>
      <p style="margin: 0 0 20px 0;">The password for your <strong>${role === 'Supplier' ? 'Supplier' : 'Procuring Entity'}</strong> account has been reset by an administrator.</p>
      <p style="margin: 0 0 20px 0;">Please use the new password provided to you by the administrator. We recommend changing it after your next login from your profile settings.</p>
    `, { showLoginButton: true, titleColor: '#1e3a8a' })
  }),

  accountDeleted: ({ recipientName, role }) => ({
    subject: `Your ${APP_NAME} account has been removed`,
    html: emailLayout(`
      <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #b91c1c;">Account removed</h2>
      <p style="margin: 0 0 16px 0;">Dear ${recipientName},</p>
      <p style="margin: 0 0 20px 0;">Your <strong>${role === 'Supplier' ? 'Supplier' : 'Procuring Entity'}</strong> account has been permanently removed by an administrator.</p>
      <p style="margin: 0; color: #6b7280;">If you have questions, please contact your administrator.</p>
    `, { showLoginButton: false })
  }),

  supplierApproved: ({ recipientName, email }) => ({
    subject: `Your ${APP_NAME} supplier account has been approved`,
    html: emailLayout(`
      <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #047857;">Supplier account approved</h2>
      <p style="margin: 0 0 16px 0;">Dear ${recipientName},</p>
      <p style="margin: 0 0 20px 0;">Your <strong>Supplier</strong> account has been approved by an administrator. You can now log in and access the supplier portal.</p>
      <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
        <p style="margin: 0;"><strong>Email:</strong> ${email}</p>
      </div>
    `, { showLoginButton: true, titleColor: '#047857' })
  }),

  supplierRejected: ({ recipientName, reason }) => ({
    subject: `Update on your ${APP_NAME} supplier account`,
    html: emailLayout(`
      <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #b91c1c;">Supplier account not approved</h2>
      <p style="margin: 0 0 16px 0;">Dear ${recipientName},</p>
      <p style="margin: 0 0 20px 0;">After review, your <strong>Supplier</strong> account has not been approved at this time.</p>
      ${reason ? `<div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;"><p style="margin: 0;"><strong>Reason:</strong> ${reason}</p></div>` : ''}
      <p style="margin: 0; color: #6b7280;">If you have questions, please contact your administrator.</p>
    `, { showLoginButton: false })
  })
};

/**
 * Send email
 */
const sendEmail = async (to, subject, html) => {
  if (!transporter) {
    console.log('[Email] Skipped (not configured):', { to, subject: subject?.substring(0, 50) });
    return { skipped: true, reason: 'Email not configured' };
  }

  try {
    const info = await transporter.sendMail({
      from: `"${APP_NAME}" <${FROM}>`,
      to,
      subject,
      html
    });
    console.log('[Email] Sent:', { to, subject: subject?.substring(0, 40), messageId: info.messageId });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[Email] Failed:', { to, error: error.message });
    return { success: false, error: error.message };
  }
};

/**
 * Send account created email (when admin creates supplier/entity)
 */
const sendAccountCreatedEmail = async (email, firstName, lastName, role) => {
  const recipientName = `${firstName || ''} ${lastName || ''}`.trim() || 'User';
  const roleLabel = role === 'supplier' ? 'Supplier' : 'Procuring Entity';
  const { subject, html } = templates.accountCreated({
    recipientName,
    role: roleLabel,
    email
  });
  return sendEmail(email, subject, html);
};

/**
 * Send account activated email
 */
const sendAccountActivatedEmail = async (email, firstName, lastName, role) => {
  const recipientName = `${firstName || ''} ${lastName || ''}`.trim() || 'User';
  const roleLabel = role === 'supplier' ? 'Supplier' : 'Procuring Entity';
  const { subject, html } = templates.accountActivated({ recipientName, role: roleLabel });
  return sendEmail(email, subject, html);
};

/**
 * Send account deactivated email
 */
const sendAccountDeactivatedEmail = async (email, firstName, lastName, role) => {
  const recipientName = `${firstName || ''} ${lastName || ''}`.trim() || 'User';
  const roleLabel = role === 'supplier' ? 'Supplier' : 'Procuring Entity';
  const { subject, html } = templates.accountDeactivated({ recipientName, role: roleLabel });
  return sendEmail(email, subject, html);
};

/**
 * Send account locked email
 */
const sendAccountLockedEmail = async (email, firstName, lastName, role) => {
  const recipientName = `${firstName || ''} ${lastName || ''}`.trim() || 'User';
  const roleLabel = role === 'supplier' ? 'Supplier' : 'Procuring Entity';
  const { subject, html } = templates.accountLocked({ recipientName, role: roleLabel });
  return sendEmail(email, subject, html);
};

/**
 * Send password reset by admin email
 */
const sendPasswordResetByAdminEmail = async (email, firstName, lastName, role) => {
  const recipientName = `${firstName || ''} ${lastName || ''}`.trim() || 'User';
  const roleLabel = role === 'supplier' ? 'Supplier' : 'Procuring Entity';
  const { subject, html } = templates.passwordReset({ recipientName, role: roleLabel });
  return sendEmail(email, subject, html);
};

/**
 * Send account deleted email (when admin deletes account)
 */
const sendAccountDeletedEmail = async (email, firstName, lastName, role) => {
  const recipientName = `${firstName || ''} ${lastName || ''}`.trim() || 'User';
  const roleLabel = role === 'supplier' ? 'Supplier' : 'Procuring Entity';
  const { subject, html } = templates.accountDeleted({ recipientName, role: roleLabel });
  return sendEmail(email, subject, html);
};

/**
 * Send supplier approved email
 */
const sendSupplierApprovedEmail = async (email, firstName, lastName) => {
  const recipientName = `${firstName || ''} ${lastName || ''}`.trim() || 'User';
  const { subject, html } = templates.supplierApproved({ recipientName, email });
  return sendEmail(email, subject, html);
};

/**
 * Send supplier rejected email
 */
const sendSupplierRejectedEmail = async (email, firstName, lastName, reason) => {
  const recipientName = `${firstName || ''} ${lastName || ''}`.trim() || 'User';
  const { subject, html } = templates.supplierRejected({ recipientName, reason: reason || '' });
  return sendEmail(email, subject, html);
};

module.exports = {
  sendEmail,
  sendAccountCreatedEmail,
  sendAccountActivatedEmail,
  sendAccountDeactivatedEmail,
  sendAccountLockedEmail,
  sendPasswordResetByAdminEmail,
  sendAccountDeletedEmail,
  sendSupplierApprovedEmail,
  sendSupplierRejectedEmail
};
