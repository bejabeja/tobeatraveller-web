import config from '../../config/config.js';
import { layout } from '../layout.js';

const BRAND = '#0077b6';
const MUTED = '#6b7280';

export const accountDeletedTemplate = ({ username }) => ({
    subject: 'Your account has been deleted',
    html: layout({
        title: 'Account deleted',
        preheader: 'Your ToBeATraveller account has been permanently deleted',
        content: `
          <!-- Headline -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;">
            <tr>
              <td>
                <h1 style="margin:0 0 10px;font-size:26px;font-weight:800;color:#111827;line-height:1.2;">
                  Your account has been deleted
                </h1>
                <p style="margin:0;font-size:15px;color:${MUTED};line-height:1.6;">
                  Hi ${username}, we're confirming that your ToBeATraveller account and all associated data
                  have been permanently deleted as requested.
                </p>
              </td>
            </tr>
          </table>

          <!-- What was deleted -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;">
            <tr>
              <td style="background-color:#f8fafc;border-radius:10px;padding:24px;">
                <p style="margin:0 0 12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#374151;">
                  What has been removed
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding:5px 0;font-size:14px;color:${MUTED};">✓ &nbsp;Your profile and personal information</td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;font-size:14px;color:${MUTED};">✓ &nbsp;All your itineraries and travel content</td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;font-size:14px;color:${MUTED};">✓ &nbsp;Your followers and following connections</td>
                  </tr>
                  <tr>
                    <td style="padding:5px 0;font-size:14px;color:${MUTED};">✓ &nbsp;All saved favourites and preferences</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- Come back note -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px;">
            <tr>
              <td>
                <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">
                  If this was a mistake, we're sorry to see you go — but you're always welcome back.
                  You can create a new account at any time.
                </p>
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="border-radius:8px;border:2px solid ${BRAND};">
                      <a href="${config.appUrl}/register" target="_blank"
                         style="display:inline-block;padding:13px 28px;color:${BRAND};font-size:14px;font-weight:700;text-decoration:none;border-radius:6px;letter-spacing:0.2px;">
                        Create a new account
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        `,
        footerNote: `This email was sent because your ToBeATraveller account was deleted.<br/>
                     If you didn't request this, please contact us immediately at
                     <a href="mailto:${config.contactRecipientEmail}" style="color:${BRAND};text-decoration:none;">${config.contactRecipientEmail}</a>.`,
    }),
});
