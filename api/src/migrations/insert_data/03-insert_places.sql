-- Inserting new places
INSERT INTO places (id, title, label, latitude, longitude, category)
VALUES
  -- New York places
  ('d3f0f54c-8d91-4674-b8bc-fb3f1d55a923', 'Statue of Liberty', 'Liberty Island, New York, NY 10004, USA',  40.6892, -74.0445, 'Monument'),
  ('b7eae59b-364a-4931-a3b3-0a3b830b9ac1', 'Central Park', 'New York, NY 10024, USA', 40.7851, -73.9683, 'Park'),
  ('e3470f2c-321b-45e9-b3b3-e045cecd8d4e', 'Empire State Building', '20 W 34th St, New York, NY 10118, USA', 40.748817, -73.985428, 'Building'),

  -- Tokyo places
  ('a7e5ff5e-b4c5-4dbf-944e-2ea10919b0fa', 'Tokyo Tower', '4-2-8 Shibakoen, Minato City, Tokyo 105-0011, Japan', 35.6586, 139.7454, 'Landmark'),
  ('f3470f2c-321b-45e9-b3b3-e045cecd8d4a', 'Sensō-ji Temple', '2-3-1 Asakusa, Taito City, Tokyo 111-0032, Japan', 35.7148, 139.7967, 'Temple'),
  ('d3f0f54c-8d91-4674-b8bc-fb3f1d55a921', 'Shibuya Crossing', 'Shibuya, Tokyo, Japan', 35.6595, 139.7004, 'Square'),

  -- Rome places
  ('f7e5ff5e-b4c5-4dbf-944e-2ea10919b0fb', 'Vatican City', 'Vatican City, Rome, Italy', 41.9029, 12.4534, 'City-State'),
  ('b7eae59b-364a-4931-a3b3-0a3b830b9ac2', 'Pantheon', 'Piazza della Rotonda, 00186 Roma RM, Italy', 41.8986, 12.4769, 'Building'),
  ('d3f0f54c-8d91-4674-b8bc-fb3f1d55a922', 'Colosseum', 'Piazza del Colosseo, 00184 Roma RM, Italy', 41.8902, 12.4923, 'Amphitheater'),

  -- Sydney places
  ('d3f0f54c-8d91-4674-b8bc-fb3f1d55a924', 'Sydney Opera House', 'Bennelong Point, Sydney NSW 2000, Australia', -33.8568, 151.2153, 'Theater'),
  ('b7eae59b-364a-4931-a3b3-0a3b830b9ac3', 'Bondi Beach', 'Bondi Beach, Sydney NSW 2026, Australia', -33.8915, 151.2767, 'Beach'),
  ('f3470f2c-321b-45e9-b3b3-e045cecd8d4b', 'Sydney Harbour Bridge', 'Sydney Harbour Bridge, Sydney NSW, Australia', -33.8523, 151.2108, 'Bridge'),

  -- Paris places
  ('d3f0f54c-8d91-4674-b8bc-fb3f1d55a925', 'Eiffel Tower', 'Champ de Mars, 5 Avenue Anatole, 75007 Paris, France', 48.8584, 2.2945, 'Landmark'),
  ('f7e5ff5e-b4c5-4dbf-944e-2ea10919b0fc', 'Louvre Museum', 'Rue de Rivoli, 75001 Paris, France', 48.8606, 2.3376, 'Museum'),
  ('b7eae59b-364a-4931-a3b3-0a3b830b9ac4', 'Montmartre', 'Montmartre, Paris, France', 48.8867, 2.3431, 'Neighborhood'),

  -- Zurich places
  ('d3f0f54c-8d91-4674-b8bc-fb3f1d55a926', 'Old Town Zurich', 'Altstadt, Zürich, Switzerland', 47.3769, 8.5417, 'Historic District'),
  ('f7e5ff5e-b4c5-4dbf-944e-2ea10919b0fd', 'Lake Zurich', 'Lake Zurich, Switzerland', 47.3667, 8.5500, 'Lake'),
  ('b7eae59b-364a-4931-a3b3-0a3b830b9ac5', 'Swiss National Museum', 'Museumstr. 2, 8001 Zürich, Switzerland', 47.3790, 8.5419, 'Museum'),

  -- Barcelona places
  ('d3f0f54c-8d91-4674-b8bc-fb3f1d55a927', 'Sagrada Familia', 'Carrer de Mallorca, 401, 08013 Barcelona, Spain', 41.4036, 2.1744, 'Basilica'),
  ('f7e5ff5e-b4c5-4dbf-944e-2ea10919b0fe', 'Park Güell', 'Carrer d\Olot, 5, 08024 Barcelona, Spain', 41.4145, 2.1527, 'Park'),
  ('b7eae59b-364a-4931-a3b3-0a3b830b9ac6', 'La Rambla', 'La Rambla, 08002 Barcelona, Spain', 41.3809, 2.1734, 'Street');
