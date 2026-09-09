import config from '../../config/config.js';
import { layout } from '../layout.js';

const BRAND = '#0077b6';
const MUTED = '#6b7280';

export const passwordChangedTemplate = ({ username }) => ({
    subject: 'Your password has been changed',
    html: layout({
        title: 'Password changed',
        preheader: 'Your ToBeATraveller password was just changed',
        content: `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;">
            <tr>
              <td>
                <h1 style="margin:0 0 10px;font-size:26px;font-weight:800;color:#111827;line-height:1.2;">
                  Your password has been changed
                </h1>
                <p style="margin:0;font-size:15px;color:${MUTED};line-height:1.6;">
                  Hi ${username}, this confirms that the password for your ToBeATraveller account was just changed.
                </p>
              </td>
            </tr>
          </table>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px;">
            <tr>
              <td style="background-color:#fef2f2;border-radius:10px;padding:20px 24px;">
                <p style="margin:0;font-size:14px;color:#991b1b;line-height:1.6;">
                  If you didn't make this change, your account may be compromised. Contact us immediately at
                  <a href="mailto:${config.contactRecipientEmail}" style="color:#991b1b;font-weight:700;text-decoration:none;">${config.contactRecipientEmail}</a>.
                </p>
              </td>
            </tr>
          </table>
        `,
        footerNote: `This email was sent because the password on your ToBeATraveller account was changed.<br/>
                     If this was you, no further action is needed. Otherwise, please
                     <a href="mailto:${config.contactRecipientEmail}" style="color:${BRAND};text-decoration:none;">contact us</a> right away.`,
    }),
});
