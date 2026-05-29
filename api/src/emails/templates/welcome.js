import config from '../../config/config.js';
import { layout } from '../layout.js';

const BRAND = '#0077b6';
const TEXT  = '#374151';
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

export const welcomeTemplate = ({ username }) => ({
    subject: 'Welcome to ToBeATraveller ✈️',
    html: layout({
        title: 'Welcome to ToBeATraveller',
        preheader: `Hi ${username}, your account is ready. Start exploring journeys around the world.`,
        content: `
          <!-- Headline -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;">
            <tr>
              <td>
                <h1 style="margin:0 0 10px;font-size:26px;font-weight:800;color:#111827;line-height:1.2;">
                  Welcome aboard, ${username}! ✈️
                </h1>
                <p style="margin:0;font-size:15px;color:${MUTED};line-height:1.6;">
                  Your ToBeATraveller account is ready. Discover journeys shared by travellers around the world — or share your own.
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
                    ${feature('🗺️', 'Explore itineraries', 'Browse hundreds of real trips from travellers worldwide')}
                    ${feature('✏️', 'Share your journey', 'Create and publish your own travel itineraries')}
                    ${feature('👥', 'Connect', 'Follow people who inspire your next adventure')}
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <!-- CTA -->
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;">
            <tr>
              <td style="border-radius:8px;background-color:${BRAND};">
                <a href="${config.appUrl}/explore" target="_blank"
                   style="display:inline-block;padding:15px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;letter-spacing:0.2px;">
                  Start Exploring →
                </a>
              </td>
            </tr>
          </table>

          <p style="margin:0;font-size:14px;color:${MUTED};line-height:1.6;">
            Have questions? Reply to this email or visit our
            <a href="${config.appUrl}/contact" style="color:${BRAND};text-decoration:none;font-weight:600;">contact page</a>.
          </p>
        `,
        footerNote: `You received this because you created an account at ToBeATraveller.<br/>
                     If this wasn't you, you can safely ignore this email.`,
    }),
});
