const nodemailer = require('nodemailer');
const { Resend } = require('resend');

// Create transporter for Hostinger SMTP (info@Prequaliq.com)
const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.hostinger.com';
  const port = parseInt(process.env.SMTP_PORT || '465', 10); // Default to 465 (SSL) for Hostinger
  const user = process.env.SMTP_USER || process.env.EMAIL_FROM;
  const pass = process.env.SMTP_PASS;

  console.log('[Email Service] SMTP Configuration:', {
    host,
    port,
    user: user ? `${user.substring(0, 3)}***` : 'not set',
    hasPassword: !!pass
  });

  if (!user || !pass) {
    console.warn('[Email Service] Email not configured: SMTP_USER/SMTP_PASS or EMAIL_FROM not set. Emails will not be sent.');
    return null;
  }

  const transporterConfig = {
    host,
    port,
    secure: port === 465, // true for 465 (SSL), false for other ports
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
  };

  console.log('[Email Service] Creating SMTP transporter with config:', {
    ...transporterConfig,
    auth: { user: transporterConfig.auth.user, pass: '***hidden***' }
  });

  return nodemailer.createTransport(transporterConfig);
};

const transporter = createTransporter();
// Initialize Resend if API key is available (works better on Railway)
// Only use Resend if explicitly configured, otherwise use SMTP
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM = process.env.EMAIL_FROM || 'info@Prequaliq.com';
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || FROM; // Use verified domain email for Resend

// Log email configuration status
console.log('[Email Service] Configuration:', {
  hasResend: !!resend,
  hasTransporter: !!transporter,
  smtpHost: process.env.SMTP_HOST || 'smtp.hostinger.com',
  smtpPort: process.env.SMTP_PORT || '587',
  emailFrom: FROM,
  resendFrom: RESEND_FROM
});
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

  passwordResetLink: ({ recipientName, resetUrl }) => ({
    subject: `Reset your ${APP_NAME} password`,
    html: emailLayout(`
      <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #1e3a8a;">Reset your password</h2>
      <p style="margin: 0 0 16px 0;">Dear ${recipientName},</p>
      <p style="margin: 0 0 20px 0;">We received a request to reset your password. Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.</p>
      <p style="margin: 0 0 20px 0; color: #6b7280; font-size: 14px;">If you did not request this, you can ignore this email — your password will stay the same.</p>
    `, {
      showLoginButton: true,
      buttonText: 'Reset password',
      buttonHref: resetUrl,
      titleColor: '#1e3a8a'
    })
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
  }),

  supplierProfileSubmittedForApproval: ({ recipientName, companyName, supplierEmail }) => ({
    subject: `Supplier profile update pending approval: ${companyName}`,
    html: emailLayout(`
      <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #d97706;">Supplier profile update pending approval</h2>
      <p style="margin: 0 0 16px 0;">Dear ${recipientName},</p>
      <p style="margin: 0 0 20px 0;">Supplier <strong>${companyName}</strong> (${supplierEmail}) has updated their profile. The supplier account is now pending approval. Please review and approve the supplier to restore their access.</p>
    `, { showLoginButton: true, buttonText: 'Review suppliers', buttonHref: `${FRONTEND_URL}/admin`, titleColor: '#d97706' })
  }),

  supplierProfileSubmittedConfirmation: ({ recipientName, companyName }) => ({
    subject: `Your profile has been submitted for approval`,
    html: emailLayout(`
      <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #1e3a8a;">Profile submitted for approval</h2>
      <p style="margin: 0 0 16px 0;">Dear ${recipientName},</p>
      <p style="margin: 0 0 20px 0;">Your profile changes for <strong>${companyName}</strong> have been saved and submitted for approval.</p>
      <p style="margin: 0 0 20px 0;">Your account is now in pending status. You will not be able to respond to questionnaires or access other supplier activities until an administrator approves your updated profile.</p>
      <p style="margin: 0; color: #6b7280;">You will receive an email once your profile has been approved.</p>
    `, { showLoginButton: true, titleColor: '#1e3a8a' })
  }),

  newQuestionnaire: ({ recipientName, questionnaireTitle, questionnaireDescription, deadline, cpvCode, entityName, questionnaireUrl }) => ({
    subject: `New questionnaire available: ${questionnaireTitle}`,
    html: emailLayout(`
      <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #1e3a8a;">New questionnaire available</h2>
      <p style="margin: 0 0 16px 0;">Dear ${recipientName},</p>
      <p style="margin: 0 0 20px 0;">A new questionnaire matching your CPV codes has been created and is now available for you to respond to.</p>
      <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
        <p style="margin: 0 0 8px 0; font-weight: 600; color: #1e40af;">Questionnaire details</p>
        <p style="margin: 0;"><strong>Title:</strong> ${questionnaireTitle}</p>
        ${questionnaireDescription ? `<p style="margin: 8px 0 0 0;"><strong>Description:</strong> ${questionnaireDescription}</p>` : ''}
        <p style="margin: 8px 0 0 0;"><strong>CPV Code:</strong> ${cpvCode}</p>
        <p style="margin: 8px 0 0 0;"><strong>Deadline:</strong> ${deadline}</p>
        ${entityName ? `<p style="margin: 8px 0 0 0;"><strong>Procuring Entity:</strong> ${entityName}</p>` : ''}
      </div>
      <p style="margin: 20px 0 0 0;">Please log in to your supplier portal to view and respond to this questionnaire.</p>
    `, { showLoginButton: true, buttonText: 'View Questionnaire', buttonHref: questionnaireUrl || FRONTEND_URL, titleColor: '#1e3a8a' })
  })
};

/**
 * Send email - uses Resend API if available (better for Railway), otherwise falls back to SMTP
 */
const sendEmail = async (to, subject, html) => {
  console.log('[Email] Attempting to send email:', { to, subject: subject?.substring(0, 50), hasResend: !!resend, hasTransporter: !!transporter });
  
  // Try Resend API first (works better on Railway)
  if (resend) {
    try {
      console.log('[Email] Trying Resend API...');
      const { data, error } = await resend.emails.send({
        from: RESEND_FROM,
        to,
        subject,
        html
      });
      
      if (error) {
        console.error('[Email] Resend failed:', { to, error: error.message, errorDetails: error });
        // Fall through to SMTP fallback
      } else {
        console.log('[Email] ✓ Sent via Resend:', { to, subject: subject?.substring(0, 40), messageId: data?.id });
        return { success: true, messageId: data?.id, method: 'resend' };
      }
    } catch (error) {
      console.error('[Email] Resend exception:', { to, error: error.message, errorStack: error.stack });
      // Fall through to SMTP fallback
    }
  } else {
    console.log('[Email] Resend not available (RESEND_API_KEY not set), using SMTP fallback');
  }

  // Fallback to SMTP (for local/dev or if Resend fails)
  if (!transporter) {
    console.error('[Email] ✗ Skipped - SMTP not configured:', { 
      to, 
      subject: subject?.substring(0, 50),
      reason: 'SMTP_USER/SMTP_PASS or EMAIL_FROM not set',
      smtpUser: process.env.SMTP_USER || 'not set',
      smtpPass: process.env.SMTP_PASS ? 'set' : 'not set',
      emailFrom: process.env.EMAIL_FROM || 'not set'
    });
    return { skipped: true, reason: 'Email not configured - SMTP credentials missing' };
  }

  try {
    console.log('[Email] Trying SMTP...', { 
      host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      port: process.env.SMTP_PORT || '587',
      from: FROM
    });
    const info = await transporter.sendMail({
      from: `"${APP_NAME}" <${FROM}>`,
      to,
      subject,
      html
    });
    console.log('[Email] ✓ Sent via SMTP:', { to, subject: subject?.substring(0, 40), messageId: info.messageId });
    return { success: true, messageId: info.messageId, method: 'smtp' };
  } catch (error) {
    console.error('[Email] ✗ SMTP failed:', { 
      to, 
      error: error.message,
      errorCode: error.code,
      errorStack: error.stack?.substring(0, 200)
    });
    return { success: false, error: error.message, method: 'smtp' };
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

const sendPasswordResetLinkEmail = async (email, firstName, lastName, resetUrl) => {
  const recipientName = `${firstName || ''} ${lastName || ''}`.trim() || 'User';
  const { subject, html } = templates.passwordResetLink({ recipientName, resetUrl });
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

/**
 * Send supplier profile submitted for approval email (to admin)
 */
const sendSupplierProfileSubmittedToAdminEmail = async (adminEmail, adminName, companyName, supplierEmail) => {
  const recipientName = adminName || 'Administrator';
  const { subject, html } = templates.supplierProfileSubmittedForApproval({
    recipientName,
    companyName,
    supplierEmail
  });
  return sendEmail(adminEmail, subject, html);
};

/**
 * Send supplier profile submitted confirmation email (to supplier)
 */
const sendSupplierProfileSubmittedConfirmationEmail = async (email, firstName, lastName, companyName) => {
  const recipientName = `${firstName || ''} ${lastName || ''}`.trim() || 'User';
  const { subject, html } = templates.supplierProfileSubmittedConfirmation({
    recipientName,
    companyName
  });
  return sendEmail(email, subject, html);
};

/**
 * Send new questionnaire notification email to suppliers
 */
const sendNewQuestionnaireEmail = async (email, firstName, lastName, questionnaireTitle, questionnaireDescription, deadline, cpvCode, entityName, questionnaireId) => {
  const recipientName = `${firstName || ''} ${lastName || ''}`.trim() || 'User';
  const questionnaireUrl = `${FRONTEND_URL}/supplier/questionnaires`;
  const deadlineFormatted = deadline ? new Date(deadline).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }) : 'Not specified';
  
  const { subject, html } = templates.newQuestionnaire({
    recipientName,
    questionnaireTitle,
    questionnaireDescription: questionnaireDescription || '',
    deadline: deadlineFormatted,
    cpvCode: cpvCode || 'N/A',
    entityName: entityName || '',
    questionnaireUrl
  });
  return sendEmail(email, subject, html);
};

/* ------------------------------------------------------------------ */
/* Procurement notices: one consistent, informative layout              */
/* ------------------------------------------------------------------ */

const esc = (v) =>
  String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** 2026-12-07 or a Date -> "7 December 2026". Date-only values are not shifted by time zone. */
const fmtDate = (v) => {
  if (!v) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? new Date(`${v}T12:00:00Z`) : new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
};
const fmtDateTime = (v) => {
  const d = v ? new Date(v) : new Date();
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;
};

const TONES = {
  blue: { title: '#1e3a8a', bg: '#eff6ff', border: '#3b82f6' },
  green: { title: '#166534', bg: '#f0fdf4', border: '#22c55e' },
  amber: { title: '#92400e', bg: '#fffbeb', border: '#f59e0b' },
  red: { title: '#991b1b', bg: '#fef2f2', border: '#ef4444' }
};

/**
 * Builds a notice email: greeting, what happened, a table of facts, an optional quoted
 * message, what to do next, and one button into the app. Every value is escaped.
 *
 * @param {object} o
 * @param {string} [o.name] recipient first name
 * @param {string} o.heading one-line statement of what happened
 * @param {string} o.intro one or two sentences of context
 * @param {Array<[string, any]>} [o.facts] label/value rows; empty values are left out
 * @param {{label: string, text: string}} [o.quote] text written by the other party
 * @param {string[]} [o.steps] what the recipient should do next
 * @param {string} [o.where] where in the app to find it, e.g. "Tenders"
 * @param {string} [o.buttonText]
 * @param {string} [o.tone] blue | green | amber | red
 */
const noticeEmail = ({ name, heading, intro, facts = [], quote, steps = [], where, buttonText, tone = 'blue' }) => {
  const c = TONES[tone] || TONES.blue;
  const rows = facts
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== '')
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; width: 38%; vertical-align: top;">${esc(label)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 600; vertical-align: top;">${esc(value)}</td>
        </tr>`
    )
    .join('');
  const content = `
      <h2 style="margin: 0 0 16px 0; font-size: 20px; line-height: 1.3; color: ${c.title};">${esc(heading)}</h2>
      <p style="margin: 0 0 12px 0;">Hello ${esc(name || 'there')},</p>
      <p style="margin: 0 0 20px 0;">${esc(intro)}</p>
      ${rows ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid #e5e7eb; border-radius: 8px; border-collapse: separate; overflow: hidden; margin: 0 0 20px 0;">${rows}</table>` : ''}
      ${quote && quote.text ? `
      <div style="background: ${c.bg}; border-left: 4px solid ${c.border}; padding: 12px 16px; border-radius: 0 8px 8px 0; margin: 0 0 20px 0;">
        <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 600; color: ${c.title}; text-transform: uppercase; letter-spacing: 0.4px;">${esc(quote.label)}</p>
        <p style="margin: 0; white-space: pre-wrap; color: #111827;">${esc(String(quote.text).slice(0, 1200))}</p>
      </div>` : ''}
      ${steps.length ? `
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #111827;">What to do next</p>
      <ol style="margin: 0 0 4px 0; padding-left: 20px;">${steps.map((st) => `<li style="margin: 0 0 6px 0;">${esc(st)}</li>`).join('')}</ol>` : ''}
      ${where ? `<p style="margin: 16px 0 0 0; font-size: 13px; color: #6b7280;">Where to find it: sign in to ${esc(APP_NAME)} and open <strong>${esc(where)}</strong>.</p>` : ''}`;
  return emailLayout(content, {
    titleColor: c.title,
    showLoginButton: true,
    buttonText: buttonText || `Open ${APP_NAME}`,
    buttonHref: FRONTEND_URL
  });
};

const PROCEDURE_TYPE_LABEL = {
  open: 'Open procedure', restricted: 'Restricted procedure', negotiated: 'Negotiated procedure',
  direct: 'Direct award', framework: 'Framework agreement', dis: 'Dynamic purchasing system', other: 'Other'
};

/** Plain HTML fragments from older callers are wrapped in the standard layout. */
const sendSimpleHtmlEmail = async (email, subject, htmlBody) => {
  const html = /<html[\s>]/i.test(String(htmlBody)) ? htmlBody : emailLayout(htmlBody, { showLoginButton: true });
  return sendEmail(email, subject, html);
};

/** details: { buyerName, procedureType, qaDeadline, bidDeadline, description } */
const sendTenderInviteEmail = async (email, firstName, procedureTitle, referenceNumber, details = {}) => {
  const subject = `Invitation to tender: ${procedureTitle}${referenceNumber ? ` (${referenceNumber})` : ''}`;
  const html = noticeEmail({
    name: firstName,
    heading: 'You are invited to submit a bid',
    intro: `${details.buyerName || 'A contracting authority'} has published a procurement and invited your company to take part.`,
    facts: [
      ['Procurement', procedureTitle],
      ['Reference', referenceNumber],
      ['Buyer', details.buyerName],
      ['Procedure type', PROCEDURE_TYPE_LABEL[details.procedureType] || null],
      ['Questions to the buyer until', fmtDate(details.qaDeadline)],
      ['Bids must be submitted before', fmtDate(details.bidDeadline)]
    ],
    quote: details.description ? { label: 'About the procurement', text: details.description } : null,
    steps: [
      'Open the tender and read the documentation.',
      'Send any questions to the buyer through the private chat before the question deadline.',
      'Submit the ESPD declaration, answer the questions, attach the requested documents and press Submit.'
    ],
    where: 'Tenders',
    buttonText: 'Open the tender'
  });
  return sendEmail(email, subject, html);
};

/** details: { buyerName, reference, winnerName } */
const sendAwardDecisionEmail = async (email, firstName, procedureTitle, isWinner, standstillEndsAt, details = {}) => {
  const subject = isWinner
    ? `Award decision: your company is the intended winner of ${procedureTitle}`
    : `Award decision: ${procedureTitle}`;
  const html = noticeEmail({
    name: firstName,
    tone: isWinner ? 'green' : 'blue',
    heading: isWinner ? 'Your company is the intended winner' : 'An award decision has been made',
    intro: isWinner
      ? `${details.buyerName || 'The buyer'} intends to award this contract to your company.`
      : `${details.buyerName || 'The buyer'} has decided to award this contract to another supplier. Thank you for your bid.`,
    facts: [
      ['Procurement', procedureTitle],
      ['Reference', details.reference],
      ['Buyer', details.buyerName],
      ['Awarded to', isWinner ? 'Your company' : details.winnerName],
      ['Standstill period ends', fmtDate(standstillEndsAt)]
    ],
    steps: isWinner
      ? [
          'A contract has been created and is waiting for you under Contracts.',
          'Use the contract messages to agree the remaining details with the buyer.'
        ]
      : ['You can read the decision on the tender. The procurement is listed under History once it is closed.'],
    where: isWinner ? 'Contracts' : 'History',
    buttonText: isWinner ? 'Open the contract' : 'View the decision'
  });
  return sendEmail(email, subject, html);
};

/** details: { buyerName, reference, message } */
const sendComplementRequestEmail = async (email, firstName, procedureTitle, deadline, details = {}) => {
  const subject = `Complement requested for your bid: ${procedureTitle}`;
  const html = noticeEmail({
    name: firstName,
    tone: 'amber',
    heading: 'The buyer asks you to complement your bid',
    intro: `${details.buyerName || 'The buyer'} needs a clarification or an additional document before your bid can be evaluated further.`,
    facts: [
      ['Procurement', procedureTitle],
      ['Reference', details.reference],
      ['Buyer', details.buyerName],
      ['Reply no later than', fmtDate(deadline)]
    ],
    quote: details.message ? { label: 'The buyer wrote', text: details.message } : null,
    steps: [
      'Open the tender and go to Complement requests.',
      'Write your reply, attach any documents and press Submit complement.'
    ],
    where: 'Tenders',
    buttonText: 'Reply to the request'
  });
  return sendEmail(email, subject, html);
};

/** To the buyer when a supplier submits a bid. info: { supplierName, procedureTitle, reference, submittedAt, bidDeadline, bidCount } */
const sendBidReceivedEmail = async (email, firstName, info = {}) => {
  const subject = `New bid received: ${info.procedureTitle}${info.reference ? ` (${info.reference})` : ''}`;
  const html = noticeEmail({
    name: firstName,
    heading: 'A new bid has been submitted',
    intro: `${info.supplierName || 'A supplier'} has submitted a bid. The content stays sealed until the bid deadline has passed.`,
    facts: [
      ['Procurement', info.procedureTitle],
      ['Reference', info.reference],
      ['Supplier', info.supplierName],
      ['Submitted', fmtDateTime(info.submittedAt)],
      ['Bids received so far', info.bidCount],
      ['Bid deadline', fmtDate(info.bidDeadline)]
    ],
    steps: [
      'No action is needed now.',
      'After the bid deadline, open the procedure, press Unseal bids and evaluate the answers.'
    ],
    where: 'Procedures',
    buttonText: 'Open the procedure'
  });
  return sendEmail(email, subject, html);
};

/** Receipt to the supplier who submitted the bid. info: { companyName, buyerName, procedureTitle, reference, submittedAt, bidDeadline, answerCount, attachmentCount } */
const sendBidConfirmationEmail = async (email, firstName, info = {}) => {
  const subject = `Bid submitted: ${info.procedureTitle}${info.reference ? ` (${info.reference})` : ''}`;
  const html = noticeEmail({
    name: firstName,
    tone: 'green',
    heading: 'Your bid has been submitted',
    intro: 'This is your receipt. The bid is locked and can no longer be changed. The buyer cannot open it until the bid deadline has passed.',
    facts: [
      ['Procurement', info.procedureTitle],
      ['Reference', info.reference],
      ['Buyer', info.buyerName],
      ['Submitted by', info.companyName],
      ['Submitted', fmtDateTime(info.submittedAt)],
      ['Answers', info.answerCount],
      ['Attached documents', info.attachmentCount],
      ['Bid deadline', fmtDate(info.bidDeadline)]
    ],
    steps: [
      'Keep this email as proof of submission.',
      'You will be notified if the buyer asks for a complement and when the award decision is made.'
    ],
    where: 'Tenders',
    buttonText: 'View your bid'
  });
  return sendEmail(email, subject, html);
};

/** Contract activity for either side. info: { contractTitle, contractNumber, counterpart, counterpartLabel, summary, message, reason } */
const sendContractActivityEmail = async (email, firstName, info = {}) => {
  const subject = `Contract update: ${info.contractTitle}${info.contractNumber ? ` (${info.contractNumber})` : ''}`;
  const html = noticeEmail({
    name: firstName,
    tone: info.reason ? 'red' : 'blue',
    heading: info.summary || 'There is an update on your contract',
    intro: `There is new activity on a contract with ${info.counterpart || 'the other party'}.`,
    facts: [
      ['Contract', info.contractTitle],
      ['Contract number', info.contractNumber],
      [info.counterpartLabel || 'Other party', info.counterpart],
      ['What happened', info.summary],
      ['When', fmtDateTime()]
    ],
    quote: info.reason
      ? { label: 'Reason given', text: info.reason }
      : info.message
        ? { label: 'Message', text: info.message }
        : null,
    steps: ['Open the contract to read the full thread, view attached files and reply.'],
    where: 'Contracts',
    buttonText: 'Open the contract'
  });
  return sendEmail(email, subject, html);
};

const sendOrgInviteEmail = async (email, orgName, acceptUrl) => {
  const subject = `Invitation to join ${orgName} on ${APP_NAME}`;
  const html = emailLayout(
    `
      <h2 style="margin: 0 0 16px 0; font-size: 20px; color: #1e3a8a;">You are invited to join ${esc(orgName)}</h2>
      <p style="margin: 0 0 12px 0;">Hello,</p>
      <p style="margin: 0 0 16px 0;"><strong>${esc(orgName)}</strong> has invited you to work with them on ${esc(APP_NAME)}.</p>
      <ol style="margin: 0 0 4px 0; padding-left: 20px;">
        <li style="margin: 0 0 6px 0;">If you do not have an account yet, register with this email address first.</li>
        <li style="margin: 0 0 6px 0;">Then press the button below to accept the invitation.</li>
      </ol>`,
    { showLoginButton: true, buttonText: 'Accept invitation', buttonHref: acceptUrl }
  );
  return sendEmail(email, subject, html);
};

const sendDocumentExpiringEmail = async (email, firstName, count) => {
  const subject = `Profile documents expiring soon: ${count}`;
  const html = noticeEmail({
    name: firstName,
    tone: 'amber',
    heading: 'Some of your profile documents expire soon',
    intro: 'Documents in your supplier profile will expire within 30 days. An expired document can put your qualification on hold.',
    facts: [['Documents expiring within 30 days', count]],
    steps: [
      'Open your profile and press Edit profile.',
      'Upload the renewed document under the question it belongs to and set its new expiry date.'
    ],
    where: 'Profile',
    buttonText: 'Open your profile'
  });
  return sendEmail(email, subject, html);
};

module.exports = {
  sendEmail,
  sendSimpleHtmlEmail,
  sendBidReceivedEmail,
  sendBidConfirmationEmail,
  sendContractActivityEmail,
  noticeEmail,
  sendAccountCreatedEmail,
  sendAccountActivatedEmail,
  sendAccountDeactivatedEmail,
  sendAccountLockedEmail,
  sendPasswordResetByAdminEmail,
  sendPasswordResetLinkEmail,
  sendAccountDeletedEmail,
  sendSupplierApprovedEmail,
  sendSupplierRejectedEmail,
  sendSupplierProfileSubmittedToAdminEmail,
  sendSupplierProfileSubmittedConfirmationEmail,
  sendNewQuestionnaireEmail,
  sendTenderInviteEmail,
  sendAwardDecisionEmail,
  sendComplementRequestEmail,
  sendOrgInviteEmail,
  sendDocumentExpiringEmail
};
