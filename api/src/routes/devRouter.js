import { Router } from 'express';
import { accountDeletedTemplate } from '../emails/templates/accountDeleted.js';
import { contactTemplate } from '../emails/templates/contact.js';
import { contactConfirmationTemplate } from '../emails/templates/contactConfirmation.js';
import { passwordResetTemplate } from '../emails/templates/passwordReset.js';
import { welcomeTemplate } from '../emails/templates/welcome.js';
import { EmailService } from '../services/emailService.js';

export const createDevRouter = () => {
  const router = Router();
  const emailService = new EmailService();

  // Preview: GET /dev/emails/welcome?username=jane
  router.get('/emails/welcome', (req, res) => {
    const { html } = welcomeTemplate({
      username: req.query.username || 'traveller',
    });
    res.send(html);
  });

  // Preview: GET /dev/emails/contact?name=Jane&email=jane@example.com&subject=Hello&message=Test
  router.get('/emails/contact', (req, res) => {
    const { html } = contactTemplate({
      name: req.query.name || 'Jane Doe',
      email: req.query.email || 'jane@example.com',
      subject: req.query.subject || 'Question about the app',
      message: req.query.message || 'Hi! I wanted to ask about...',
    });
    res.send(html);
  });

  // Preview: GET /dev/emails/password-reset?username=jane
  router.get('/emails/password-reset', (req, res) => {
    const { html } = passwordResetTemplate({
      username: req.query.username || 'traveller',
      token: 'preview_token_not_real_do_not_use',
    });
    res.send(html);
  });

  // Preview: GET /dev/emails/contact-confirmation?name=Jane
  router.get('/emails/contact-confirmation', (req, res) => {
    const { html } = contactConfirmationTemplate({
      name: req.query.name || 'Jane Doe',
    });
    res.send(html);
  });

  // Preview: GET /dev/emails/account-deleted?username=jane
  router.get('/emails/account-deleted', (req, res) => {
    const { html } = accountDeletedTemplate({
      username: req.query.username || 'traveller',
    });
    res.send(html);
  });

  // Send test: GET /dev/emails/send?type=welcome&to=your@email.com
  router.get('/emails/send', async (req, res) => {
    const { type = 'welcome', to } = req.query;
    if (!to) return res.status(400).json({ error: 'Missing ?to= param' });

    try {
      if (type === 'welcome') {
        await emailService.sendWelcome({ username: 'testuser', email: to });
      } else if (type === 'contact') {
        await emailService.sendContactNotification({
          name: 'Jane Doe',
          email: 'jane@example.com',
          subject: 'Test contact message',
          message: 'This is a test message sent from the dev email tester.',
        });
      } else if (type === 'password-reset') {
        await emailService.sendPasswordReset({
          username: 'testuser',
          email: to,
          token: 'dev_test_token_not_real',
        });
      } else if (type === 'contact-confirmation') {
        await emailService.sendContactConfirmation({ name: 'Jane Doe', email: to });
      } else if (type === 'account-deleted') {
        await emailService.sendAccountDeleted({ username: 'testuser', email: to });
      } else {
        return res.status(400).json({ error: `Unknown type "${type}". Use welcome, contact, contact-confirmation, password-reset or account-deleted.` });
      }
      res.json({ ok: true, message: `${type} email sent to ${to}` });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Index: GET /dev/emails
  router.get('/emails', (_req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Email Dev Tools</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; display: flex; height: 100vh; overflow: hidden; background: #f8fafc; color: #1a202c; }

    /* Sidebar */
    .sidebar { width: 280px; min-width: 280px; background: #fff; border-right: 1px solid #e2e8f0;
               display: flex; flex-direction: column; overflow-y: auto; }
    .sidebar-header { padding: 20px 20px 16px; border-bottom: 1px solid #e2e8f0; }
    .sidebar-header h1 { font-size: 1rem; font-weight: 700; }
    .sidebar-header p { font-size: 0.75rem; color: #94a3b8; margin-top: 3px; }
    .section-label { font-size: 0.7rem; font-weight: 600; text-transform: uppercase;
                     letter-spacing: 0.06em; color: #94a3b8; padding: 16px 20px 8px; }
    .template { padding: 10px 20px; cursor: pointer; border-left: 3px solid transparent;
                transition: background 0.1s; }
    .template:hover { background: #f1f5f9; }
    .template.active { background: #eff6ff; border-left-color: #0077b6; }
    .template-name { font-size: 0.875rem; font-weight: 600; }
    .template-desc { font-size: 0.75rem; color: #94a3b8; margin-top: 2px; }
    .send-btn { display: block; margin: 6px 20px 0; font-size: 0.75rem; font-weight: 600;
                color: #0077b6; background: #eff6ff; border: 1px solid #bfdbfe;
                border-radius: 6px; padding: 5px 10px; cursor: pointer; text-align: center;
                text-decoration: none; width: calc(100% - 40px); }
    .send-btn:hover { background: #dbeafe; }
    .send-result { font-size: 0.75rem; padding: 6px 20px; }
    .send-result.ok { color: #16a34a; }
    .send-result.err { color: #dc2626; }
    .sidebar-footer { margin-top: auto; padding: 16px 20px; border-top: 1px solid #e2e8f0;
                      font-size: 0.7rem; color: #cbd5e1; }

    /* Preview */
    .preview { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .preview-bar { padding: 12px 20px; background: #fff; border-bottom: 1px solid #e2e8f0;
                   font-size: 0.8rem; color: #64748b; display: flex; align-items: center; gap: 8px; }
    .preview-bar strong { color: #1a202c; }
    iframe { flex: 1; border: none; background: #f4f7fa; }
    .empty { flex: 1; display: flex; align-items: center; justify-content: center;
             color: #94a3b8; font-size: 0.875rem; }
  </style>
</head>
<body>
  <aside class="sidebar">
    <div class="sidebar-header">
      <h1>✉️ Email previewer</h1>
      <p>Development only</p>
    </div>

    <div class="section-label">Templates</div>

    <div class="template" data-url="/dev/emails/welcome?username=jane" data-name="Welcome email" onclick="loadPreview(this)">
      <div class="template-name">Welcome email</div>
      <div class="template-desc">Sent on registration</div>
    </div>
    <a class="send-btn" onclick="sendTest('welcome', this); return false;" href="#">Send test →</a>
    <div class="send-result" id="result-welcome"></div>

    <div class="template" data-url="/dev/emails/contact?name=Jane+Doe&email=jane@example.com&subject=Question+about+the+app&message=Hi!+I+wanted+to+ask+about+something." data-name="Contact notification" onclick="loadPreview(this)">
      <div class="template-name">Contact notification</div>
      <div class="template-desc">Internal — sent to the team</div>
    </div>
    <a class="send-btn" onclick="sendTest('contact', this); return false;" href="#">Send test →</a>
    <div class="send-result" id="result-contact"></div>

    <div class="template" data-url="/dev/emails/contact-confirmation?name=Jane+Doe" data-name="Contact confirmation" onclick="loadPreview(this)">
      <div class="template-name">Contact confirmation</div>
      <div class="template-desc">Auto-reply to the form submitter</div>
    </div>
    <a class="send-btn" onclick="sendTest('contact-confirmation', this); return false;" href="#">Send test →</a>
    <div class="send-result" id="result-contact-confirmation"></div>

    <div class="template" data-url="/dev/emails/password-reset?username=jane" data-name="Password reset" onclick="loadPreview(this)">
      <div class="template-name">Password reset</div>
      <div class="template-desc">Sent on forgot password request</div>
    </div>
    <a class="send-btn" onclick="sendTest('password-reset', this); return false;" href="#">Send test →</a>
    <div class="send-result" id="result-password-reset"></div>

    <div class="template" data-url="/dev/emails/account-deleted?username=jane" data-name="Account deleted" onclick="loadPreview(this)">
      <div class="template-name">Account deleted</div>
      <div class="template-desc">Sent on account deletion</div>
    </div>
    <a class="send-btn" onclick="sendTest('account-deleted', this); return false;" href="#">Send test →</a>
    <div class="send-result" id="result-account-deleted"></div>

    <div class="sidebar-footer">NODE_ENV !== production</div>
  </aside>

  <main class="preview">
    <div class="preview-bar" id="preview-bar">Select a template to preview it</div>
    <div class="empty" id="empty">👈 Pick a template</div>
    <iframe id="frame" style="display:none"></iframe>
  </main>

  <script>
    function loadPreview(el) {
      document.querySelectorAll('.template').forEach(t => t.classList.remove('active'));
      el.classList.add('active');
      const frame = document.getElementById('frame');
      const empty = document.getElementById('empty');
      const bar   = document.getElementById('preview-bar');
      frame.src = el.dataset.url;
      frame.style.display = 'block';
      empty.style.display = 'none';
      bar.innerHTML = '<strong>' + el.dataset.name + '</strong>';
    }

    async function sendTest(type, btn) {
      const resultEl = document.getElementById('result-' + type);
      btn.textContent = 'Sending…';
      try {
        const res = await fetch('/dev/emails/send?type=' + type + '&to=tobeatravellercompany@gmail.com');
        const data = await res.json();
        resultEl.className = 'send-result ' + (res.ok ? 'ok' : 'err');
        resultEl.textContent = res.ok ? '✓ Sent!' : '✗ ' + data.error;
      } catch {
        resultEl.className = 'send-result err';
        resultEl.textContent = '✗ Network error';
      }
      btn.textContent = 'Send test →';
      setTimeout(() => { resultEl.textContent = ''; }, 4000);
    }
  </script>
</body>
</html>`);
  });

  return router;
};
