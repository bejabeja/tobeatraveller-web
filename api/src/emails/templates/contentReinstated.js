import { escapeXml as escapeHtml } from '../../utils/xmlEscape.js';
import { emailCopy } from '../copy.js';
import { layout } from '../layout.js';

const MUTED = '#6b7280';

// The other half of the removal notice: when the team looks again and gives content back, its
// author is told, with no mention of who reported it.
export const contentReinstatedTemplate = ({ username, targetType, excerpt, language }) => {
    const copy = emailCopy(language);
    const text = copy.contentReinstated;
    return {
        subject: text.subject,
        html: layout({
            language: copy.language,
            title: text.title,
            preheader: text.preheader,
            content: `
              <h1 style="margin:0 0 10px;font-size:26px;font-weight:800;color:#111827;line-height:1.2;">
                ${text.headline(escapeHtml(username))}
              </h1>
              <p style="margin:0 0 20px;font-size:15px;color:${MUTED};line-height:1.6;">
                ${text.intro(copy.reportTargets[targetType])}
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:20px;">
                <tr>
                  <td style="background-color:#f8fafc;border-radius:10px;padding:18px 22px;font-size:14px;color:#374151;line-height:1.6;">
                    <strong>${text.contentLabel}</strong><br/>
                    ${escapeHtml(excerpt ?? '')}<br/><br/>
                    <strong>${text.restorationLabel}</strong><br/>
                    ${text.restoration[targetType]}
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:14px;color:${MUTED};line-height:1.6;">
                ${text.sorry}
              </p>
            `,
            footerNote: text.footer,
        }),
    };
};
