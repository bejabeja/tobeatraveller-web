import config from '../../config/config.js';
import { emailCopy } from '../copy.js';
import { layout } from '../layout.js';

const MUTED = '#6b7280';

export const contactConfirmationTemplate = ({ name, language }) => {
    const copy = emailCopy(language);
    const text = copy.contactConfirmation;
    return {
        subject: text.subject,
        html: layout({
            language: copy.language,
            title: text.title,
            preheader: text.preheader,
            content: `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px;">
                <tr>
                  <td>
                    <h1 style="margin:0 0 10px;font-size:26px;font-weight:800;color:#111827;line-height:1.2;">
                      ${text.headline(name)}
                    </h1>
                    <p style="margin:0;font-size:15px;color:${MUTED};line-height:1.6;">
                      ${text.intro}
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#f8fafc;border-radius:10px;padding:20px 24px;">
                    <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
                      ${text.whileYouWait}
                    </p>
                  </td>
                </tr>
              </table>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="border-radius:8px;background-color:#0077b6;">
                    <a href="${config.appUrl}/explore" target="_blank"
                       style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">
                      ${text.cta}
                    </a>
                  </td>
                </tr>
              </table>
            `,
            footerNote: text.footer,
        }),
    };
};
