import config from '../../config/config.js';
import { emailCopy } from '../copy.js';
import { layout } from '../layout.js';

const BRAND = '#0077b6';
const MUTED = '#6b7280';

const feature = (emoji, title, desc) => `
  <td width="33%" style="padding:0 8px;vertical-align:top;text-align:center;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr><td align="center" style="padding-bottom:10px;font-size:28px;">${emoji}</td></tr>
      <tr><td align="center" style="font-size:13px;font-weight:700;color:#111827;padding-bottom:6px;">${title}</td></tr>
      <tr><td align="center" style="font-size:12px;color:${MUTED};line-height:1.5;">${desc}</td></tr>
    </table>
  </td>
`;

const contactLink = (label) => `<a href="${config.appUrl}/contact" style="color:${BRAND};text-decoration:none;font-weight:600;">${label}</a>`;

export const welcomeTemplate = ({ username, language }) => {
    const copy = emailCopy(language);
    const text = copy.welcome;
    return {
        subject: text.subject,
        html: layout({
            language: copy.language,
            title: text.title,
            preheader: text.preheader(username),
            content: `
              <!-- Headline -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td>
                    <h1 style="margin:0 0 10px;font-size:26px;font-weight:800;color:#111827;line-height:1.2;">
                      ${text.headline(username)}
                    </h1>
                    <p style="margin:0;font-size:15px;color:${MUTED};line-height:1.6;">
                      ${text.intro}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Feature highlights -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                     style="background-color:#f8fafc;border-radius:10px;margin-bottom:32px;">
                <tr>
                  <td style="padding:24px 16px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        ${text.features.map(({ emoji, title, description }) => feature(emoji, title, description)).join('')}
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td align="center">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="border-radius:8px;background-color:${BRAND};">
                          <a href="${config.appUrl}/explore" target="_blank"
                             style="display:inline-block;padding:15px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;letter-spacing:0.2px;">
                            ${text.cta}
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:0;font-size:14px;color:${MUTED};line-height:1.6;">
                ${text.questions(contactLink)}
              </p>
            `,
            footerNote: text.footer,
        }),
    };
};
