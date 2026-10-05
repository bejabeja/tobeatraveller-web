jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('@tobeatraveller/shared', () => {
  const constants = jest.requireActual('../../../../shared/src/utils/constants/constants.js');
  return {
    supplyCategories: constants.supplyCategories,
    supplyUnits: constants.supplyUnits,
    supplyItemSchema: { safeParse: jest.fn() },
    translateValidationMessage: (t, message) => message,
  };
});

import { render, screen, fireEvent } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import SupplyFormScreen from '../../screens/supplies/SupplyFormScreen';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };
const renderForm = (params) => render(
  <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
    <SupplyFormScreen navigation={{ goBack: jest.fn(), addListener: jest.fn(() => jest.fn()) }} route={{ params }} />
  </SafeAreaProvider>
);

describe('the note field', () => {
  it('starts folded when adding a product, and opens on request', () => {
    renderForm({ listType: 'shopping' });

    expect(screen.queryByText('supplies.notesLabel')).toBeNull();
    fireEvent.press(screen.getByText('+ supplies.addNote'));

    expect(screen.getByText('supplies.notesLabel')).toBeTruthy();
  });

  it('is open when the product being edited already has a note', () => {
    renderForm({ listType: 'inventory', item: { id: 'i1', name: 'Arroz', category: 'food', amount: 1, unit: 'kg', notes: 'Integral' } });

    expect(screen.getByText('supplies.notesLabel')).toBeTruthy();
    expect(screen.queryByText('+ supplies.addNote')).toBeNull();
  });
});

describe('the order of the fields', () => {
  it('asks for the amount before the category, since that is what is always filled in', () => {
    renderForm({ listType: 'shopping' });

    const labels = screen.getAllByText(/^supplies\.(nameLabel|amountLabel|unitLabel|categoryLabel)$/).map((node) => node.props.children);

    expect(labels).toEqual(['supplies.nameLabel', 'supplies.amountLabel', 'supplies.unitLabel', 'supplies.categoryLabel']);
  });
});
