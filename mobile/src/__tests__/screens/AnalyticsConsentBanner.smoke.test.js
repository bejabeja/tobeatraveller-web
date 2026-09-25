jest.mock('react-i18next', () => {
  const t = (key) => key;
  return { useTranslation: () => ({ t }) };
});
jest.mock('@tobeatraveller/shared', () => jest.requireActual('../../../../shared/src/utils/analyticsEvents.js'));
jest.mock('../../utils/config', () => ({ POSTHOG_KEY: '', POSTHOG_HOST: '' }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AnalyticsConsentBanner from '../../components/AnalyticsConsentBanner';

const INITIAL_METRICS = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } };

const renderBanner = async (props = {}) => {
  render(
    <SafeAreaProvider initialMetrics={INITIAL_METRICS}>
      <AnalyticsConsentBanner onLearnMore={jest.fn()} {...props} />
    </SafeAreaProvider>
  );
  await act(async () => {});
};

beforeEach(async () => {
  await AsyncStorage.clear();
});

it('asks once, until the person answers', async () => {
  await renderBanner();
  expect(screen.getByText('analyticsConsent.description', { exact: false })).toBeTruthy();

  await act(async () => { fireEvent.press(screen.getByText('cookieConsent.decline')); });

  expect(screen.queryByText('analyticsConsent.description', { exact: false })).toBeNull();
  expect(await AsyncStorage.getItem('analytics_consent')).toBe('denied');
});

it('remembers the answer on the next launch', async () => {
  await AsyncStorage.setItem('analytics_consent', 'granted');

  await renderBanner();

  expect(screen.queryByText('cookieConsent.accept')).toBeNull();
});

it('links to the privacy policy', async () => {
  const onLearnMore = jest.fn();
  await renderBanner({ onLearnMore });

  fireEvent.press(screen.getByText('cookieConsent.learnMore'));

  expect(onLearnMore).toHaveBeenCalled();
});
