import { chromium } from 'playwright';
const user = { id: "t1", username: "Test", email: "t@t.com", bio: "", avatarUrl: null, itineraries: [] };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  await p.route('**/api/me', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }));
  await p.route('**/api/auth/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }));
  await p.goto('http://localhost:5173/create-itinerary', { waitUntil: 'networkidle', timeout: 15000 });
  await p.waitForTimeout(2000);
  // Scroll to Dates section for a zoomed view
  await p.evaluate(() => document.querySelector('.form__dates')?.scrollIntoView());
  await p.waitForTimeout(500);
  await p.screenshot({ path: '/tmp/chips_dates.png' });
  // Scroll to Budget section
  await p.evaluate(() => document.querySelector('.form__budget')?.scrollIntoView());
  await p.waitForTimeout(500);
  await p.screenshot({ path: '/tmp/chips_budget.png' });
  await b.close();
  console.log('done');
})();
