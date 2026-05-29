import { layout } from '../layout.js';

const BRAND = '#0077b6';
const MUTED = '#9ca3af';

const metaField = (label, valueHtml) => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:14px;">
    <tr>
      <td style="width:80px;vertical-align:top;padding-top:2px;">
        <span style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${MUTED};">${label}</span>
      </td>
      <td style="vertical-align:top;">${valueHtml}</td>
    </tr>
  </table>
`;

export const contactTemplate = ({ name, email, subject, message }) => ({
    subject: `[Contact] ${subject}`,
    html: layout({
        title: 'New Contact Message',
        preheader: `New message from ${name}: ${subject}`,
        content: `
          <!-- Headline -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;">
            <tr>
              <td>
                <p style="margin:0 0 6px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:${MUTED};">New message</p>
                <h1 style="margin:0;font-size:22px;font-weight:800;color:#111827;line-height:1.3;">${subject}</h1>
              </td>
            </tr>
          </table>

          <!-- Sender info block -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
                 style="background-color:#f8fafc;border-radius:10px;margin-bottom:28px;">
            <tr>
              <td style="padding:20px 24px;">
                ${metaField('From',  `<span style="font-size:14px;font-weight:700;color:#111827;">${name}</span>`)}
                ${metaField('Email', `<a href="mailto:${email}" style="font-size:14px;color:${BRAND};text-decoration:none;font-weight:600;">${email}</a>`)}
              </td>
            </tr>
          </table>

          <!-- Message -->
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr>
              <td>
                <p style="margin:0 0 10px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:${MUTED};">Message</p>
                <div style="background-color:#f8fafc;border-left:3px solid ${BRAND};border-radius:0 8px 8px 0;padding:18px 22px;">
                  <p style="margin:0;font-size:15px;color:#374151;line-height:1.7;white-space:pre-wrap;">${message}</p>
                </div>
              </td>
            </tr>
          </table>
        `,
        footerNote: `Hit reply to respond directly to ${name} at <a href="mailto:${email}" style="color:${BRAND};text-decoration:none;">${email}</a>.`,
    }),
});
