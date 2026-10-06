import { escapeXml as escapeHtml } from '../../utils/xmlEscape.js';
import { emailCopy } from '../copy.js';
import { layout } from '../layout.js';

const MUTED = '#6b7280';

// `outcome` is what the team decided: "removed", "dismissed" or "resolved".
export const reportDecisionTemplate = ({ username, targetType, outcome, language }) => {
    const copy = emailCopy(language);
    const text = copy.reportDecision;
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
              <p style="margin:0 0 16px;font-size:15px;color:${MUTED};line-height:1.6;">
                ${text[outcome](copy.reportTargets[targetType])}
              </p>
              <p style="margin:0;font-size:14px;color:${MUTED};line-height:1.6;">
                ${text.redress}
              </p>
            `,
            footerNote: text.footer,
        }),
    };
};
