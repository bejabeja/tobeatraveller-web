import { chromium } from '/home/visaflow/Projects/private/tfm/client/node_modules/playwright/index.mjs';

const user = { id: "test-user-1", username: "Test User", email: "test@example.com", bio: "", avatarUrl: null, itineraries: [] };

const mockItinerary = {
  id: 'abc', userId: 'test-user-1', title: 'Weekend in Paris', description: 'A romantic getaway',
  photoUrl: '', isPublic: false, category: 'romantic',
  location: { name: 'Paris', label: 'Paris, France', lat: 48.85, lon: 2.35 },
  startDate: '2026-06-01T00:00:00.000Z', endDate: '2026-06-03T00:00:00.000Z',
  budget: '800', currency: 'EUR', numberOfPeople: 2,
  places: [
    { id: 'p1', name: 'Eiffel Tower', label: 'Eiffel Tower, Paris', latitude: 48.858, longitude: 2.294, description: 'Iconic!', category: 'culture', dayNumber: 1, orderIndex: 0 }
  ]
};

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  // Mock auth - target only localhost:3000 API calls, not Vite's own module requests
  await page.route('http://localhost:3000/users/me', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }));
  await page.route('http://localhost:3000/auth/login', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user }) }));
  // Mock user by id (needed for userMe in edit page) - must be before wildcard
  await page.route('http://localhost:3000/users/test-user-1', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }));
  await page.route('http://localhost:3000/users/test-user-1/following', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
  await page.route('http://localhost:3000/users/test-user-1/followers', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
  // Mock itineraries by user (plural with s)
  await page.route('http://localhost:3000/itineraries/test-user-1', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([mockItinerary]) }));
  await page.route('http://localhost:3000/itineraries/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([mockItinerary]) }));
  // getItineraryById uses /itinerary (singular) not /itineraries
  await page.route('http://localhost:3000/itinerary/abc', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockItinerary) }));
  await page.route('http://localhost:3000/itinerary/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockItinerary) }));

  // Try both ports
  const port = 5173;

  // Capture console errors and all network requests
  page.on('console', msg => { if (msg.type() === 'error') console.log('PAGE ERROR:', msg.text()); });
  page.on('pageerror', err => console.log('PAGE EXCEPTION:', err.message));
  page.on('request', req => { if (req.url().includes('localhost:3000')) console.log('API REQ:', req.method(), req.url()); });
  page.on('response', res => { if (res.url().includes('localhost:3000')) console.log('API RES:', res.status(), res.url()); });

  // Create page
  console.log('Navigating to create page...');
  await page.goto(`http://localhost:${port}/create-itinerary`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(2000);
  console.log('Create page URL:', page.url());
  // Log body content
  const bodyText = await page.evaluate(() => document.body.innerHTML.substring(0, 500));
  console.log('Body snippet:', bodyText);
  await page.screenshot({ path: '/tmp/create2.png', fullPage: true });

  // Edit page
  console.log('Navigating to edit page...');
  await page.goto(`http://localhost:${port}/itinerary/edit/abc`, { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForTimeout(4000);
  console.log('Edit page URL:', page.url());
  await page.screenshot({ path: '/tmp/edit2.png', fullPage: true });

  await browser.close();
  console.log('done');
})();
