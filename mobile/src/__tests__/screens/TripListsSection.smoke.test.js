jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (callback) => { useEffect(() => { callback(); }, []); } };
});
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key, vars) => (vars ? `${key}:${Object.values(vars).join('/')}` : key) }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('@tobeatraveller/shared', () => ({
  ...jest.requireActual('../../../../shared/src/utils/packingLists.js'),
  COLORS: jest.requireActual('../../../../shared/src/utils/constants/colors.js').COLORS,
  getPackingLists: jest.fn(),
}));

import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { getPackingLists } from '@tobeatraveller/shared';
import TripListsSection from '../../components/TripListsSection';

it("lists the trip's packing lists and offers a new one for it", async () => {
  getPackingLists.mockResolvedValue({ lists: [
    { id: 'l1', name: 'Equipaje', itemCount: 12, checkedCount: 4, itinerary: { id: 't1', title: 'Algarve' } },
    { id: 'l2', name: 'Otra', itemCount: 0, checkedCount: 0, itinerary: { id: 't9', title: 'Otro' } },
  ] });
  const navigation = { navigate: jest.fn() };
  render(<TripListsSection itineraryId="t1" navigation={navigation} />);
  await act(async () => {});

  expect(screen.getByText('Equipaje')).toBeTruthy();
  expect(screen.queryByText('Otra')).toBeNull();
  fireEvent.press(screen.getByText('packingChecklist.newListForTrip'));

  expect(navigation.navigate).toHaveBeenCalledWith('PackingChecklist', { forTripId: 't1' });
});
