import config from '../../config/config.js';
import { escapeXml as escapeHtml } from '../../utils/xmlEscape.js';
import { emailCopy } from '../copy.js';
import { layout } from '../layout.js';

const MUTED = '#6b7280';

// What the law asks to tell a person whose content was removed: what, why, how it
// was decided (by a person, not automatically), the rule behind it and what they can
// do about it (article 17 of the Digital Services Act).
export const contentRemovedTemplate = ({ username, targetType, reason, excerpt, language }) => {
    const copy = emailCopy(language);
    const text = copy.contentRemoved;
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
                    <strong>${text.restrictionLabel}</strong><br/>
                    ${text.restriction[targetType]}<br/><br/>
                    <strong>${text.reasonLabel}</strong><br/>
                    ${copy.reportReasons[reason]}<br/><br/>
                    <strong>${text.groundLabel}</strong><br/>
                    <a href="${config.appUrl}/terms" target="_blank" style="color:#0077b6;">${text.ground}</a><br/><br/>
                    <strong>${text.howLabel}</strong><br/>
                    ${text.how}
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:14px;color:${MUTED};line-height:1.6;">
                ${text.redress}
              </p>
            `,
            footerNote: text.footer,
        }),
    };
};
