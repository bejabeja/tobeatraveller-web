import config from '../../config/config.js';
import { layout } from '../layout.js';

const MUTED = '#6b7280';

export const contactConfirmationTemplate = ({ name }) => ({
    subject: "We've received your message",
    html: layout({
        title: "Message received",
        preheader: "Thanks for reaching out — we'll get back to you shortly.",
        content: `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:24px;">
            <tr>
              <td>
                <h1 style="margin:0 0 10px;font-size:26px;font-weight:800;color:#111827;line-height:1.2;">
                  Thanks, ${name}!
                </h1>
                <p style="margin:0;font-size:15px;color:${MUTED};line-height:1.6;">
                  We've received your message and we'll get back to you as soon as possible —
                  usually within 1–2 business days.
                </p>
              </td>
            </tr>
          </table>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;">
            <tr>
              <td style="background-color:#f8fafc;border-radius:10px;padding:20px 24px;">
                <p style="margin:0;font-size:14px;color:#374151;line-height:1.6;">
                  While you wait, feel free to explore itineraries from the community
                  or start planning your next trip.
                </p>
              </td>
            </tr>
          </table>

          <table role="presentation" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td style="border-radius:8px;background-color:#0077b6;">
                <a href="${config.appUrl}/explore" target="_blank"
                   style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;border-radius:8px;">
                  Explore trips →
                </a>
              </td>
            </tr>
          </table>
        `,
        footerNote: `You received this because you submitted a message via the ToBeATraveller contact form.<br/>
                     Reply to this email if you have anything to add.`,
    }),
});
