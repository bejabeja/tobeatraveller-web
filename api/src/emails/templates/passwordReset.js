import config from '../../config/config.js';
import { layout } from '../layout.js';

const BRAND = '#0077b6';
const MUTED = '#6b7280';

export const passwordResetTemplate = ({ username, token }) => ({
    subject: 'Reset your password',
    html: layout({
        title: 'Reset your password',
        preheader: 'Reset your ToBeATraveller password',
        content: `
          <!-- Headline -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;">
            <tr>
              <td>
                <h1 style="margin:0 0 10px;font-size:26px;font-weight:800;color:#111827;line-height:1.2;">
                  Reset your password
                </h1>
                <p style="margin:0;font-size:15px;color:${MUTED};line-height:1.6;">
                  Hi ${username}, we received a request to reset the password for your ToBeATraveller account.
                  Click the button below to choose a new password.
                </p>
              </td>
            </tr>
          </table>

          <!-- CTA -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;">
            <tr>
              <td style="border-radius:8px;background-color:${BRAND};">
                <a href="${config.appUrl}/reset-password?token=${token}" target="_blank"
                   style="display:inline-block;padding:15px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;letter-spacing:0.2px;">
                  Reset Password →
                </a>
              </td>
            </tr>
          </table>

          <!-- Expiry notice -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px;">
            <tr>
              <td style="background-color:#f8fafc;border-radius:8px;padding:16px 20px;">
                <p style="margin:0;font-size:13px;color:${MUTED};line-height:1.6;">
                  ⏱ This link expires in <strong>1 hour</strong>. If it has expired, you can
                  <a href="${config.appUrl}/forgot-password" style="color:${BRAND};text-decoration:none;font-weight:600;">request a new one</a>.
                </p>
              </td>
            </tr>
          </table>

          <!-- Fallback link -->
          <p style="margin:0 0 8px;font-size:13px;color:${MUTED};line-height:1.6;">
            If the button doesn't work, copy and paste this URL into your browser:
          </p>
          <p style="margin:0;font-size:12px;color:${BRAND};word-break:break-all;line-height:1.6;">
            ${config.appUrl}/reset-password?token=${token}
          </p>
        `,
        footerNote: `If you didn't request a password reset, you can safely ignore this email.<br/>
                     Your password will remain unchanged.`,
    }),
});
