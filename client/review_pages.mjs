import { chromium } from 'playwright';

const user = { id: "test-user-1", username: "Test User", email: "test@example.com", bio: "", avatarUrl: null, itineraries: [] };
const userFull = { ...user, followers: [], following: [], itineraries: [] };
const itinerary = {
  id: 'abc', userId: 'test-user-1', title: 'Test Trip', description: 'A great trip',
  photoUrl: '', isPublic: true, category: 'adventure',
  location: { name: 'Rome', label: 'Rome, Italy', lat: 41.9, lon: 12.5 },
  startDate: '2026-06-01T00:00:00.000Z', endDate: '2026-06-07T00:00:00.000Z',
  budget: '1500', currency: 'EUR', numberOfPeople: 2,
  places: [
    { id: 'p1', name: 'Colosseum', label: 'Colosseum, Rome', latitude: 41.89, longitude: 12.49, description: 'Amazing!', category: 'culture', dayNumber: 1, orderIndex: 0 }
  ]
};

const API = 'http://localhost:3000';

async function setupRoutes(page) {
  // Auth: GET /users/me
  await page.route(`${API}/users/me`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }));
  // Auth service calls
  await page.route(`${API}/auth/**`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(user) }));
  // getUserById for loadMyUserInfo
  await page.route(`${API}/users/test-user-1`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(userFull) }));
  // getItinerariesByUserId
  await page.route(`${API}/itineraries/user/test-user-1`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([itinerary]) }));
  // followers/following
  await page.route(`${API}/followers/**`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
  await page.route(`${API}/following/**`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
  // single itinerary fetch for edit page
  await page.route(`${API}/itineraries/abc`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(itinerary) }));
  // catch-all for any remaining API routes
  await page.route(`${API}/**`, r => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
}

async function screenshot(page, url, filename) {
  // Log all requests for debugging
  page.on('requestfailed', req => console.log('FAILED:', req.url(), req.failure()?.errorText));
  page.on('console', msg => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: filename, fullPage: true });
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await setupRoutes(page);

  await screenshot(page, 'http://localhost:5173/create-itinerary', '/tmp/create_itinerary.png');
  console.log('create done');

  await screenshot(page, 'http://localhost:5173/itinerary/edit/abc', '/tmp/edit_itinerary.png');
  console.log('edit done');

  await browser.close();
})();
