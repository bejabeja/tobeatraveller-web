import config from '../../config/config.js';
import { layout } from '../layout.js';

const BRAND = '#0077b6';
const MUTED = '#6b7280';

export const referralRewardTemplate = ({ username, friendUsername }) => ({
    subject: 'You just earned 1 month of Premium 🎁',
    html: layout({
        title: 'Referral reward unlocked',
        preheader: `${friendUsername} shared their first trip, so you both got 1 month of Premium.`,
        content: `
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;">
            <tr>
              <td>
                <h1 style="margin:0 0 10px;font-size:26px;font-weight:800;color:#111827;line-height:1.2;">
                  You just earned 1 month of Premium! 🎁
                </h1>
                <p style="margin:0;font-size:15px;color:${MUTED};line-height:1.6;">
                  Hi ${username}, your friend @${friendUsername} just shared their first trip on ToBeATraveller
                  after joining with your invite link. As a thank you, you both got 1 month of Premium, free.
                </p>
              </td>
            </tr>
          </table>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:8px;">
            <tr>
              <td align="center">
                <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="border-radius:8px;background-color:${BRAND};">
                      <a href="${config.appUrl}/invite" target="_blank"
                         style="display:inline-block;padding:15px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;letter-spacing:0.2px;">
                        Invite more friends →
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        `,
        footerNote: `You received this because someone joined ToBeATraveller with your invite link and shared their first trip.`,
    }),
});
