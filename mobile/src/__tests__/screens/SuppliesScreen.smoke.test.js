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
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'es' } }),
}));

jest.mock('@tobeatraveller/shared', () => {
  const parseError = jest.requireActual('../../../../shared/src/utils/parseError.js');
  const { normalizeSearchText } = jest.requireActual('../../../../shared/src/utils/normalizeSearchText.js');
  return {
    isNetworkError: parseError.isNetworkError,
    isPremiumRequiredError: parseError.isPremiumRequiredError,
    normalizeSearchText,
    formatNumber: jest.requireActual('../../../../shared/src/utils/formatLocale.js').formatNumber,
    supplyUnits: ['unit', 'kg', 'l'],
    supplyCategories: jest.requireActual('../../../../shared/src/utils/constants/constants.js').supplyCategories,
    ...jest.requireActual('../../../../shared/src/utils/supplies.js'),
    getShoppingList: jest.fn(),
    getInventory: jest.fn(),
    deleteInventoryItem: jest.fn(),
    deleteShoppingListItem: jest.fn(),
    markInventoryItemUsedUp: jest.fn(),
    markShoppingListItemPurchased: jest.fn(),
    addShoppingListItem: jest.fn(),
    addInventoryItem: jest.fn(),
    selectAuthUser: jest.fn(),
  };
});

import { Alert } from 'react-native';
import { addInventoryItem, addShoppingListItem, getInventory, getShoppingList, markInventoryItemUsedUp, markShoppingListItemPurchased, selectAuthUser } from '@tobeatraveller/shared';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
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

// Regression: amounts showed as "1.5" whatever the app's language.
it('writes amounts the way the app language does', async () => {
  getShoppingList.mockResolvedValue([{ id: 'item-1', name: 'Arroz', unit: 'kg', amount: 1.5, category: 'food' }]);
  getInventory.mockResolvedValue([]);

  await renderScreen(<SuppliesScreen navigation={{}} />);

  expect(await screen.findByText('1,5 supplies.unit.kg')).toBeTruthy();
});


describe('buying from the shopping list', () => {
  const MILK = { id: 'item-1', name: 'Leche', unit: 'l', amount: 2, category: 'food' };
  const UNDO_WINDOW_MS = 5000;

  beforeEach(() => {
    jest.useFakeTimers();
    getShoppingList.mockResolvedValue([MILK]);
    getInventory.mockResolvedValue([]);
  });
  afterEach(() => jest.useRealTimers());

  it('buys the item with its planned amount once the undo window has passed', async () => {
    await renderScreen(<SuppliesScreen navigation={{}} />);

    fireEvent.press(await screen.findByLabelText('supplies.markPurchased: Leche'));
    expect(markShoppingListItemPurchased).not.toHaveBeenCalled();
    await act(async () => { jest.advanceTimersByTime(UNDO_WINDOW_MS); });

    expect(markShoppingListItemPurchased).toHaveBeenCalledWith('item-1', 2);
  });

  it('shows one notice for several products ticked in a row, and undoes them all together', async () => {
    getShoppingList.mockResolvedValue([MILK, { id: 'item-2', name: 'Pan', unit: 'units', amount: 1, category: 'food' }]);
    await renderScreen(<SuppliesScreen navigation={{}} />);

    fireEvent.press(await screen.findByLabelText('supplies.markPurchased: Leche'));
    fireEvent.press(screen.getByLabelText('supplies.markPurchased: Pan'));

    expect(screen.getAllByText('supplies.purchasedCount')).toHaveLength(1);
    expect(screen.getAllByText('supplies.undo')).toHaveLength(1);

    fireEvent.press(screen.getByText('supplies.undo'));
    await act(async () => { jest.advanceTimersByTime(UNDO_WINDOW_MS * 2); });

    expect(markShoppingListItemPurchased).not.toHaveBeenCalled();
  });

  it('does not buy the item when the purchase is undone in time', async () => {
    await renderScreen(<SuppliesScreen navigation={{}} />);

    fireEvent.press(await screen.findByLabelText('supplies.markPurchased: Leche'));
    fireEvent.press(screen.getByText('supplies.undo'));
    await act(async () => { jest.advanceTimersByTime(UNDO_WINDOW_MS * 2); });

    expect(markShoppingListItemPurchased).not.toHaveBeenCalled();
  });
});

describe('adding to the shopping list', () => {
  beforeEach(() => {
    getShoppingList.mockResolvedValue([{ id: 'item-1', name: 'Leche', unit: 'l', amount: 2, category: 'food' }]);
    getInventory.mockResolvedValue([]);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('refuses a product that is already on the list, whatever the case', async () => {
    await renderScreen(<SuppliesScreen navigation={{}} />);
    await screen.findByText('Leche');

    fireEvent.changeText(screen.getByPlaceholderText('supplies.quickAddPlaceholder'), ' leche ');
    fireEvent.press(screen.getByLabelText('supplies.add'));

    expect(Alert.alert).toHaveBeenCalledWith('errors.somethingWrong', 'supplies.alreadyOnList');
    expect(addShoppingListItem).not.toHaveBeenCalled();
  });

  it('adds a new product with one unit in the chosen category', async () => {
    addShoppingListItem.mockResolvedValue({ id: 'new-1', name: 'Detergente', unit: 'units', amount: 1, category: 'cleaning' });
    await renderScreen(<SuppliesScreen navigation={{}} />);
    await screen.findByText('Leche');

    fireEvent.changeText(screen.getByPlaceholderText('supplies.quickAddPlaceholder'), 'Detergente');
    fireEvent.press(screen.getByText('supplies.category.cleaning'));
    await act(async () => { fireEvent.press(screen.getByLabelText('supplies.add')); });

    expect(addShoppingListItem).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Detergente', category: 'cleaning', amount: 1, unit: 'units' })
    );
  });
});

describe('suggestions while adding', () => {
  beforeEach(() => {
    getShoppingList.mockResolvedValue([{ id: 'item-1', name: 'Pasta', unit: 'g', amount: 500, category: 'food' }]);
    getInventory.mockResolvedValue([{ id: 'inv-1', name: 'Papel higiénico', unit: 'units', amount: 6, category: 'hygiene' }]);
    addShoppingListItem.mockResolvedValue({ id: 'new-1', name: 'Papel higiénico', unit: 'units', amount: 1, category: 'hygiene' });
  });

  it('adds a known product with its own category and unit in one tap', async () => {
    await renderScreen(<SuppliesScreen navigation={{}} />);
    await screen.findByText('Pasta');

    fireEvent.changeText(screen.getByPlaceholderText('supplies.quickAddPlaceholder'), 'papel');
    await act(async () => { fireEvent.press(screen.getByText('Papel higiénico')); });

    expect(addShoppingListItem).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Papel higiénico', category: 'hygiene', amount: 1, unit: 'units' })
    );
  });

  it('does not suggest what is already on the list', async () => {
    await renderScreen(<SuppliesScreen navigation={{}} />);
    await screen.findByText('Pasta');

    fireEvent.changeText(screen.getByPlaceholderText('supplies.quickAddPlaceholder'), 'past');

    expect(screen.getAllByText('Pasta')).toHaveLength(1);
  });
});

describe('using up an inventory item', () => {
  it('says the item is back on the shopping list and offers to go there', async () => {
    getShoppingList.mockResolvedValue([{ id: 'item-1', name: 'Pasta', unit: 'g', amount: 500, category: 'food' }]);
    getInventory.mockResolvedValue([{ id: 'inv-1', name: 'Arroz', unit: 'kg', amount: 1, category: 'food' }]);
    markInventoryItemUsedUp.mockResolvedValue({});
    await renderScreen(<SuppliesScreen navigation={{}} />);

    fireEvent.press(await screen.findByText('supplies.inventoryTab'));
    fireEvent.press(await screen.findByText('supplies.useItem'));
    await act(async () => { fireEvent.press(screen.getByText('supplies.confirmConsume')); });

    expect(markInventoryItemUsedUp).toHaveBeenCalledWith('inv-1', 1);
    expect(screen.getByText('supplies.movedToShoppingList')).toBeTruthy();

    fireEvent.press(screen.getByText('supplies.viewList'));

    expect(screen.getByText('Pasta')).toBeTruthy();
    expect(screen.queryByText('supplies.viewList')).toBeNull();
  });
});

describe('adding to the inventory', () => {
  beforeEach(() => {
    getShoppingList.mockResolvedValue([]);
    getInventory.mockResolvedValue([{ id: 'inv-1', name: 'Arroz', unit: 'kg', amount: 1, category: 'food' }]);
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());

  it('adds what the user already has with one unit, without opening the form', async () => {
    addInventoryItem.mockResolvedValue({ id: 'inv-2', name: 'Aceite', unit: 'units', amount: 1, category: 'food' });
    await renderScreen(<SuppliesScreen navigation={{}} />);
    fireEvent.press(await screen.findByText('supplies.inventoryTab'));

    fireEvent.changeText(screen.getByPlaceholderText('supplies.quickAddInventoryPlaceholder'), 'Aceite');
    await act(async () => { fireEvent.press(screen.getByLabelText('supplies.add')); });

    expect(addInventoryItem).toHaveBeenCalledWith(expect.objectContaining({ name: 'Aceite', amount: 1, unit: 'units' }));
    expect(addShoppingListItem).not.toHaveBeenCalled();
  });

  it('refuses a product that is already in the inventory', async () => {
    await renderScreen(<SuppliesScreen navigation={{}} />);
    fireEvent.press(await screen.findByText('supplies.inventoryTab'));

    fireEvent.changeText(screen.getByPlaceholderText('supplies.quickAddInventoryPlaceholder'), 'arroz');
    fireEvent.press(screen.getByLabelText('supplies.add'));

    expect(Alert.alert).toHaveBeenCalledWith('errors.somethingWrong', 'supplies.alreadyInInventory');
    expect(addInventoryItem).not.toHaveBeenCalled();
  });
});
