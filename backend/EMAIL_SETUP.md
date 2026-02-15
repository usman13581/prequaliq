# Email Setup (Hostinger)

This guide explains how to configure email sending for PrequaliQ using your Hostinger email (domain purchased from GoDaddy, email hosted on Hostinger).

## Configuration

Add these variables to your `.env` file (copy from `.env.example`):

```env
# Email Configuration (Hostinger)
EMAIL_FROM=info@Prequaliq.com
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_USER=info@Prequaliq.com
SMTP_PASS=your_hostinger_email_password
```

## Hostinger SMTP Settings

- **SMTP Server:** smtp.hostinger.com
- **Port:** 465 (SSL) or 587 (TLS)
- **Username:** Your full email (e.g. info@Prequaliq.com)
- **Password:** Your Hostinger email account password

**Alternative (if smtp.hostinger.com fails):** Some Hostinger plans use Titan. Try:
- Host: `smtp.titan.email`
- Same port, username, and password

## Emails Sent Automatically

| Event | Supplier | Entity |
|-------|----------|--------|
| **Account created** | ✓ | ✓ |
| **Account activated** | ✓ | ✓ |
| **Account deactivated** | ✓ | ✓ |
| **Password reset by admin** | ✓ | ✓ |
| **Account deleted** | Template ready (hook when delete feature exists) | Template ready |

## Testing

If email is not configured (missing SMTP_PASS), the app will log "Email not configured" and skip sending. No errors will occur.

## Troubleshooting

- **Authentication failed:** Verify your Hostinger email password. Log in to webmail (hostinger.titan.email) to confirm credentials.
- **Connection timeout:** Try port 587 with `SMTP_PORT=587` if 465 is blocked.
- **Titan server:** If using Hostinger Professional Email, try `SMTP_HOST=smtp.titan.email`.
