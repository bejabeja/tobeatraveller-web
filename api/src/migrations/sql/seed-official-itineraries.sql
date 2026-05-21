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




-- ── 7. NEW YORK CITY, USA ───────────────────────────────────
-- Account: tobeatraveller+5@gmail.com  |  5 days  |  Culture

INSERT INTO itineraries (id, user_id, title, description, location_name, location_label, latitude, longitude, start_date, end_date, photo_url, budget, currency, number_of_people, category, is_public)
VALUES (
  'a0000001-0000-0000-0000-000000000007',
  (SELECT id FROM users WHERE email = 'tobeatraveller+5@gmail.com'),
  'New York in 5 Days: Museums, Bridges & Street Food',
  'New York doesn''t do quiet. It does exceptional. This itinerary moves through Manhattan''s best neighbourhoods at walking pace — a morning on the High Line with coffee from Chelsea Market, afternoons in world-class museums, an evening crossing the Brooklyn Bridge at golden hour. No queuing for overrated tourist traps; this is the city as locals know it.',
  'New York City', 'New York City, USA', 40.712776, -74.005974,
  '2025-10-10', '2025-10-14',
  'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&auto=format&fit=crop',
  2400.00, 'USD', 2, 'culture', true
);

INSERT INTO places (id, title, description, label, latitude, longitude, category) VALUES
('b0000001-0000-0000-0000-000000000041', 'Central Park',
 'New York''s 840-acre green heart rewards wandering. Rent a bike and loop the reservoir at sunrise, catch a free Shakespeare in the Park performance in October, or simply sit on a bench and watch the city decompress.',
 'Central Park, Manhattan, New York', 40.785091, -73.968285, 'park'),
('b0000001-0000-0000-0000-000000000042', 'Metropolitan Museum of Art',
 'One of the world''s great museums — 5,000 years of human creativity under one roof. Budget a full morning. The rooftop terrace has a view of Central Park that most visitors never find.',
 'The Metropolitan Museum of Art, Fifth Avenue, New York', 40.779433, -73.963244, 'monument'),
('b0000001-0000-0000-0000-000000000043', 'The High Line',
 'A 2.3 km elevated park on a disused freight railway. The planting changes season by season; October brings spectacular grasses and late colour. Start at 34th St and walk south toward the Hudson.',
 'The High Line, West Side, Manhattan, New York', 40.747943, -74.004795, 'city'),
('b0000001-0000-0000-0000-000000000044', 'Brooklyn Bridge',
 'Walk it from Manhattan to Brooklyn at golden hour and the light on the towers is extraordinary. The DUMBO neighbourhood on the Brooklyn side has the best pizza slice in the city (Juliana''s, go early).',
 'Brooklyn Bridge, New York', 40.706086, -73.996864, 'monument'),
('b0000001-0000-0000-0000-000000000045', 'Chelsea Market',
 'A converted National Biscuit Company factory packed with food vendors, artisan producers and market stalls. Start with a coffee from Ninth Street Espresso. Best late morning on a weekday.',
 'Chelsea Market, 75 Ninth Ave, New York', 40.742424, -74.006592, 'city'),
('b0000001-0000-0000-0000-000000000046', 'MoMA — Museum of Modern Art',
 'The permanent collection alone is worth the ticket: Starry Night, Les Demoiselles d''Avignon, Campbell''s Soup Cans all in one afternoon. Friday evenings are free 5:30–9 pm and surprisingly calm.',
 'Museum of Modern Art, 11 West 53rd St, New York', 40.761484, -73.977664, 'monument'),
('b0000001-0000-0000-0000-000000000047', 'Smorgasburg Brooklyn',
 'Open-air food market every Saturday (April–November) at Prospect Park. 100+ vendors, cult dishes — the Ramen Burger was invented here. Arrive hungry, budget $30 and work your way around.',
 'Smorgasburg, Prospect Park, Brooklyn, New York', 40.661400, -73.969800, 'city');

INSERT INTO itinerary_places (id, itinerary_id, place_id, order_index, day_number) VALUES
('c0000001-0000-0000-0000-000000000041', 'a0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000043', 0, 1),
('c0000001-0000-0000-0000-000000000042', 'a0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000045', 1, 1),
('c0000001-0000-0000-0000-000000000043', 'a0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000041', 0, 2),
('c0000001-0000-0000-0000-000000000044', 'a0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000042', 1, 2),
('c0000001-0000-0000-0000-000000000045', 'a0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000044', 0, 3),
('c0000001-0000-0000-0000-000000000046', 'a0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000047', 1, 3),
('c0000001-0000-0000-0000-000000000047', 'a0000001-0000-0000-0000-000000000007', 'b0000001-0000-0000-0000-000000000046', 0, 4);

-- ── 8. MARRAKECH, MOROCCO ────────────────────────────────────
-- Account: tobeatraveller+4@gmail.com  |  4 days  |  Gastronomic

INSERT INTO itineraries (id, user_id, title, description, location_name, location_label, latitude, longitude, start_date, end_date, photo_url, budget, currency, number_of_people, category, is_public)
VALUES (
  'a0000001-0000-0000-0000-000000000008',
  (SELECT id FROM users WHERE email = 'tobeatraveller+4@gmail.com'),
  'Marrakech: 4 Days of Spice, Silence & Sensory Overload',
  'Marrakech arrives all at once — the smell of cumin and rose water, the call to prayer echoing across rooftops, a square that has been performing nonstop for a thousand years. This route dives deep into the medina, through souks organised by craft, into the calm of a Yves Saint Laurent garden and out the other side into some of the finest cooking in North Africa.',
  'Marrakech', 'Marrakech, Morocco', 31.629472, -7.981084,
  '2025-04-15', '2025-04-18',
  'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?w=800&auto=format&fit=crop',
  750.00, 'EUR', 2, 'gastronomic', true
);

INSERT INTO places (id, title, description, label, latitude, longitude, category) VALUES
('b0000001-0000-0000-0000-000000000048', 'Jemaa el-Fna Square',
 'The pulsing heart of Marrakech. By day: orange juice vendors, snake charmers and henna artists. By night: an open-air feast of hundreds of food stalls, storytellers and musicians. Eat the merguez at stall 14.',
 'Jemaa el-Fna, Marrakech, Morocco', 31.625739, -7.989335, 'city'),
('b0000001-0000-0000-0000-000000000049', 'Majorelle Garden',
 'An Art Deco botanical garden painted in Majorelle blue — a shade so vivid it has its own name. Yves Saint Laurent restored and loved it. His memorial is in the bamboo grove. Arrive at opening to beat the crowds.',
 'Jardin Majorelle, Marrakech, Morocco', 31.641614, -8.013014, 'nature'),
('b0000001-0000-0000-0000-000000000050', 'Bahia Palace',
 'A 19th-century palace of 160 rooms arranged around fragrant courtyards of orange trees. The zellij tilework and painted cedarwood ceilings are extraordinary. Easy to get lost — that''s the point.',
 'Palais Bahia, Mellah, Marrakech, Morocco', 31.619261, -7.982543, 'monument'),
('b0000001-0000-0000-0000-000000000051', 'Medina Souks',
 'The souks are arranged by trade: dyers, spice merchants, leather tanners, lantern makers. Follow your nose into the tanneries for a medieval spectacle. Bargain confidently — first price is always triple the final.',
 'Souks of Marrakech, Medina, Morocco', 31.633219, -7.990030, 'city'),
('b0000001-0000-0000-0000-000000000052', 'Koutoubia Mosque',
 'The 12th-century minaret that orients the entire city. Non-Muslims cannot enter but the rose gardens around it are peaceful at any hour, and the proportions of the tower are flawless.',
 'Koutoubia Mosque, Marrakech, Morocco', 31.624068, -7.993780, 'monument'),
('b0000001-0000-0000-0000-000000000053', 'Saadian Tombs',
 'Rediscovered in 1917 after centuries of burial behind a wall, the Saadian royal tombs are some of the finest examples of Moroccan decoration. Small, quiet, and genuinely moving.',
 'Saadian Tombs, Kasbah, Marrakech, Morocco', 31.617917, -7.987217, 'monument'),
('b0000001-0000-0000-0000-000000000054', 'Café de la Poste',
 'A French colonial-era brasserie with ceiling fans, wicker chairs and a terrace. The best pastilla in Marrakech and an impeccable lamb tagine. Reserve the terrace table for a late lunch after the souks.',
 'Café de la Poste, Gueliz, Marrakech, Morocco', 31.633500, -7.999200, 'city');

INSERT INTO itinerary_places (id, itinerary_id, place_id, order_index, day_number) VALUES
('c0000001-0000-0000-0000-000000000048', 'a0000001-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000048', 0, 1),
('c0000001-0000-0000-0000-000000000049', 'a0000001-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000052', 1, 1),
('c0000001-0000-0000-0000-000000000050', 'a0000001-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000051', 0, 2),
('c0000001-0000-0000-0000-000000000051', 'a0000001-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000050', 1, 2),
('c0000001-0000-0000-0000-000000000052', 'a0000001-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000053', 0, 3),
('c0000001-0000-0000-0000-000000000053', 'a0000001-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000049', 1, 3),
('c0000001-0000-0000-0000-000000000054', 'a0000001-0000-0000-0000-000000000008', 'b0000001-0000-0000-0000-000000000054', 0, 4);

-- ── 9. COSTA RICA ────────────────────────────────────────────
-- Account: tobeatraveller+3@gmail.com  |  7 days  |  Adventure

INSERT INTO itineraries (id, user_id, title, description, location_name, location_label, latitude, longitude, start_date, end_date, photo_url, budget, currency, number_of_people, category, is_public)
VALUES (
  'a0000001-0000-0000-0000-000000000009',
  (SELECT id FROM users WHERE email = 'tobeatraveller+3@gmail.com'),
  'Costa Rica in 7 Days: Volcanoes, Cloud Forest & Pacific Coast',
  'Pura vida is not a slogan here — it''s an operating principle. This route moves from the Caribbean turtle beaches of Tortuguero to the steaming flanks of Arenal, through cloud forests humming with quetzals, to a Pacific beach for the final two days. Wildlife encounters are constant, infrastructure is surprisingly good, and the food gets better the further you go from the airport.',
  'Costa Rica', 'Costa Rica', 9.748917, -83.753428,
  '2025-12-26', '2026-01-01',
  'https://images.unsplash.com/photo-1518182170546-07661fd94144?w=800&auto=format&fit=crop',
  1600.00, 'USD', 2, 'adventure', true
);

INSERT INTO places (id, title, description, label, latitude, longitude, category) VALUES
('b0000001-0000-0000-0000-000000000055', 'Arenal Volcano',
 'Costa Rica''s most active volcano rises symmetrically above a lake to 1670 m. Hike the lava fields on the western flank at dawn, soak in the Tabacón hot springs at dusk while the mountain glows above you.',
 'Arenal Volcano, La Fortuna, Costa Rica', 10.462739, -84.703175, 'nature'),
('b0000001-0000-0000-0000-000000000056', 'La Fortuna Waterfall',
 'A 75 m cascade of cold emerald water that falls into a pool at the base of the volcano. The 500-step descent is steep and worth every step. Arrive early to have the pool nearly to yourself.',
 'La Fortuna Waterfall, Alajuela, Costa Rica', 10.459661, -84.703853, 'nature'),
('b0000001-0000-0000-0000-000000000057', 'Monteverde Cloud Forest Reserve',
 'A biological corridor 1440 m above sea level where humidity condenses into permanent mist. Look for the resplendent quetzal December–April and walk the hanging bridges above the forest canopy.',
 'Monteverde Cloud Forest Reserve, Puntarenas, Costa Rica', 10.298861, -84.801233, 'nature'),
('b0000001-0000-0000-0000-000000000058', 'Manuel Antonio National Park',
 'Costa Rica''s most visited park for good reason: white-sand Pacific beaches backed by jungle where sloths hang overhead and monkeys patrol the picnic area. Arrive before 9 am and stay for the sunset.',
 'Manuel Antonio National Park, Puntarenas, Costa Rica', 9.393869, -84.135931, 'park'),
('b0000001-0000-0000-0000-000000000059', 'Tortuguero National Park',
 'Accessible only by boat or small plane, this Caribbean jungle canal system is one of the most biodiverse places on earth. July–October, green sea turtles nest on the black-sand beach at night — a sight that changes you.',
 'Tortuguero National Park, Limón, Costa Rica', 10.556169, -83.503594, 'nature'),
('b0000001-0000-0000-0000-000000000060', 'Tamarindo Beach',
 'The most accessible surf beach on the Pacific coast with consistent breaks for all levels. Rent a board at sunrise, eat ceviche at a beach shack for lunch, watch the frigate birds circle at dusk.',
 'Tamarindo, Guanacaste, Costa Rica', 10.300036, -85.836783, 'beach'),
('b0000001-0000-0000-0000-000000000061', 'Rincón de la Vieja Volcano',
 'Less visited than Arenal and more dramatically otherworldly — bubbling mud pools, hissing fumaroles and a waterfall into a turquoise canyon. Hike with a guide; the trail goes through primary forest.',
 'Rincón de la Vieja Volcano, Guanacaste, Costa Rica', 10.828483, -85.324347, 'nature'),
('b0000001-0000-0000-0000-000000000062', 'Caño Negro Wildlife Refuge',
 'A wetland refuge in northern Costa Rica where boat tours navigate channels thick with caimans, river otters, jabiru storks and howler monkeys. A birder''s paradise and one of the most undervisited places in the country.',
 'Caño Negro Wildlife Refuge, Alajuela, Costa Rica', 10.870000, -84.780000, 'nature');

INSERT INTO itinerary_places (id, itinerary_id, place_id, order_index, day_number) VALUES
('c0000001-0000-0000-0000-000000000055', 'a0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000059', 0, 1),
('c0000001-0000-0000-0000-000000000056', 'a0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000055', 0, 2),
('c0000001-0000-0000-0000-000000000057', 'a0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000056', 1, 2),
('c0000001-0000-0000-0000-000000000058', 'a0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000057', 0, 3),
('c0000001-0000-0000-0000-000000000059', 'a0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000061', 0, 4),
('c0000001-0000-0000-0000-000000000060', 'a0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000060', 0, 5),
('c0000001-0000-0000-0000-000000000061', 'a0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000058', 0, 6),
('c0000001-0000-0000-0000-000000000062', 'a0000001-0000-0000-0000-000000000009', 'b0000001-0000-0000-0000-000000000062', 1, 6);

-- ── 10. AMSTERDAM, NETHERLANDS ──────────────────────────────
-- Account: tobeatraveller+2@gmail.com  |  4 days  |  Backpacking

INSERT INTO itineraries (id, user_id, title, description, location_name, location_label, latitude, longitude, start_date, end_date, photo_url, budget, currency, number_of_people, category, is_public)
VALUES (
  'a0000001-0000-0000-0000-000000000010',
  (SELECT id FROM users WHERE email = 'tobeatraveller+2@gmail.com'),
  'Amsterdam in 4 Days: Canals, Pedals & World-Class Art',
  'Amsterdam rewards the traveller who slows down to its pace — which is roughly the speed of a bicycle. In four days you can cover the world''s finest collection of Dutch masters, walk a canal belt that hasn''t changed in 400 years, stand in the room where Anne Frank hid, and still have time for a market morning in the Jordaan. Rent a bike on day one and don''t give it back.',
  'Amsterdam', 'Amsterdam, Netherlands', 52.370216, 4.895168,
  '2026-04-14', '2026-04-17',
  'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&auto=format&fit=crop',
  700.00, 'EUR', 1, 'backpacking', true
);

INSERT INTO places (id, title, description, label, latitude, longitude, category) VALUES
('b0000001-0000-0000-0000-000000000063', 'Rijksmuseum',
 'The Netherlands'' national museum and one of the finest collections in the world. Rembrandt''s Night Watch, Vermeer''s Milkmaid, 8,000 objects from the Dutch Golden Age. Book tickets weeks in advance; it sells out.',
 'Rijksmuseum, Museumplein, Amsterdam', 52.360026, 4.885217, 'monument'),
('b0000001-0000-0000-0000-000000000064', 'Van Gogh Museum',
 'The largest collection of Van Gogh''s work anywhere — 200 paintings, 500 drawings, and a chronological journey through a genius in crisis. The letters room is unexpectedly moving. Book early or get the first slot.',
 'Van Gogh Museum, Museumplein, Amsterdam', 52.358436, 4.881014, 'monument'),
('b0000001-0000-0000-0000-000000000065', 'Anne Frank House',
 'The secret annex where Anne Frank hid for two years. Understated, unforgettable, and important. The diary entries on the original pages in the final room are devastating. Book online months ahead — no exceptions.',
 'Anne Frank House, Prinsengracht 263, Amsterdam', 52.375229, 4.883977, 'monument'),
('b0000001-0000-0000-0000-000000000066', 'Vondelpark',
 'Amsterdam''s central park on a Sunday afternoon is one of Europe''s great free performances: street musicians, rollerbladers, picnics, dogs, chess players. In April the tulip beds are exceptional.',
 'Vondelpark, Amsterdam', 52.358219, 4.868214, 'park'),
('b0000001-0000-0000-0000-000000000067', 'Jordaan District',
 'The most beautiful neighbourhood in Amsterdam — narrow streets, 17th-century warehouses converted to apartments, brown café bars where regulars have the same seat for decades. Saturday at the Noordermarkt for cheese and antiques.',
 'Jordaan, Amsterdam', 52.374444, 4.883333, 'city'),
('b0000001-0000-0000-0000-000000000068', 'Heineken Experience',
 'The original 1867 brewery turned into an interactive museum. More fun than it has any right to be, especially the brewing process room and the horse stables. Includes two beers. Go on a weekday afternoon.',
 'Heineken Experience, Stadhouderskade 78, Amsterdam', 52.357611, 4.891967, 'city'),
('b0000001-0000-0000-0000-000000000069', 'Canal Belt (Herengracht)',
 'Rent a canoe or small boat and navigate the 17th-century canal ring from water level. The Herengracht''s Golden Bend at dusk, when the amber lights reflect in the water, is one of the most beautiful urban scenes in Europe.',
 'Herengracht, Canal Belt, Amsterdam', 52.367477, 4.894539, 'city');

INSERT INTO itinerary_places (id, itinerary_id, place_id, order_index, day_number) VALUES
('c0000001-0000-0000-0000-000000000063', 'a0000001-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000065', 0, 1),
('c0000001-0000-0000-0000-000000000064', 'a0000001-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000067', 1, 1),
('c0000001-0000-0000-0000-000000000065', 'a0000001-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000063', 0, 2),
('c0000001-0000-0000-0000-000000000066', 'a0000001-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000064', 1, 2),
('c0000001-0000-0000-0000-000000000067', 'a0000001-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000069', 0, 3),
('c0000001-0000-0000-0000-000000000068', 'a0000001-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000066', 1, 3),
('c0000001-0000-0000-0000-000000000069', 'a0000001-0000-0000-0000-000000000010', 'b0000001-0000-0000-0000-000000000068', 0, 4);

-- ── 11. TOKYO, JAPAN ────────────────────────────────────────
-- Account: tobeatraveller+3@gmail.com  |  6 days  |  Culture

INSERT INTO itineraries (id, user_id, title, description, location_name, location_label, latitude, longitude, start_date, end_date, photo_url, budget, currency, number_of_people, category, is_public)
VALUES (
  'a0000001-0000-0000-0000-000000000011',
  (SELECT id FROM users WHERE email = 'tobeatraveller+3@gmail.com'),
  'Tokyo in 6 Days: Temples, Neon & Perfect Ramen',
  'Tokyo is the most efficiently overwhelming city on earth. Thirty-seven million people, and somehow it''s the quietest major city you''ll ever visit. This itinerary moves between centuries — a Meiji-era shrine at sunrise, a Tsukiji breakfast, teamLab light tunnels at night — and finds the thread that makes it all coherent. Go in late March when the cherry blossoms turn the riverbanks pink.',
  'Tokyo', 'Tokyo, Japan', 35.689487, 139.691711,
  '2026-03-25', '2026-03-30',
  'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&auto=format&fit=crop',
  2800.00, 'EUR', 2, 'culture', true
);

INSERT INTO places (id, title, description, label, latitude, longitude, category) VALUES
('b0000001-0000-0000-0000-000000000070', 'Senso-ji Temple, Asakusa',
 'Tokyo''s oldest and most visited temple — and still legitimately magnificent. The Nakamise shopping street leading to the main gate is the best place to buy ningyo-yaki (red bean cakes). Arrive at dawn when the lanterns glow and the crowds are gone.',
 'Senso-ji, Asakusa, Tokyo, Japan', 35.714764, 139.796655, 'monument'),
('b0000001-0000-0000-0000-000000000071', 'Shibuya Crossing',
 'The world''s busiest pedestrian crossing — up to 3,000 people cross simultaneously when the lights change. Watch from the Starbucks overlooking the intersection or from the Shibuya Sky observation deck 229 m above.',
 'Shibuya Crossing, Shibuya, Tokyo, Japan', 35.659513, 139.700464, 'city'),
('b0000001-0000-0000-0000-000000000072', 'Shinjuku Gyoen National Garden',
 'The finest park in Tokyo and, in late March, one of the finest places on earth. 1,800 cherry trees, traditional Japanese, French and English garden sections, and a greenhouse. Lunch on a picnic blanket under the blossom.',
 'Shinjuku Gyoen, Shinjuku, Tokyo, Japan', 35.685175, 139.710556, 'park'),
('b0000001-0000-0000-0000-000000000073', 'Tsukiji Outer Market',
 'The inner wholesale market moved to Toyosu, but the Outer Market remains — hundreds of vendors selling the freshest seafood, tamagoyaki (egg rolls), and street food from 5 am. The best breakfast in Tokyo costs under ¥1,500.',
 'Tsukiji Outer Market, Chuo, Tokyo, Japan', 35.665489, 139.770186, 'city'),
('b0000001-0000-0000-0000-000000000074', 'teamLab Planets',
 'A digital art museum where you walk barefoot through rooms that dissolve the boundary between viewer and artwork. The mirrored infinity rooms and floor projections are unlike anything a screen can convey. Book weeks ahead.',
 'teamLab Planets, Toyosu, Tokyo, Japan', 35.647100, 139.793600, 'monument'),
('b0000001-0000-0000-0000-000000000075', 'Meiji Jingu Shrine',
 'A Shinto shrine dedicated to Emperor Meiji, set in 70 hectares of forested parkland in the middle of the city. The cypress torii gate is one of Japan''s most iconic images. Visit at 6 am before the crowds arrive.',
 'Meiji Jingu Shrine, Harajuku, Tokyo, Japan', 35.676320, 139.699260, 'monument'),
('b0000001-0000-0000-0000-000000000076', 'Harajuku & Takeshita Street',
 'Tokyo''s temple of extreme youth fashion — a narrow pedestrian street packed with crepe shops, vintage stores and looks that shouldn''t work but do. Directly next door to the tranquil Meiji Shrine, which sums up Tokyo perfectly.',
 'Takeshita Street, Harajuku, Tokyo, Japan', 35.669500, 139.703100, 'city');

INSERT INTO itinerary_places (id, itinerary_id, place_id, order_index, day_number) VALUES
('c0000001-0000-0000-0000-000000000070', 'a0000001-0000-0000-0000-000000000011', 'b0000001-0000-0000-0000-000000000075', 0, 1),
('c0000001-0000-0000-0000-000000000071', 'a0000001-0000-0000-0000-000000000011', 'b0000001-0000-0000-0000-000000000070', 0, 2),
('c0000001-0000-0000-0000-000000000072', 'a0000001-0000-0000-0000-000000000011', 'b0000001-0000-0000-0000-000000000073', 0, 3),
('c0000001-0000-0000-0000-000000000073', 'a0000001-0000-0000-0000-000000000011', 'b0000001-0000-0000-0000-000000000074', 1, 3),
('c0000001-0000-0000-0000-000000000074', 'a0000001-0000-0000-0000-000000000011', 'b0000001-0000-0000-0000-000000000072', 0, 4),
('c0000001-0000-0000-0000-000000000075', 'a0000001-0000-0000-0000-000000000011', 'b0000001-0000-0000-0000-000000000071', 0, 5),
('c0000001-0000-0000-0000-000000000076', 'a0000001-0000-0000-0000-000000000011', 'b0000001-0000-0000-0000-000000000076', 1, 5);

-- ── 12. BARCELONA, SPAIN ─────────────────────────────────────
-- Account: tobeatraveller+6@gmail.com  |  4 days  |  Culture

INSERT INTO itineraries (id, user_id, title, description, location_name, location_label, latitude, longitude, start_date, end_date, photo_url, budget, currency, number_of_people, category, is_public)
VALUES (
  'a0000001-0000-0000-0000-000000000012',
  (SELECT id FROM users WHERE email = 'tobeatraveller+6@gmail.com'),
  'Barcelona in 4 Days: Gaudí, Gothic Lanes & the Mediterranean',
  'Barcelona operates at full intensity from 10 am to 3 am without pause, and somehow makes it feel effortless. Gaudí''s unfinished cathedral has been under construction for 140 years and remains the most exciting building in Europe. The Gothic Quarter predates Columbus. The beach is five minutes from the Picasso Museum. Four days here feels like a week anywhere else.',
  'Barcelona', 'Barcelona, Spain', 41.385063, 2.173404,
  '2026-07-10', '2026-07-13',
  'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&auto=format&fit=crop',
  900.00, 'EUR', 2, 'culture', true
);

INSERT INTO places (id, title, description, label, latitude, longitude, category) VALUES
('b0000001-0000-0000-0000-000000000077', 'Sagrada Família',
 'Gaudí''s unfinished masterpiece has been under construction since 1882 and is finally nearing completion. The interior — a forest of branching columns filtered through kaleidoscopic stained glass — is one of the great spaces in world architecture. Book tickets with a tower access slot.',
 'Sagrada Família, Eixample, Barcelona, Spain', 41.403629, 2.174354, 'monument'),
('b0000001-0000-0000-0000-000000000078', 'Park Güell',
 'Gaudí''s mosaic-covered terraces and gingerbread gatehouses sit above the city with sweeping views to the Mediterranean. The monumental zone requires a timed ticket; arrive early to catch the light on the dragon staircase.',
 'Park Güell, Gràcia, Barcelona, Spain', 41.413948, 2.152791, 'monument'),
('b0000001-0000-0000-0000-000000000079', 'La Barceloneta',
 'Barcelona''s city beach stretches 4 km along the Mediterranean. Arrive early for a swim before the crowds, then work your way through the chiringuitos (beach bars) toward the Port Olímpic for cold cava and grilled prawns.',
 'Barceloneta Beach, Barcelona, Spain', 41.376234, 2.192124, 'beach'),
('b0000001-0000-0000-0000-000000000080', 'La Boqueria Market',
 'Barcelona''s legendary covered market has been on La Rambla since 1840. The tourist stalls at the front are overpriced — walk to the back where the fishmongers, jamón vendors and elderly ladies buying vegetables are. The juice bar at the counter is worth the queue.',
 'Mercat de la Boqueria, La Rambla, Barcelona', 41.381386, 2.172227, 'city'),
('b0000001-0000-0000-0000-000000000081', 'Barri Gòtic (Gothic Quarter)',
 'The densest concentration of medieval architecture in Europe — Roman temple ruins, a 14th-century cathedral, and lanes so narrow two people can barely pass. Best explored without a map after dark.',
 'Barri Gòtic, Ciutat Vella, Barcelona, Spain', 41.382891, 2.176613, 'city'),
('b0000001-0000-0000-0000-000000000082', 'Palau de la Música Catalana',
 'Lluís Domènech i Montaner''s 1908 concert hall is the most ornate interior in Barcelona — stained glass skylight, ceramic mosaics, Art Nouveau everywhere. The guided tour is excellent; a concert is even better.',
 'Palau de la Música Catalana, Sant Pere, Barcelona', 41.387521, 2.175037, 'monument'),
('b0000001-0000-0000-0000-000000000083', 'El Born District',
 'Barcelona''s most liveable neighbourhood — independent bookshops, natural wine bars, the Picasso Museum and the Santa Maria del Mar basilica all within a 10-minute walk. Saturday morning starts at Bar del Pla with a vermouth.',
 'El Born, Sant Pere, Barcelona, Spain', 41.385064, 2.183220, 'city');

INSERT INTO itinerary_places (id, itinerary_id, place_id, order_index, day_number) VALUES
('c0000001-0000-0000-0000-000000000077', 'a0000001-0000-0000-0000-000000000012', 'b0000001-0000-0000-0000-000000000077', 0, 1),
('c0000001-0000-0000-0000-000000000078', 'a0000001-0000-0000-0000-000000000012', 'b0000001-0000-0000-0000-000000000082', 1, 1),
('c0000001-0000-0000-0000-000000000079', 'a0000001-0000-0000-0000-000000000012', 'b0000001-0000-0000-0000-000000000078', 0, 2),
('c0000001-0000-0000-0000-000000000080', 'a0000001-0000-0000-0000-000000000012', 'b0000001-0000-0000-0000-000000000081', 1, 2),
('c0000001-0000-0000-0000-000000000081', 'a0000001-0000-0000-0000-000000000012', 'b0000001-0000-0000-0000-000000000080', 0, 3),
('c0000001-0000-0000-0000-000000000082', 'a0000001-0000-0000-0000-000000000012', 'b0000001-0000-0000-0000-000000000079', 1, 3),
('c0000001-0000-0000-0000-000000000083', 'a0000001-0000-0000-0000-000000000012', 'b0000001-0000-0000-0000-000000000083', 0, 4);

-- ── 13. ICELAND ──────────────────────────────────────────────
-- Account: tobeatraveller+5@gmail.com  |  6 days  |  Roadtrip

INSERT INTO itineraries (id, user_id, title, description, location_name, location_label, latitude, longitude, start_date, end_date, photo_url, budget, currency, number_of_people, category, is_public)
VALUES (
  'a0000001-0000-0000-0000-000000000013',
  (SELECT id FROM users WHERE email = 'tobeatraveller+5@gmail.com'),
  'Iceland Ring Road: 6 Days of Ice, Fire & Northern Lights',
  'Iceland''s south coast is one continuous jaw-drop. You drive a rental car between scenes that look computer-generated: waterfalls you can walk behind, black sand beaches with basalt columns, a glacier lagoon full of floating icebergs, and if you''re lucky, the northern lights painting the sky green above it all. February is cold and dark and absolutely worth it.',
  'Iceland', 'Iceland', 64.963051, -19.020836,
  '2026-02-08', '2026-02-13',
  'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=800&auto=format&fit=crop',
  3200.00, 'EUR', 2, 'roadtrip', true
);

INSERT INTO places (id, title, description, label, latitude, longitude, category) VALUES
('b0000001-0000-0000-0000-000000000084', 'Golden Circle',
 'Iceland''s classic day loop: Þingvellir where the tectonic plates meet and the first parliament was held in 930 AD; Geysir, where Strokkur erupts every 5 minutes; and Gullfoss, a two-tiered waterfall that roars into a canyon. Do it anticlockwise to avoid the tour buses.',
 'Golden Circle, Southwest Iceland', 64.327900, -20.122900, 'nature'),
('b0000001-0000-0000-0000-000000000085', 'Blue Lagoon',
 'A geothermal spa in a lava field — milky blue water at 37–39°C surrounded by black volcanic rock and steam. Yes it''s touristy. Yes you should go. Book the Retreat package if budget allows; standard is sold out months in advance.',
 'Blue Lagoon, Grindavík, Iceland', 63.880400, -22.449000, 'nature'),
('b0000001-0000-0000-0000-000000000086', 'Jökulsárlón Glacier Lagoon',
 'Icebergs calve from Breiðamerkurjökull glacier and drift silently through a black lagoon to the sea. The adjacent Diamond Beach is scattered with ice blocks glittering on black sand. At dusk in February the silence is total.',
 'Jökulsárlón Glacier Lagoon, Vatnajökull, Iceland', 64.048300, -16.179200, 'nature'),
('b0000001-0000-0000-0000-000000000087', 'Skógafoss Waterfall',
 'A 60 m curtain of water you can walk right up to — the spray soaks you from 50 metres. In winter the surrounding rocks freeze into columns of ice. Climb the 527 steps to the top for a view down the coast to the sea.',
 'Skógafoss, Rangárþing eystra, Iceland', 63.532100, -19.511100, 'nature'),
('b0000001-0000-0000-0000-000000000088', 'Reynisfjara Black Sand Beach',
 'The most dramatic beach in Europe — jet-black volcanic sand, 66 m basalt column cliffs, and sneaker waves that demand respect. The puffin colony in the cliff face is active spring–summer. Never turn your back on the ocean here.',
 'Reynisfjara Beach, Vík, Iceland', 63.404000, -19.044000, 'beach'),
('b0000001-0000-0000-0000-000000000089', 'Seljalandsfoss',
 'A 60 m waterfall with a path that goes behind the curtain of water — one of the few places in the world where you can stand inside a waterfall. In winter it freezes partially; the ice formations are extraordinary.',
 'Seljalandsfoss, Rangárþing eystra, Iceland', 63.615800, -19.990200, 'nature'),
('b0000001-0000-0000-0000-000000000090', 'Snæfellsnes Peninsula',
 'Jules Verne''s gateway to the centre of the earth — a 90 km peninsula crowned by a glacier-capped volcano. Killer whale and minke whale sightings from the shore, seal colonies on the rocks, and lava fields stretching to the horizon.',
 'Snæfellsnes Peninsula, Vesturland, Iceland', 64.808000, -23.766000, 'nature');

INSERT INTO itinerary_places (id, itinerary_id, place_id, order_index, day_number) VALUES
('c0000001-0000-0000-0000-000000000084', 'a0000001-0000-0000-0000-000000000013', 'b0000001-0000-0000-0000-000000000085', 0, 1),
('c0000001-0000-0000-0000-000000000085', 'a0000001-0000-0000-0000-000000000013', 'b0000001-0000-0000-0000-000000000084', 0, 2),
('c0000001-0000-0000-0000-000000000086', 'a0000001-0000-0000-0000-000000000013', 'b0000001-0000-0000-0000-000000000087', 0, 3),
('c0000001-0000-0000-0000-000000000087', 'a0000001-0000-0000-0000-000000000013', 'b0000001-0000-0000-0000-000000000089', 1, 3),
('c0000001-0000-0000-0000-000000000088', 'a0000001-0000-0000-0000-000000000013', 'b0000001-0000-0000-0000-000000000088', 0, 4),
('c0000001-0000-0000-0000-000000000089', 'a0000001-0000-0000-0000-000000000013', 'b0000001-0000-0000-0000-000000000086', 0, 5),
('c0000001-0000-0000-0000-000000000090', 'a0000001-0000-0000-0000-000000000013', 'b0000001-0000-0000-0000-000000000090', 0, 6);

-- ── 14. TUSCANY, ITALY ───────────────────────────────────────
-- Account: tobeatraveller+2@gmail.com  |  5 days  |  Relax

INSERT INTO itineraries (id, user_id, title, description, location_name, location_label, latitude, longitude, start_date, end_date, photo_url, budget, currency, number_of_people, category, is_public)
VALUES (
  'a0000001-0000-0000-0000-000000000014',
  (SELECT id FROM users WHERE email = 'tobeatraveller+2@gmail.com'),
  'Tuscany in 5 Days: Art, Wine & the Val d''Orcia',
  'Tuscany is the reason the word "idyllic" exists. Florence''s museums are genuinely world-changing; Siena''s medieval campo is the finest piazza in Italy; the cypress-lined roads of the Val d''Orcia look like a Renaissance painting because they inspired one. Come in September for the grape harvest, when the light goes amber and the whole region smells of fermenting Sangiovese.',
  'Tuscany', 'Tuscany, Italy', 43.771033, 11.248001,
  '2026-09-16', '2026-09-20',
  'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?w=800&auto=format&fit=crop',
  1500.00, 'EUR', 2, 'relax', true
);

INSERT INTO places (id, title, description, label, latitude, longitude, category) VALUES
('b0000001-0000-0000-0000-000000000091', 'Florence Cathedral (Duomo)',
 'Brunelleschi''s dome — still the largest masonry dome ever built, still impossible to believe it was finished in 1436 without modern engineering. Climb to the top for Florence at your feet. Book the Baptistery doors separately; they''re Ghiberti''s Gates of Paradise.',
 'Cattedrale di Santa Maria del Fiore, Florence, Italy', 43.773251, 11.255814, 'monument'),
('b0000001-0000-0000-0000-000000000092', 'Uffizi Gallery',
 'The greatest collection of Italian Renaissance painting anywhere. Botticelli''s Birth of Venus and Primavera, Leonardo''s Annunciation, Caravaggio, Raphael, Titian. Reserve an entire morning. The pre-booked skip-the-line slot is essential.',
 'Galleria degli Uffizi, Florence, Italy', 43.767777, 11.255103, 'monument'),
('b0000001-0000-0000-0000-000000000093', 'Ponte Vecchio',
 'The only Florentine bridge not destroyed in World War II, lined with goldsmiths since the 16th century. Walk it at dawn when it''s empty, then return at night when the jewellers'' lights reflect in the Arno.',
 'Ponte Vecchio, Florence, Italy', 43.768456, 11.253396, 'monument'),
('b0000001-0000-0000-0000-000000000094', 'Siena & Piazza del Campo',
 'The most beautiful medieval square in Italy — a vast shell-shaped piazza ringed by Gothic palaces and the Torre del Mangia. The city''s neighbourhoods (contrade) still compete in the Palio horse race every July and August. Arrive from Florence by bus for the day.',
 'Piazza del Campo, Siena, Italy', 43.318817, 11.331826, 'city'),
('b0000001-0000-0000-0000-000000000095', 'San Gimignano',
 'A hilltop medieval town of 14 surviving towers — once there were 72, a skyline of family rivalry frozen in stone. The Vernaccia white wine is local and excellent. Go on a Tuesday morning before the tours arrive.',
 'San Gimignano, Province of Siena, Italy', 43.467817, 11.040832, 'city'),
('b0000001-0000-0000-0000-000000000096', 'Chianti Wine Region',
 'The rolling hills between Florence and Siena, lined with vines and silvery olive trees. Stop at any agriturismo for a tasting — Castellina, Greve and Radda are the best bases. September''s harvest means the Sangiovese grapes are on the vine.',
 'Chianti, Province of Florence and Siena, Italy', 43.471389, 11.348889, 'vineyard'),
('b0000001-0000-0000-0000-000000000097', 'Pienza & Val d''Orcia',
 'A Renaissance ideal city designed by Pope Pius II in the 1460s, sitting above the Val d''Orcia UNESCO landscape. The cypress-lined road into town is the most photographed in Italy. The Pecorino cheese made here is extraordinary — buy it at the market on the main street.',
 'Pienza, Province of Siena, Italy', 43.079267, 11.680150, 'city');

INSERT INTO itinerary_places (id, itinerary_id, place_id, order_index, day_number) VALUES
('c0000001-0000-0000-0000-000000000091', 'a0000001-0000-0000-0000-000000000014', 'b0000001-0000-0000-0000-000000000091', 0, 1),
('c0000001-0000-0000-0000-000000000092', 'a0000001-0000-0000-0000-000000000014', 'b0000001-0000-0000-0000-000000000093', 1, 1),
('c0000001-0000-0000-0000-000000000093', 'a0000001-0000-0000-0000-000000000014', 'b0000001-0000-0000-0000-000000000092', 0, 2),
('c0000001-0000-0000-0000-000000000094', 'a0000001-0000-0000-0000-000000000014', 'b0000001-0000-0000-0000-000000000094', 0, 3),
('c0000001-0000-0000-0000-000000000095', 'a0000001-0000-0000-0000-000000000014', 'b0000001-0000-0000-0000-000000000095', 0, 4),
('c0000001-0000-0000-0000-000000000096', 'a0000001-0000-0000-0000-000000000014', 'b0000001-0000-0000-0000-000000000096', 1, 4),
('c0000001-0000-0000-0000-000000000097', 'a0000001-0000-0000-0000-000000000014', 'b0000001-0000-0000-0000-000000000097', 0, 5);
