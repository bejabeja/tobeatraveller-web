import config from '../config/config.js';

const BRAND   = '#0077b6';
const BRAND_D = '#005f91';
const BG      = '#f0f4f8';
const CARD    = '#ffffff';
const TEXT    = '#374151';
const MUTED   = '#9ca3af';
const BORDER  = '#e5e7eb';

export const layout = ({ title, preheader = '', content, footerNote }) => `
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BG};font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  ${preheader ? `<div style="display:none;font-size:1px;color:${BG};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>` : ''}

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BG};">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;">

          <!-- Card -->
          <tr>
            <td style="background-color:${CARD};border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

              <!-- Header stripe -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="background:linear-gradient(135deg,${BRAND} 0%,${BRAND_D} 100%);padding:0;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:28px 40px 24px;text-align:center;">
                          <img src="${config.appUrl}/logo-white.svg" alt="ToBeATraveller" width="160" height="27"
                               style="display:inline-block;border:0;height:auto;"
                               onerror="this.outerHTML='<p style=&quot;margin:0;font-size:13px;font-weight:700;letter-spacing:1px;color:white;&quot;>ToBeATraveller</p>'" />
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Content -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding:40px 40px 36px;color:${TEXT};font-size:15px;line-height:1.65;">
                    ${content}
                  </td>
                </tr>
              </table>

              <!-- Footer note -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding:0 40px;">
                    <hr style="border:none;border-top:1px solid ${BORDER};margin:0;" />
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 40px;text-align:center;">
                    <p style="margin:0;font-size:12px;color:${MUTED};line-height:1.6;">${footerNote}</p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Bottom footer -->
          <tr>
            <td style="padding:24px 0 0;text-align:center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom:10px;">
                    <a href="${config.appUrl}/explore" style="font-size:12px;color:${MUTED};text-decoration:none;margin:0 10px;">Explore</a>
                    <a href="${config.appUrl}/community" style="font-size:12px;color:${MUTED};text-decoration:none;margin:0 10px;">Community</a>
                    <a href="${config.appUrl}/privacy-policy" style="font-size:12px;color:${MUTED};text-decoration:none;margin:0 10px;">Privacy</a>
                    <a href="${config.appUrl}/contact" style="font-size:12px;color:${MUTED};text-decoration:none;margin:0 10px;">Contact</a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin:0;font-size:11px;color:${MUTED};">&copy; ${new Date().getFullYear()} ToBeATraveller. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
