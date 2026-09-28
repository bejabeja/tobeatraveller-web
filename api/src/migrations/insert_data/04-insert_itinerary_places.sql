INSERT INTO itinerary_places (id, itinerary_id, place_id, order_index, description)
VALUES
 -- New York itinerary places
  ('a1001c6e-6e9e-11ee-b962-0242ac120002', 'a90e8d2f-2781-41e5-b72b-c7d58a57b2df', 'd3f0f54c-8d91-4674-b8bc-fb3f1d55a923', 1, 'An iconic symbol of freedom located on Liberty Island in New York Harbor.'), -- Statue of Liberty
  ('a1002c6e-6e9e-11ee-b962-0242ac120003', 'a90e8d2f-2781-41e5-b72b-c7d58a57b2df', 'b7eae59b-364a-4931-a3b3-0a3b830b9ac1', 2, 'A large public park in the heart of Manhattan, known for its green spaces and recreational areas.'), -- Central Park
  ('a1003c6e-6e9e-11ee-b962-0242ac120004', 'a90e8d2f-2781-41e5-b72b-c7d58a57b2df', 'e3470f2c-321b-45e9-b3b3-e045cecd8d4e', 3, 'A 102-story skyscraper offering panoramic views of New York City from its observation decks.'), -- Empire State Building
  ('a1004c6e-6e9e-11ee-b962-0242ac120020', 'fb358159-0c18-4d7c-8a59-3d98b66f759d', 'd3f0f54c-8d91-4674-b8bc-fb3f1d55a923', 1, 'An iconic symbol of freedom located on Liberty Island in New York Harbor.'), -- Statue of Liberty
  ('a1005c6e-6e9e-11ee-b962-0242ac120021', 'fb358159-0c18-4d7c-8a59-3d98b66f759d', 'b7eae59b-364a-4931-a3b3-0a3b830b9ac1', 2, 'A large public park in the heart of Manhattan, known for its green spaces and recreational areas.'), -- Central Park
  ('a1007c6e-6e9e-11ee-b962-0242ac120024', 'a92e9e57-bf67-47b7-9b7a-8a4a04df2e16', 'd3f0f54c-8d91-4674-b8bc-fb3f1d55a923', 1, 'An iconic symbol of freedom located on Liberty Island in New York Harbor.'), -- Statue of Liberty
  ('a1008c6e-6e9e-11ee-b962-0242ac120025', 'a92e9e57-bf67-47b7-9b7a-8a4a04df2e16', 'b7eae59b-364a-4931-a3b3-0a3b830b9ac1', 2, 'A large public park in the heart of Manhattan, known for its green spaces and recreational areas.'), -- Central Park

  -- Tokyo itinerary places
  ('b1001c6e-6e9e-11ee-b962-0242ac120005', '9f2c9f0e-8f98-46be-8fdd-f5f82b4169a3', 'a7e5ff5e-b4c5-4dbf-944e-2ea10919b0fa', 1, 'A red and white tower inspired by the Eiffel Tower, offering views of the city.'), -- Tokyo Tower
  ('b1002c6e-6e9e-11ee-b962-0242ac120006', '9f2c9f0e-8f98-46be-8fdd-f5f82b4169a3', 'd3f0f54c-8d91-4674-b8bc-fb3f1d55a921', 2, 'A busy pedestrian crossing near Shibuya Station, often associated with the energy of Tokyo.'), -- Shibuya Crossing
  ('b1003c6e-6e9e-11ee-b962-0242ac120007', '9f2c9f0e-8f98-46be-8fdd-f5f82b4169a3', 'f3470f2c-321b-45e9-b3b3-e045cecd8d4a', 3, 'Tokyo’s oldest temple located in Asakusa, famous for its vibrant entrance and shopping street.'), -- Sensō-ji Temple

  -- Rome itinerary places
  ('c1001c6e-6e9e-11ee-b962-0242ac120008', 'd1b2c0f4-9283-4f7c-baa4-39920d2b4d6b', 'd3f0f54c-8d91-4674-b8bc-fb3f1d55a922', 1, 'The largest ancient amphitheater in Rome, once used for gladiator battles and public spectacles.'), -- Colosseum
  ('c1002c6e-6e9e-11ee-b962-0242ac120009', 'd1b2c0f4-9283-4f7c-baa4-39920d2b4d6b', 'f7e5ff5e-b4c5-4dbf-944e-2ea10919b0fb', 2, 'The independent city-state and headquarters of the Roman Catholic Church, home to St. Peter’s Basilica.'), -- Vatican City
  ('c1003c6e-6e9e-11ee-b962-0242ac120010', 'd1b2c0f4-9283-4f7c-baa4-39920d2b4d6b', 'b7eae59b-364a-4931-a3b3-0a3b830b9ac2', 3, 'An ancient Roman temple, now a church, famous for its large dome and oculus.'), -- Pantheon
  ('c1001c6e-6e9e-11ee-b962-0242ac120027', 'd1b2c0f4-9283-4f7c-baa4-39920d2b4d6c', 'd3f0f54c-8d91-4674-b8bc-fb3f1d55a922', 1, 'The largest ancient amphitheater in Rome, once used for gladiator battles and public spectacles.'), -- Colosseum
  ('c1002c6e-6e9e-11ee-b962-0242ac120028', 'd1b2c0f4-9283-4f7c-baa4-39920d2b4d6c', 'f7e5ff5e-b4c5-4dbf-944e-2ea10919b0fb', 2, 'The independent city-state and headquarters of the Roman Catholic Church, home to St. Peter’s Basilica.'), -- Vatican City
  ('c1003c6e-6e9e-11ee-b962-0242ac120029', 'd1b2c0f4-9283-4f7c-baa4-39920d2b4d6c', 'b7eae59b-364a-4931-a3b3-0a3b830b9ac2', 3, 'An ancient Roman temple, now a church, famous for its large dome and oculus.'), -- Pantheon


  -- Sydney itinerary places
  ('d1001c6e-6e9e-11ee-b962-0242ac120011', 'fe35c13c-4708-4c5d-8467-13970a5f3d8f', 'd3f0f54c-8d91-4674-b8bc-fb3f1d55a924', 1, 'An architectural marvel and one of the most recognizable landmarks in Sydney.'), -- Sydney Opera House
  ('d1002c6e-6e9e-11ee-b962-0242ac120012', 'fe35c13c-4708-4c5d-8467-13970a5f3d8f', 'b7eae59b-364a-4931-a3b3-0a3b830b9ac3', 2, 'A famous beach in Sydney known for its surf culture and scenic coastal walks.'), -- Bondi Beach
  ('d1003c6e-6e9e-11ee-b962-0242ac120013', 'fe35c13c-4708-4c5d-8467-13970a5f3d8f', 'f3470f2c-321b-45e9-b3b3-e045cecd8d4b', 3, 'A large steel bridge that spans Sydney Harbour, offering views of the city and the Opera House.'), -- Sydney Harbour Bridge
  ('d1003c6e-6e9e-11ee-b962-0242ac120555', '4d8e5f10-529f-44a3-9f1e-20dc6efc7b1b', 'f3470f2c-321b-45e9-b3b3-e045cecd8d4b', 3, 'A large steel bridge that spans Sydney Harbour, offering views of the city and the Opera House.'), -- Sydney Harbour Bridge
  ('d1003c6e-6e9e-11ee-b962-0242ac120556', '4d8e5f10-529f-44a3-9f1e-20dc6efc7b1b', 'f3470f2c-321b-45e9-b3b3-e045cecd8d4b', 3, 'A large steel bridge that spans Sydney Harbour, offering views of the city and the Opera House.'), -- Sydney Harbour Bridge

  -- Paris itinerary places
  ('e1001c6e-6e9e-11ee-b962-0242ac120014', '9edc6fa2-3908-4c53-9359-1e6a2fb9e5f7', 'd3f0f54c-8d91-4674-b8bc-fb3f1d55a925', 1, 'The famous Parisian landmark, offering breathtaking views of the city from its observation decks.'), -- Eiffel Tower
  ('e1002c6e-6e9e-11ee-b962-0242ac120015', '9edc6fa2-3908-4c53-9359-1e6a2fb9e5f7', 'f7e5ff5e-b4c5-4dbf-944e-2ea10919b0fc', 2, 'The world’s largest art museum, home to the Mona Lisa and countless other masterpieces.'), -- Louvre Museum
  ('e1003c6e-6e9e-11ee-b962-0242ac120016', '9edc6fa2-3908-4c53-9359-1e6a2fb9e5f7', 'b7eae59b-364a-4931-a3b3-0a3b830b9ac4', 3, 'A historic area in Paris, known for its artistic heritage, the Sacré-Cœur, and picturesque streets.'), -- Montmartre
  ('c1004c6e-6e9e-11ee-b962-0242ac120021', '18af5fc9-d807-4c65-856c-f39c8d4188c4', 'b7eae59b-364a-4931-a3b3-0a3b830b9ac4', 1, 'A historic area in Paris, known for its artistic heritage, the Sacré-Cœur, and picturesque streets.'), -- Montmartre  
  ('c1005c6e-6e9e-11ee-b962-0242ac120022', 'cb191fd5-8656-4142-8182-6f98d7659d42', 'd3f0f54c-8d91-4674-b8bc-fb3f1d55a925', 2, 'The famous Parisian landmark, offering breathtaking views of the city from its observation decks.'), -- Eiffel Tower
  ('c1006c6e-6e9e-11ee-b962-0242ac120023', 'cb191fd5-8656-4142-8182-6f98d7659d42', 'f7e5ff5e-b4c5-4dbf-944e-2ea10919b0fc', 1, 'The world’s largest art museum, home to the Mona Lisa and countless other masterpieces.'), -- Louvre Museum


  -- Switzerland itinerary places
  ('f1001c6e-6e9e-11ee-b962-0242ac120017', 'f2b4e7b1-5c2f-4cc5-8fb7-ec4f814c0835', 'd3f0f54c-8d91-4674-b8bc-fb3f1d55a926', 1, 'A charming historic district with narrow alleys, medieval buildings, and the city’s main square.'), -- Old Town Zurich
  ('f1002c6e-6e9e-11ee-b962-0242ac120018', '4a5b8f0a-6c41-4463-b68d-cf5a97034d96', 'f7e5ff5e-b4c5-4dbf-944e-2ea10919b0fd', 1, 'A scenic lake offering boat tours, swimming, and beautiful views of the surrounding mountains.'), -- Lake Zurich
  ('f1003c6e-6e9e-11ee-b962-0242ac120019', 'f2b4e7b1-5c2f-4cc5-8fb7-ec4f814c0835', 'b7eae59b-364a-4931-a3b3-0a3b830b9ac5', 2, 'A museum showcasing the cultural history and heritage of Switzerland, including art and artifacts from different epochs.'), -- Swiss National Museum

  --Barcelona itinerary places
  ('c1006c6e-6e9e-11ee-b962-0242ac120025', '38a29e10-9ebc-4b36-824b-8f4a726f9815', 'd3f0f54c-8d91-4674-b8bc-fb3f1d55a927', 1, 'A large unfinished Roman Catholic basilica designed by architect Antoni Gaudí.'), -- Sagrada Familia
  ('c1006c6e-6e9e-11ee-b962-0242ac120024', '38a29e10-9ebc-4b36-824b-8f4a726f9815', 'f7e5ff5e-b4c5-4dbf-944e-2ea10919b0fe', 2, 'A public park filled with artistic structures and gardens designed by Antoni Gaudí.'), -- Park Güell
  ('c1006c6e-6e9e-11ee-b962-0242ac120026', 'dc7392d0-f41e-41cc-9d86-2cf119a3d3f3', 'b7eae59b-364a-4931-a3b3-0a3b830b9ac6', 3, 'A tree-lined street in the heart of Barcelona known for its shops and street performers.'); -- La Rambla