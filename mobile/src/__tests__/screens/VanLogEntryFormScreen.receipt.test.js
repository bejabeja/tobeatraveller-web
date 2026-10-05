jest.mock('react-redux', () => ({
  useSelector: (selector) => selector(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('../../hooks/useCurrentLocation', () => ({
  useCurrentLocation: () => ({ getCurrentLocation: jest.fn(), getLocationIfPermitted: jest.fn(), loading: false }),
}));

jest.mock('../../components/DateField', () => 'DateField');
jest.mock('../../components/UseCurrentLocationButton', () => ({ UseCurrentLocationButton: () => null }));

jest.mock('../../offline/outbox', () => ({
  newEntityId: () => 'new-entry-id',
  runOrQueue: jest.fn(),
}));

// The real barrel drags in the shared Redux store (ESM-only immer), so the
// pieces the screen needs are taken from their own source files instead.
jest.mock('@tobeatraveller/shared', () => {
  const constants = jest.requireActual('../../../../shared/src/utils/constants/constants.js');
  const schemas = jest.requireActual('../../../../shared/src/utils/schemasValidation.js');
  const packingLists = jest.requireActual('../../../../shared/src/utils/packingLists.js');
  const nextTrip = jest.requireActual('../../../../shared/src/utils/nextTrip.js');
  return {
    vanLogCategories: constants.vanLogCategories,
    vanLogCategoryEmoji: constants.vanLogCategoryEmoji,
    vanLogCommonCurrencies: constants.vanLogCommonCurrencies,
    vanLogEntrySchema: schemas.vanLogEntrySchema,
    tripsToLinkTo: packingLists.tripsToLinkTo,
    localCalendarDay: nextTrip.localCalendarDay,
    reverseGeocode: jest.fn(),
    searchDestinations: jest.fn(),
    selectMyItineraries: jest.fn(() => []),
    uploadVanLogReceiptPhoto: jest.fn(),
    removeVanLogReceiptPhoto: jest.fn(),
  };
});

import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { removeVanLogReceiptPhoto, selectMyItineraries, uploadVanLogReceiptPhoto } from '@tobeatraveller/shared';
import { runOrQueue } from '../../offline/outbox';
import VanLogEntryFormScreen from '../../screens/vanLog/VanLogEntryFormScreen';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const existingEntry = {
  id: 'entry-1',
  category: 'fuel',
  title: 'Diesel',
  amount: 40,
  currency: 'EUR',
  entryDate: '2026-09-01',
  receiptPhotoUrl: 'https://cdn.example.com/receipt.jpg',
  itinerary: { id: 'trip-1', title: 'Portugal' },
};

const renderForm = (entry) => {
  const navigation = { goBack: jest.fn(), addListener: jest.fn(() => jest.fn()) };
  render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <VanLogEntryFormScreen navigation={navigation} route={{ params: entry ? { entry } : {} }} />
    </SafeAreaProvider>
  );
  return navigation;
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  runOrQueue.mockResolvedValue({ queued: false });
  selectMyItineraries.mockReturnValue([]);
  ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValue({ status: 'granted' });
});

describe('VanLogEntryFormScreen receipt photo', () => {
  it('removes the stored photo on the server after saving when the user cleared it', async () => {
    const navigation = renderForm(existingEntry);

    fireEvent.press(screen.getByLabelText('vanLog.removeReceiptPhoto'));
    fireEvent.press(screen.getByText('common.save'));

    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    expect(removeVanLogReceiptPhoto).toHaveBeenCalledWith('entry-1');
  });

  it('uploads a newly picked photo for the saved entry', async () => {
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///tmp/ticket.png' }] });
    const navigation = renderForm({ ...existingEntry, receiptPhotoUrl: null });

    fireEvent.press(screen.getByText('📷 vanLog.addReceiptPhoto'));
    await waitFor(() => expect(screen.getByLabelText('vanLog.removeReceiptPhoto')).toBeTruthy());
    fireEvent.press(screen.getByText('common.save'));

    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    expect(uploadVanLogReceiptPhoto).toHaveBeenCalledWith('entry-1', {
      uri: 'file:///tmp/ticket.png', name: 'ticket.png', type: 'image/png',
    });
  });

  it('does not touch the photo endpoints when the entry was queued offline, and tells the user', async () => {
    runOrQueue.mockResolvedValue({ queued: true });
    ImagePicker.launchImageLibraryAsync.mockResolvedValue({ canceled: false, assets: [{ uri: 'file:///tmp/ticket.jpg' }] });
    const navigation = renderForm({ ...existingEntry, receiptPhotoUrl: null });

    fireEvent.press(screen.getByText('📷 vanLog.addReceiptPhoto'));
    await waitFor(() => expect(screen.getByLabelText('vanLog.removeReceiptPhoto')).toBeTruthy());
    fireEvent.press(screen.getByText('common.save'));

    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    expect(uploadVanLogReceiptPhoto).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('vanLog.receiptPhotoNeedsConnection');
  });

  it('does not call the photo endpoints when the photo was left untouched', async () => {
    const navigation = renderForm(existingEntry);

    fireEvent.press(screen.getByText('common.save'));

    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    expect(uploadVanLogReceiptPhoto).not.toHaveBeenCalled();
    expect(removeVanLogReceiptPhoto).not.toHaveBeenCalled();
  });
});

describe('VanLogEntryFormScreen trip', () => {
  it('saves the trip picked from the chips as itineraryId', async () => {
    selectMyItineraries.mockReturnValue([{ id: 'trip-2', title: 'Alps', startDate: null, endDate: null }]);
    const navigation = renderForm({ ...existingEntry, itinerary: null });

    fireEvent.press(screen.getByText('Alps'));
    fireEvent.press(screen.getByText('common.save'));

    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    expect(runOrQueue).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ itineraryId: 'trip-2' }),
    }));
  });

  it('sends itineraryId null when the user unlinks the entry from its trip', async () => {
    selectMyItineraries.mockReturnValue([{ id: 'trip-1', title: 'Portugal', startDate: null, endDate: null }]);
    const navigation = renderForm(existingEntry);

    fireEvent.press(screen.getByText('vanLog.noTrip'));
    fireEvent.press(screen.getByText('common.save'));

    await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
    expect(runOrQueue).toHaveBeenCalledWith(expect.objectContaining({
      payload: expect.objectContaining({ itineraryId: null }),
    }));
  });
});
