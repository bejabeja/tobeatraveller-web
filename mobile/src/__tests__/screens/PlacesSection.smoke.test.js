jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@tobeatraveller/shared', () => ({
  ...jest.requireActual('../../../../shared/src/utils/dayPlaces.js'),
  aiPaceOptions: [],
  placeCategories: [],
  DEFAULT_AI_PACE: 'balanced',
  stepNameHintKey: () => null,
  COLORS: jest.requireActual('../../../../shared/src/utils/constants/colors.js').COLORS,
}));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, vars) => (vars?.day ? `${key}:${vars.day}` : key) }) }));

import { useEffect, useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { PlacesSection } from '../../screens/itinerary/ItineraryFormShared';

const place = (name, dayNumber) => ({ _key: `${dayNumber}-${name}`, name, label: name, description: '', category: 'other', dayNumber, lat: 0, lon: 0 });

const LONG_TRIP = [
  place('Sagrada Família', 1), place('Casa Batlló', 1),
  place('Park Güell', 2), place('Montjuïc', 2), place('Born', 2), place('Barceloneta', 2),
  place('Tibidabo', 3),
];

// The section mounts empty; once the trip loads, its places can arrive a
// render before its days.
const TripPlaces = ({ loaded, loadedDays }) => {
  const [places, setPlaces] = useState([]);
  const [days, setDays] = useState([1]);
  useEffect(() => {
    setPlaces(loaded);
  }, []);
  useEffect(() => {
    if (places.length > 0) setDays(loadedDays);
  }, [places.length > 0]);
  return <PlacesSection places={places} days={days} setPlaces={setPlaces} setDays={setDays} isPublic={false} />;
};

const placeNames = () => screen.queryAllByPlaceholderText('itineraryForm.placeName');

it('opens a long trip with every day folded but the first, naming what each one has', () => {
  render(<TripPlaces loaded={LONG_TRIP} loadedDays={[1, 2, 3]} />);

  expect(placeNames()).toHaveLength(2);
  expect(screen.getByText('Park Güell · Montjuïc · Born itineraryForm.dayMorePlaces')).toBeTruthy();
});

// Regression: the edit screen shows the section once the trip has loaded,
// so its places never "arrived" and every day stayed open.
it('folds a long trip that is already there when the section appears', () => {
  render(<PlacesSection places={LONG_TRIP} days={[1, 2, 3]} setPlaces={() => {}} setDays={() => {}} isPublic={false} />);

  expect(placeNames()).toHaveLength(2);
});

it('unfolds a day when its title is pressed', () => {
  render(<TripPlaces loaded={LONG_TRIP} loadedDays={[1, 2, 3]} />);

  fireEvent.press(screen.getByText('itineraryForm.dayTitle:2'));

  expect(placeNames()).toHaveLength(6);
});

it('folds and unfolds every day at once', () => {
  render(<TripPlaces loaded={LONG_TRIP} loadedDays={[1, 2, 3]} />);

  fireEvent.press(screen.getByText('itineraryForm.foldAllDays'));
  expect(placeNames()).toHaveLength(0);

  fireEvent.press(screen.getByText('itineraryForm.unfoldAllDays'));
  expect(placeNames()).toHaveLength(LONG_TRIP.length);
});

it('leaves a short trip open', () => {
  render(<TripPlaces loaded={[place('Sagrada Família', 1), place('Park Güell', 2)]} loadedDays={[1, 2]} />);

  expect(placeNames()).toHaveLength(2);
});
