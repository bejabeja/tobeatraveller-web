import config from '../../config/config.js';
import { emailCopy } from '../copy.js';
import { layout } from '../layout.js';

const BRAND = '#0077b6';
const MUTED = '#6b7280';

const newLinkLink = (label) => `<a href="${config.appUrl}/forgot-password" style="color:${BRAND};text-decoration:none;font-weight:600;">${label}</a>`;

export const passwordResetTemplate = ({ username, token, language }) => {
    const copy = emailCopy(language);
    const text = copy.passwordReset;
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

              <!-- CTA -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="border-radius:8px;background-color:${BRAND};">
                    <a href="${config.appUrl}/reset-password?token=${token}" target="_blank"
                       style="display:inline-block;padding:15px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;letter-spacing:0.2px;">
                      ${text.cta}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry notice -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#f8fafc;border-radius:8px;padding:16px 20px;">
                    <p style="margin:0;font-size:13px;color:${MUTED};line-height:1.6;">
                      ${text.expiry(newLinkLink)}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Fallback link -->
              <p style="margin:0 0 8px;font-size:13px;color:${MUTED};line-height:1.6;">
                ${text.fallback}
              </p>
              <p style="margin:0;font-size:12px;color:${BRAND};word-break:break-all;line-height:1.6;">
                ${config.appUrl}/reset-password?token=${token}
              </p>
            `,
            footerNote: text.footer,
        }),
    };
};
