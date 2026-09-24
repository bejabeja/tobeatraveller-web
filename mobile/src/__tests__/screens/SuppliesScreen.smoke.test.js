jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return {
    useFocusEffect: (callback) => { useEffect(() => { callback(); }, []); },
    useNavigation: () => ({ navigate: jest.fn() }),
  };
});

jest.mock('react-redux', () => ({
  useSelector: (selector) => selector(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('@tobeatraveller/shared', () => {
  const parseError = jest.requireActual('../../../../shared/src/utils/parseError.js');
  const { normalizeSearchText } = jest.requireActual('../../../../shared/src/utils/normalizeSearchText.js');
  return {
    isNetworkError: parseError.isNetworkError,
    isPremiumRequiredError: parseError.isPremiumRequiredError,
    normalizeSearchText,
    supplyUnits: ['unit', 'kg', 'l'],
    getShoppingList: jest.fn(),
    getInventory: jest.fn(),
    deleteInventoryItem: jest.fn(),
    deleteShoppingListItem: jest.fn(),
    markInventoryItemUsedUp: jest.fn(),
    markShoppingListItemPurchased: jest.fn(),
    selectAuthUser: jest.fn(),
  };
});

import { getInventory, getShoppingList, selectAuthUser } from '@tobeatraveller/shared';
import { act, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SuppliesScreen from '../../screens/supplies/SuppliesScreen';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
// The screen loads its data in effects on mount; flushing them inside act()
// lets those loads settle there instead of updating state after the test.
const renderScreen = async (ui) => {
  const result = render(<SafeAreaProvider initialMetrics={INITIAL_METRICS}>{ui}</SafeAreaProvider>);
  await act(async () => {});
  return result;
};

beforeEach(() => {
  jest.clearAllMocks();
  selectAuthUser.mockReturnValue({ id: 'user-1' });
});

it('renders the shopping list without crashing when the fetch succeeds', async () => {
  getShoppingList.mockResolvedValue([
    { id: 'item-1', name: 'Agua', unit: 'l', amount: 5, category: 'food' },
  ]);
  getInventory.mockResolvedValue([]);

  await renderScreen(<SuppliesScreen navigation={{}} />);

  expect(await screen.findByText('Agua')).toBeTruthy();
});
