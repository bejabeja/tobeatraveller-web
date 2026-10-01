import config from '../../config/config.js';
import { emailCopy } from '../copy.js';
import { layout } from '../layout.js';

const BRAND = '#0077b6';
const MUTED = '#6b7280';

export const verifyEmailTemplate = ({ username, token, language }) => {
    const copy = emailCopy(language);
    const text = copy.verifyEmail;
    const verifyUrl = `${config.appUrl}/verify-email?token=${token}`;
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
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="border-radius:8px;background-color:${BRAND};">
                          <a href="${verifyUrl}" target="_blank"
                             style="display:inline-block;padding:15px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;letter-spacing:0.2px;">
                            ${text.cta}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 12px;font-size:13px;color:${MUTED};line-height:1.6;">${text.expiry}</p>
              <p style="margin:0 0 6px;font-size:12px;color:${MUTED};">${text.fallback}</p>
              <p style="margin:0;font-size:12px;word-break:break-all;"><a href="${verifyUrl}" style="color:${BRAND};">${verifyUrl}</a></p>
            `,
            footerNote: text.footer,
        }),
    };
};
