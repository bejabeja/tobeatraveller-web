import config from '../../config/config.js';
import { emailCopy } from '../copy.js';
import { layout } from '../layout.js';

const BRAND = '#0077b6';
const MUTED = '#6b7280';

const emailLink = `<a href="mailto:${config.contactRecipientEmail}" style="color:${BRAND};text-decoration:none;">${config.contactRecipientEmail}</a>`;

export const accountDeletedTemplate = ({ username, language }) => {
    const copy = emailCopy(language);
    const text = copy.accountDeleted;
    return {
        subject: text.subject,
        html: layout({
            language: copy.language,
            title: text.title,
            preheader: text.preheader,
            content: `
              <!-- Headline -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td>
                    <h1 style="margin:0 0 10px;font-size:26px;font-weight:800;color:#111827;line-height:1.2;">
                      ${text.headline}
                    </h1>
                    <p style="margin:0;font-size:15px;color:${MUTED};line-height:1.6;">
                      ${text.intro(username)}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- What was deleted -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#f8fafc;border-radius:10px;padding:24px;">
                    <p style="margin:0 0 12px;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#374151;">
                      ${text.removedTitle}
                    </p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      ${text.removed.map(item => `
                      <tr>
                        <td style="padding:5px 0;font-size:14px;color:${MUTED};">✓ &nbsp;${item}</td>
                      </tr>`).join('')}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Come back note -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px;">
                <tr>
                  <td>
                    <p style="margin:0 0 12px;font-size:15px;color:#374151;line-height:1.6;">
                      ${text.comeBack}
                    </p>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="border-radius:8px;border:2px solid ${BRAND};">
                          <a href="${config.appUrl}/register" target="_blank"
                             style="display:inline-block;padding:13px 28px;color:${BRAND};font-size:14px;font-weight:700;text-decoration:none;border-radius:6px;letter-spacing:0.2px;">
                            ${text.cta}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            `,
            footerNote: text.footer(emailLink),
        }),
    };
};
