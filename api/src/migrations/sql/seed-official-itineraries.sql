-- ============================================================
-- Seed: Official ToBeATraveller Itineraries
-- Run this AFTER the official accounts have registered.
-- Update email addresses if usernames differ from what was registered.
-- ============================================================

-- ── 1. KYOTO, JAPAN ─────────────────────────────────────────
-- Account: tobeatraveller+1@gmail.com  |  7 days  |  Culture

INSERT INTO itineraries (id, user_id, title, description, location_name, location_label, latitude, longitude, start_date, end_date, photo_url, budget, currency, number_of_people, category, is_public)
VALUES (
  'a0000001-0000-0000-0000-000000000001',
  (SELECT id FROM users WHERE email = 'tobeatraveller+1@gmail.com'),
  '7 Days in Kyoto: Temples, Tea & Cherry Blossoms',
  'The ultimate spring guide to Japan''s ancient capital. Wander through thousands of vermilion torii gates, meditate in zen gardens, and catch the fleeting beauty of sakura season. This itinerary mixes UNESCO icons with quiet neighbourhood streets that most visitors never find.',
  'Kyoto', 'Kyoto, Japan', 35.011636, 135.768029,
  '2025-03-28', '2025-04-03',
  'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&auto=format&fit=crop',
  1800.00, 'EUR', 2, 'culture', true
);

INSERT INTO places (id, title, description, label, latitude, longitude, category) VALUES
('b0000001-0000-0000-0000-000000000001', 'Fushimi Inari Taisha',
 'Thousands of vermilion torii gates wind 4 km up the mountain. Arrive before 7 am to have the path nearly to yourself — the cedar forest in early light is magical.',
 'Fushimi Inari Taisha, Kyoto, Japan', 34.967146, 135.772695, 'monument'),
('b0000001-0000-0000-0000-000000000002', 'Nishiki Market',
 'Kyoto''s "Kitchen" — a narrow 5-block covered market with 100+ vendors selling pickles, fresh tofu, grilled skewers and matcha everything. Try the octopus-stuffed takoyaki.',
 'Nishiki Market, Kyoto, Japan', 35.005224, 135.765499, 'city'),
('b0000001-0000-0000-0000-000000000003', 'Arashiyama Bamboo Grove',
 'Walk through a cathedral of towering bamboo. The rustling sound on a windy morning is unlike anything else. Pair it with a rickshaw ride through the quiet lanes behind.',
 'Arashiyama Bamboo Grove, Kyoto, Japan', 35.017059, 135.672009, 'nature'),
('b0000001-0000-0000-0000-000000000004', 'Tenryu-ji Temple',
 'A UNESCO World Heritage Zen temple with a garden designed in 1339. The pond perfectly mirrors the Arashiyama mountains. Best visited right after the bamboo grove.',
 'Tenryu-ji, Arashiyama, Kyoto, Japan', 35.017403, 135.674671, 'monument'),
('b0000001-0000-0000-0000-000000000005', 'Kinkaku-ji (Golden Pavilion)',
 'Japan''s most photographed building — a Zen temple whose top two floors are covered in gold leaf, reflected in a still mirror pond. Go early: the light is softer and queues shorter.',
 'Kinkaku-ji, Kyoto, Japan', 35.039505, 135.729167, 'monument'),
('b0000001-0000-0000-0000-000000000006', 'Philosopher''s Path',
 'A 2 km stone path along a cherry-tree-lined canal. In late March the blossoms form a pink tunnel overhead — one of Japan''s most beloved spring walks.',
 'Philosopher''s Path, Kyoto, Japan', 35.026389, 135.793751, 'nature'),
('b0000001-0000-0000-0000-000000000007', 'Gion District',
 'Kyoto''s historic geisha quarter. Stroll Hanamikoji Street after 6 pm and you might spot a geiko in full kimono heading to an ochaya. No photos without permission.',
 'Gion, Kyoto, Japan', 35.003568, 135.775803, 'city'),
('b0000001-0000-0000-0000-000000000008', 'Nijo Castle',
 'Built in 1603 with "nightingale floors" that squeak to detect intruders. The Ninomaru Palace interior is a masterpiece of Edo-period decoration.',
 'Nijo Castle, Kyoto, Japan', 35.014233, 135.748134, 'monument');

INSERT INTO itinerary_places (id, itinerary_id, place_id, order_index, day_number) VALUES
('c0000001-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001', 0, 1),
('c0000001-0000-0000-0000-000000000002', 'a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000002', 1, 1),
('c0000001-0000-0000-0000-000000000003', 'a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000003', 0, 2),
('c0000001-0000-0000-0000-000000000004', 'a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000004', 1, 2),
('c0000001-0000-0000-0000-000000000005', 'a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000005', 0, 3),
('c0000001-0000-0000-0000-000000000006', 'a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000008', 1, 3),
('c0000001-0000-0000-0000-000000000007', 'a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000006', 0, 4),
('c0000001-0000-0000-0000-000000000008', 'a0000001-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000007', 1, 4);

-- ── 2. LISBON, PORTUGAL ─────────────────────────────────────
-- Account: tobeatraveller+1@gmail.com  |  5 days  |  Culture + City

INSERT INTO itineraries (id, user_id, title, description, location_name, location_label, latitude, longitude, start_date, end_date, photo_url, budget, currency, number_of_people, category, is_public)
VALUES (
  'a0000001-0000-0000-0000-000000000002',
  (SELECT id FROM users WHERE email = 'tobeatraveller+1@gmail.com'),
  'Lisbon in 5 Days: Fado, Pastéis & Atlantic Views',
  'Europe''s sunniest capital rewards slow travellers. Lose yourself in Alfama''s labyrinthine lanes, ride vintage trams uphill, eat a warm pastel de nata straight from the oven, and end every evening with a glass of Vinho Verde watching the Tagus turn gold.',
  'Lisbon', 'Lisbon, Portugal', 38.736946, -9.142685,
  '2025-09-10', '2025-09-14',
  'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800&auto=format&fit=crop',
  900.00, 'EUR', 1, 'culture', true
);

INSERT INTO places (id, title, description, label, latitude, longitude, category) VALUES
('b0000001-0000-0000-0000-000000000009', 'Belém Tower',
 'A 16th-century fortress on the Tagus river that once welcomed explorers returning from the Age of Discovery. Best seen at golden hour from the riverbank.',
 'Torre de Belém, Lisbon, Portugal', 38.691700, -9.216000, 'monument'),
('b0000001-0000-0000-0000-000000000010', 'Jerónimos Monastery',
 'Perhaps the most beautiful building in Portugal — a masterpiece of Manueline Gothic architecture. Pastéis de Belém bakery is literally next door. Queue is worth it.',
 'Mosteiro dos Jerónimos, Belém, Lisbon', 38.697800, -9.206500, 'monument'),
('b0000001-0000-0000-0000-000000000011', 'Alfama District',
 'Lisbon''s oldest neighbourhood climbs the hill beneath the castle. Follow your ears toward fado music drifting from open windows. Get lost on purpose.',
 'Alfama, Lisbon, Portugal', 38.713900, -9.131600, 'city'),
('b0000001-0000-0000-0000-000000000012', 'São Jorge Castle',
 'Moorish castle with sweeping 360° views over the city and the Tagus estuary. The ramparts at sunset are one of Lisbon''s finest free pleasures.',
 'Castelo de São Jorge, Lisbon, Portugal', 38.717200, -9.133200, 'monument'),
('b0000001-0000-0000-0000-000000000013', 'LX Factory',
 'A former 19th-century industrial complex turned creative hub. Sunday market is legendary — vinyl, vintage, ceramics and some of Lisbon''s best brunch spots under iron beams.',
 'LX Factory, Alcântara, Lisbon', 38.703700, -9.177400, 'city'),
('b0000001-0000-0000-0000-000000000014', 'Pena Palace, Sintra',
 'A fairy-tale palace perched on a fog-wrapped mountain 30 min from Lisbon. The technicolor exterior and forest trails make it worth an early start.',
 'Palácio da Pena, Sintra, Portugal', 38.787700, -9.390300, 'monument'),
('b0000001-0000-0000-0000-000000000015', 'Time Out Market',
 'The original food market concept that spawned copies worldwide. Under one roof: the best chefs in Lisbon, craft beer, ginjinha shots and constant energy from morning to midnight.',
 'Time Out Market, Cais do Sodré, Lisbon', 38.707200, -9.146100, 'city');

INSERT INTO itinerary_places (id, itinerary_id, place_id, order_index, day_number) VALUES
('c0000001-0000-0000-0000-000000000009',  'a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000009', 0, 1),
('c0000001-0000-0000-0000-000000000010', 'a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000010', 1, 1),
('c0000001-0000-0000-0000-000000000011', 'a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000011', 0, 2),
('c0000001-0000-0000-0000-000000000012', 'a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000012', 1, 2),
('c0000001-0000-0000-0000-000000000013', 'a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000013', 0, 3),
('c0000001-0000-0000-0000-000000000014', 'a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000014', 0, 4),
('c0000001-0000-0000-0000-000000000015', 'a0000001-0000-0000-0000-000000000002', 'b0000001-0000-0000-0000-000000000015', 0, 5);

-- ── 3. SANTORINI, GREECE ────────────────────────────────────
-- Account: tobeatraveller+2@gmail.com  |  5 days  |  Romantic

INSERT INTO itineraries (id, user_id, title, description, location_name, location_label, latitude, longitude, start_date, end_date, photo_url, budget, currency, number_of_people, category, is_public)
VALUES (
  'a0000001-0000-0000-0000-000000000003',
  (SELECT id FROM users WHERE email = 'tobeatraveller+2@gmail.com'),
  'Santorini: 5 Days in the Most Beautiful Island on Earth',
  'No postcard does it justice. Clinging to the caldera rim, Santorini offers a theatre of white-washed walls, cobalt domes and sunsets that stop conversation mid-sentence. This route goes beyond Oia to discover quieter villages, volcanic beaches and exceptional local wine.',
  'Santorini', 'Santorini, Greece', 36.393155, 25.461500,
  '2025-06-12', '2025-06-16',
  'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=800&auto=format&fit=crop',
  2200.00, 'EUR', 2, 'romantic', true
);

INSERT INTO places (id, title, description, label, latitude, longitude, category) VALUES
('b0000001-0000-0000-0000-000000000016', 'Oia Village',
 'The blue-domed village everyone pictures. Arrive at 5 pm for the best sunset light on the windmills. Stay until the stars appear over the caldera — equally breathtaking.',
 'Oia, Santorini, Greece', 36.461700, 25.375000, 'city'),
('b0000001-0000-0000-0000-000000000017', 'Ammoudi Bay',
 'Oia''s hidden harbour, reached by 300 steps (or a donkey). Tiny fishing tavernas serve the catch minutes after it leaves the water. Order the grilled octopus.',
 'Ammoudi Bay, Oia, Santorini', 36.467900, 25.371200, 'beach'),
('b0000001-0000-0000-0000-000000000018', 'Red Beach',
 'Dramatic volcanic red cliffs plunge into turquoise water. A short hike from the Akrotiri car park — wear shoes for the rocky path and bring an umbrella: it gets crowded by 11 am.',
 'Red Beach, Akrotiri, Santorini', 36.351900, 25.396200, 'beach'),
('b0000001-0000-0000-0000-000000000019', 'Akrotiri Archaeological Site',
 'A Minoan city buried by the 1600 BC eruption — Santorini''s own Pompeii, and arguably better preserved. The multi-storey buildings and frescoes are astonishing.',
 'Akrotiri Prehistoric Town, Santorini', 36.351600, 25.402900, 'monument'),
('b0000001-0000-0000-0000-000000000020', 'Santo Wines Winery',
 'Perched on the caldera edge in Pyrgos, Santo Wines produces exceptional Assyrtiko from volcanic soil. The tasting terrace has the best view on the island.',
 'Santo Wines, Pyrgos, Santorini', 36.371000, 25.440000, 'city'),
('b0000001-0000-0000-0000-000000000021', 'Fira Town',
 'The island capital buzzes day and night. Take the cable car down to the old port at dawn, then walk the cliff-path north toward Imerovigli for the classic caldera panorama.',
 'Fira, Santorini, Greece', 36.416400, 25.432400, 'city');

INSERT INTO itinerary_places (id, itinerary_id, place_id, order_index, day_number) VALUES
('c0000001-0000-0000-0000-000000000016', 'a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000021', 0, 1),
('c0000001-0000-0000-0000-000000000017', 'a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000016', 0, 2),
('c0000001-0000-0000-0000-000000000018', 'a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000017', 1, 2),
('c0000001-0000-0000-0000-000000000019', 'a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000019', 0, 3),
('c0000001-0000-0000-0000-000000000020', 'a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000018', 1, 3),
('c0000001-0000-0000-0000-000000000021', 'a0000001-0000-0000-0000-000000000003', 'b0000001-0000-0000-0000-000000000020', 0, 4);

-- ── 4. BALI, INDONESIA ──────────────────────────────────────
-- Account: tobeatraveller+3@gmail.com  |  8 days  |  Adventure

INSERT INTO itineraries (id, user_id, title, description, location_name, location_label, latitude, longitude, start_date, end_date, photo_url, budget, currency, number_of_people, category, is_public)
VALUES (
  'a0000001-0000-0000-0000-000000000004',
  (SELECT id FROM users WHERE email = 'tobeatraveller+3@gmail.com'),
  'Bali in 8 Days: Rice Terraces, Volcanoes & Sacred Temples',
  'Bali earns its reputation. Jungle rivers, rice terraces glowing electric green, surf at dusk, and temple ceremonies so beautiful you''ll stand and stare. This route covers spiritual Ubud, the dramatic south cliffs, and a day escape to Nusa Penida — all on a mid-range budget.',
  'Bali', 'Bali, Indonesia', -8.340539, 115.091949,
  '2025-07-05', '2025-07-12',
  'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800&auto=format&fit=crop',
  1200.00, 'USD', 2, 'adventure', true
);

INSERT INTO places (id, title, description, label, latitude, longitude, category) VALUES
('b0000001-0000-0000-0000-000000000022', 'Tegallalang Rice Terraces',
 'Sculpted by hand over centuries, these tiered paddies north of Ubud glow emerald after the rains. Sunrise is quiet; by 10 am Instagram tours arrive. Grab a coconut at the warung at the top.',
 'Tegallalang Rice Terraces, Ubud, Bali', -8.431300, 115.277600, 'nature'),
('b0000001-0000-0000-0000-000000000023', 'Ubud Monkey Forest',
 'Sacred sanctuary home to 700 Balinese long-tailed macaques and three ancient temples. Secure your belongings — the monkeys are notorious thieves. Genuinely magical atmosphere.',
 'Sacred Monkey Forest Sanctuary, Ubud, Bali', -8.518400, 115.258800, 'nature'),
('b0000001-0000-0000-0000-000000000024', 'Mount Batur Sunrise Trek',
 'A 2-hour pre-dawn hike to 1717 m for one of Southeast Asia''s finest sunrises. The active volcano steams gently as the sky turns pink. Book a local guide — mandatory and worth it.',
 'Mount Batur, Kintamani, Bali', -8.242100, 115.375100, 'nature'),
('b0000001-0000-0000-0000-000000000025', 'Tirta Empul Temple',
 'Balinese Hindus come from across the island to purify themselves in these sacred spring-fed pools. Respectful visitors may participate. Sarong provided at the entrance.',
 'Tirta Empul, Tampaksiring, Bali', -8.415400, 115.312700, 'monument'),
('b0000001-0000-0000-0000-000000000026', 'Uluwatu Temple',
 'A Balinese sea temple perched 70 m above crashing waves on the Bukit Peninsula''s edge. Stay for the Kecak fire dance at sunset — drums, fire and the ocean below.',
 'Pura Luhur Uluwatu, Uluwatu, Bali', -8.829400, 115.084900, 'monument'),
('b0000001-0000-0000-0000-000000000027', 'Kelingking Beach, Nusa Penida',
 'The T-Rex-shaped clifftop viewpoint is Bali''s most shared photo. The hike down to the white-sand cove takes 40 min of steep scrambling. Absolutely worth it.',
 'Kelingking Beach, Nusa Penida, Bali', -8.741100, 115.452900, 'beach'),
('b0000001-0000-0000-0000-000000000028', 'Tanah Lot Temple',
 'A sea temple on a rocky island just offshore, accessible on foot at low tide. At sunset the silhouette against the orange sky is Bali at its most cinematic.',
 'Tanah Lot Temple, Tabanan, Bali', -8.621300, 115.086600, 'monument');

INSERT INTO itinerary_places (id, itinerary_id, place_id, order_index, day_number) VALUES
('c0000001-0000-0000-0000-000000000022', 'a0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000022', 0, 1),
('c0000001-0000-0000-0000-000000000023', 'a0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000023', 1, 1),
('c0000001-0000-0000-0000-000000000024', 'a0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000024', 0, 2),
('c0000001-0000-0000-0000-000000000025', 'a0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000025', 0, 3),
('c0000001-0000-0000-0000-000000000026', 'a0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000026', 0, 5),
('c0000001-0000-0000-0000-000000000027', 'a0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000027', 0, 6),
('c0000001-0000-0000-0000-000000000028', 'a0000001-0000-0000-0000-000000000004', 'b0000001-0000-0000-0000-000000000028', 0, 8);

-- ── 5. CHIANG MAI, THAILAND ─────────────────────────────────
-- Account: tobeatraveller+4@gmail.com  |  6 days  |  Backpacking

INSERT INTO itineraries (id, user_id, title, description, location_name, location_label, latitude, longitude, start_date, end_date, photo_url, budget, currency, number_of_people, category, is_public)
VALUES (
  'a0000001-0000-0000-0000-000000000005',
  (SELECT id FROM users WHERE email = 'tobeatraveller+4@gmail.com'),
  'Chiang Mai on a Budget: Elephants, Temples & Street Food',
  'Northern Thailand''s cultural capital delivers world-class experiences for remarkably little money. A day with rescued elephants, cooking your own Thai feast, cycling the old city moat, and a sunrise over the mist-covered mountains — this trip costs under $100 a day and feels like a million.',
  'Chiang Mai', 'Chiang Mai, Thailand', 18.796143, 98.979263,
  '2025-11-03', '2025-11-08',
  'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&auto=format&fit=crop',
  550.00, 'USD', 1, 'backpacking', true
);

INSERT INTO places (id, title, description, label, latitude, longitude, category) VALUES
('b0000001-0000-0000-0000-000000000029', 'Doi Suthep Temple',
 'The sacred temple that watches over Chiang Mai from the mountain. Climb 309 Naga-guarded steps or take the funicular. The gold chedi is spectacular; the city views at sunset even more so.',
 'Wat Phra That Doi Suthep, Chiang Mai', 18.804700, 98.921800, 'monument'),
('b0000001-0000-0000-0000-000000000030', 'Elephant Nature Park',
 'A rescue sanctuary for abused working elephants. You feed, bathe and walk with the herd — no riding, no shows. One of the most emotionally moving days you''ll have anywhere.',
 'Elephant Nature Park, Mae Taeng, Chiang Mai', 19.078300, 98.826800, 'nature'),
('b0000001-0000-0000-0000-000000000031', 'Thai Cooking Class',
 'Spend a morning at a local market choosing ingredients, then cook 5 dishes from scratch. You''ll make pad thai, green curry and mango sticky rice better than most restaurants back home.',
 'Chiang Mai Cooking School, Chiang Mai', 18.791600, 98.986400, 'city'),
('b0000001-0000-0000-0000-000000000032', 'Doi Inthanon National Park',
 'Thailand''s highest peak (2565 m) draped in cloud forest. The royal pagodas, Wachirathan waterfall and the birdsong-filled trails are extraordinary. Rent a scooter for the day.',
 'Doi Inthanon National Park, Chiang Mai', 18.589300, 98.486800, 'park'),
('b0000001-0000-0000-0000-000000000033', 'Wat Rong Khun (White Temple)',
 'A contemporary Buddhist temple in Chiang Rai (2h from Chiang Mai) that''s unlike any other — all white glass mosaic shimmering in the sun. Pair it with the Blue Temple nearby.',
 'Wat Rong Khun, Chiang Rai, Thailand', 19.824800, 99.762900, 'monument'),
('b0000001-0000-0000-0000-000000000034', 'Chiang Mai Night Bazaar',
 'A nightly market along Chang Klan Road selling handicrafts, silk, silver and street food. Grab a $2 pad see ew and bargain hard. The Sunday Walking Street on Wualai Road is even better.',
 'Night Bazaar, Chiang Mai, Thailand', 18.785100, 98.998500, 'city');

INSERT INTO itinerary_places (id, itinerary_id, place_id, order_index, day_number) VALUES
('c0000001-0000-0000-0000-000000000029', 'a0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000029', 0, 1),
('c0000001-0000-0000-0000-000000000030', 'a0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000034', 1, 1),
('c0000001-0000-0000-0000-000000000031', 'a0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000030', 0, 2),
('c0000001-0000-0000-0000-000000000032', 'a0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000031', 0, 3),
('c0000001-0000-0000-0000-000000000033', 'a0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000032', 0, 4),
('c0000001-0000-0000-0000-000000000034', 'a0000001-0000-0000-0000-000000000005', 'b0000001-0000-0000-0000-000000000033', 0, 5);

-- ── 6. FAROE ISLANDS ────────────────────────────────────────
-- Account: tobeatraveller+5@gmail.com  |  5 days  |  Nature

INSERT INTO itineraries (id, user_id, title, description, location_name, location_label, latitude, longitude, start_date, end_date, photo_url, budget, currency, number_of_people, category, is_public)
VALUES (
  'a0000001-0000-0000-0000-000000000006',
  (SELECT id FROM users WHERE email = 'tobeatraveller+5@gmail.com'),
  'Faroe Islands: 5 Days at the Edge of the World',
  'Eighteen volcanic islands between Norway and Iceland, home to more sheep than people and some of the most dramatic scenery on earth. This is where the Atlantic ocean meets sheer green cliffs, puffins land at your feet, and a lake appears to float above the sea.',
  'Faroe Islands', 'Faroe Islands, Denmark', 61.892635, -6.911806,
  '2025-08-18', '2025-08-22',
  'https://images.unsplash.com/photo-1516015987313-6e68b67c1d79?w=800&auto=format&fit=crop',
  2500.00, 'EUR', 2, 'nature', true
);

INSERT INTO places (id, title, description, label, latitude, longitude, category) VALUES
('b0000001-0000-0000-0000-000000000035', 'Tórshavn Old Town (Tinganes)',
 'The world''s smallest capital has a medieval harbour quarter with turf-roofed wooden houses painted in deep red and ochre. Walk it in 20 minutes, remember it forever.',
 'Tinganes, Tórshavn, Faroe Islands', 62.009900, -6.770700, 'city'),
('b0000001-0000-0000-0000-000000000036', 'Saksun Village',
 'Tucked at the end of a tidal lagoon surrounded by mountains, Saksun has only 15 residents and has appeared in countless nature documentaries. The turf-roofed church is from 1858.',
 'Saksun, Streymoy, Faroe Islands', 62.240700, -7.164100, 'nature'),
('b0000001-0000-0000-0000-000000000037', 'Múlafossur Waterfall, Gásadalur',
 'A waterfall that plunges directly off the cliff edge into the ocean. The surrounding village of 16 people only got a road tunnel in 2004. One of the most photographed views in the North Atlantic.',
 'Múlafossur Waterfall, Gásadalur, Vágar, Faroe Islands', 62.099200, -7.381700, 'nature'),
('b0000001-0000-0000-0000-000000000038', 'Trælanípa (Lake Sørvágsvatn)',
 'An optical illusion lake that appears to hang 100 m above the ocean. A guided 4 km hike leads you to the cliff edge — you''ll question physics. The view is real.',
 'Trælanípa, Vágar, Faroe Islands', 62.071800, -7.303300, 'nature'),
('b0000001-0000-0000-0000-000000000039', 'Vestmanna Bird Cliffs',
 'A boat weaves through sea caves and beneath 600 m basalt columns while thousands of gannets, guillemots and kittiwakes wheel overhead. The most exhilarating 2 hours in the Faroes.',
 'Vestmanna Bird Cliffs, Streymoy, Faroe Islands', 62.157200, -7.167300, 'nature'),
('b0000001-0000-0000-0000-000000000040', 'Mykines Island',
 'The westernmost island, reachable only by helicopter or a rough ferry. Puffins land within arm''s reach on the clifftops. The lighthouse walk above the Atlantic is otherworldly.',
 'Mykines, Faroe Islands', 62.105200, -7.644700, 'nature');

INSERT INTO itinerary_places (id, itinerary_id, place_id, order_index, day_number) VALUES
('c0000001-0000-0000-0000-000000000035', 'a0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000035', 0, 1),
('c0000001-0000-0000-0000-000000000036', 'a0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000036', 0, 2),
('c0000001-0000-0000-0000-000000000037', 'a0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000037', 0, 3),
('c0000001-0000-0000-0000-000000000038', 'a0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000038', 1, 3),
('c0000001-0000-0000-0000-000000000039', 'a0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000039', 0, 4),
('c0000001-0000-0000-0000-000000000040', 'a0000001-0000-0000-0000-000000000006', 'b0000001-0000-0000-0000-000000000040', 0, 5);

