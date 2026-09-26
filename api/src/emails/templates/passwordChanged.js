import config from '../../config/config.js';
import { emailCopy } from '../copy.js';
import { layout } from '../layout.js';

const BRAND = '#0077b6';
const MUTED = '#6b7280';

const warningEmailLink = `<a href="mailto:${config.contactRecipientEmail}" style="color:#991b1b;font-weight:700;text-decoration:none;">${config.contactRecipientEmail}</a>`;
const contactUsLink = (label) => `<a href="mailto:${config.contactRecipientEmail}" style="color:${BRAND};text-decoration:none;">${label}</a>`;

export const passwordChangedTemplate = ({ username, language }) => {
    const copy = emailCopy(language);
    const text = copy.passwordChanged;
    return {
        subject: text.subject,
        html: layout({
            language: copy.language,
            title: text.title,
            preheader: text.preheader,
            content: `
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

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#fef2f2;border-radius:10px;padding:20px 24px;">
                    <p style="margin:0;font-size:14px;color:#991b1b;line-height:1.6;">
                      ${text.warning(warningEmailLink)}
                    </p>
                  </td>
                </tr>
              </table>
            `,
            footerNote: text.footer(contactUsLink),
        }),
    };
};
