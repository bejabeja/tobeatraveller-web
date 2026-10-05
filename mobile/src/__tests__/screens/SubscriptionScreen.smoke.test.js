let mockUser = { id: 'user-1', isPremium: false, isTrialEligible: true };

jest.mock('@react-navigation/native', () => {
  const { useEffect } = jest.requireActual('react');
  return { useFocusEffect: (callback) => { useEffect(() => callback(), [callback]); } };
});
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({ useSelector: (selector) => selector(), useDispatch: () => mockDispatch }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key, vars) => (vars?.count !== undefined ? `${key}:${vars.count}` : vars?.date ? `${key}:${vars.date}` : key), i18n: { language: 'es' } }),
}));
jest.mock('@tobeatraveller/shared', () => ({
  ...jest.requireActual('../../../../shared/src/utils/constants/premiumFeatures.js'),
  ...jest.requireActual('../../../../shared/src/utils/constants/subscriptionFaq.js'),
  ...jest.requireActual('../../../../shared/src/utils/formatLocale.js'),
  ...jest.requireActual('../../../../shared/src/utils/subscriptionView.js'),
  ...jest.requireActual('../../../../shared/src/utils/analyticsEvents.js'),
  selectIsAuthenticated: () => true,
  selectMe: () => mockUser,
  selectAuthUser: () => mockUser,
  createCheckoutSession: jest.fn(),
  createPortalSession: jest.fn(),
  getMySubscription: jest.fn(),
  resumeSubscription: jest.fn(),
  setUserInfo: jest.fn(),
}));

jest.mock('../../utils/analytics', () => ({ trackEvent: jest.fn() }));

import { AppState, Linking } from 'react-native';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { createCheckoutSession, createPortalSession, formatDate, getMySubscription } from '@tobeatraveller/shared';
import { trackEvent } from '../../utils/analytics';
import SubscriptionScreen from '../../screens/subscription/SubscriptionScreen';

// A new element each time: React skips re-rendering the very same one.
const screenElement = () => <SubscriptionScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() }} />;
const renderScreen = () => render(screenElement());
const eventsNamed = (name) => trackEvent.mock.calls.filter(([event]) => event === name);

beforeEach(() => {
  mockUser = { id: 'user-1', isPremium: false, isTrialEligible: true };
});

// Either plan starts with the free trial the first time.
it('offers the free trial on both plans to someone who never subscribed', () => {
  renderScreen();

  expect(screen.getAllByText('subscription.ctaStartTrial')).toHaveLength(2);
});

it('offers to subscribe once the trial has been used', () => {
  mockUser = { ...mockUser, isTrialEligible: false };
  renderScreen();

  // The two plans and the top button.
  expect(screen.getAllByText('subscription.ctaSubscribe')).toHaveLength(3);
});

// Regression: the top button said "free trial" to everyone, including whoever had already used it.
it('does not promise a free trial in the top button once it has been used', () => {
  mockUser = { ...mockUser, isTrialEligible: false };
  renderScreen();

  expect(screen.queryByText('subscription.ctaFreeTrial')).toBeNull();
  expect(screen.queryByText('subscription.trialNoCard')).toBeNull();
});

it('offers the free trial in the top button, and says no card is needed, to someone who can still have it', () => {
  renderScreen();

  expect(screen.getByText('subscription.ctaFreeTrial')).toBeTruthy();
  expect(screen.getByText('subscription.trialNoCard')).toBeTruthy();
});

// The tools free accounts can use a little show their limit, not "Premium".
it('compares the plans with the free limits', () => {
  renderScreen();

  expect(screen.getAllByText('subscription.compareUpTo:10')).toHaveLength(3);
  // The packing lists are free up to two lists.
  expect(screen.getByText('subscription.compareUpTo:2')).toBeTruthy();
  expect(screen.getAllByText('subscription.compareUnlimited')).toHaveLength(4);
  expect(screen.getByText('subscription.featurePackingChecklistTitle')).toBeTruthy();
  expect(screen.queryByText('subscription.featureNoAdsTitle')).toBeNull();
});

describe('when the user is Premium', () => {
  const IN_TWO_WEEKS = new Date(Date.now() + 14 * 86400000).toISOString();
  const date = (iso) => formatDate(iso, 'es');
  const paidSubscription = (overrides = {}) => ({ status: 'active', currentPeriodEnd: IN_TWO_WEEKS, cancelAtPeriodEnd: false, ...overrides });
  const renderPremium = async (subscription) => {
    mockUser = { id: 'user-1', isPremium: true, premiumUntil: IN_TWO_WEEKS };
    getMySubscription.mockResolvedValue(subscription);
    renderScreen();
    await act(async () => {});
  };

  beforeEach(() => jest.clearAllMocks());

  it('is not sold Premium again: the screen is about their subscription, not the pitch', async () => {
    await renderPremium(paidSubscription());

    expect(screen.getByText('subscription.yourPremiumTitle')).toBeTruthy();
    expect(screen.queryByText('subscription.subtitle')).toBeNull();
    expect(screen.queryByText('subscription.ctaFreeTrial')).toBeNull();
  });

  it('tells a paying customer when the subscription renews, and lets them manage it', async () => {
    await renderPremium(paidSubscription());

    expect(screen.getByText(`subscription.renewsOn:${date(IN_TWO_WEEKS)}`)).toBeTruthy();
    expect(screen.getByText('subscription.manageLink')).toBeTruthy();
  });

  // Regression: Premium that came as a gift or a referral reward has no Stripe
  // customer, so the billing portal failed for it.
  it('offers no billing to someone whose Premium is a gift, and says until when they have it', async () => {
    await renderPremium(null);

    expect(screen.getByText(`subscription.premiumUntilDesc:${date(IN_TWO_WEEKS)}`)).toBeTruthy();
    expect(screen.queryByText('subscription.manageLink')).toBeNull();
    expect(createPortalSession).not.toHaveBeenCalled();
  });

  it('keeps the way to billing when the subscription could not be read', async () => {
    mockUser = { id: 'user-1', isPremium: true, premiumUntil: IN_TWO_WEEKS };
    getMySubscription.mockRejectedValue(new Error('offline'));
    renderScreen();
    await act(async () => {});

    expect(screen.getByText('subscription.manageLink')).toBeTruthy();
  });

  it('shows a canceled subscription as ending, not as the green confirmation, with the way back', async () => {
    await renderPremium(paidSubscription({ cancelAtPeriodEnd: true }));

    expect(screen.getByText('subscription.canceledTitle')).toBeTruthy();
    expect(screen.queryByText('subscription.alreadyPremiumTitle')).toBeNull();
    expect(screen.getByText('subscription.ctaResume')).toBeTruthy();
  });

  it('shows the failed payment, and never the reassuring state first', async () => {
    let resolveSubscription;
    getMySubscription.mockReturnValue(new Promise((resolve) => { resolveSubscription = resolve; }));
    mockUser = { id: 'user-1', isPremium: true, premiumUntil: IN_TWO_WEEKS };
    renderScreen();

    expect(screen.queryByText('subscription.alreadyPremiumTitle')).toBeNull();
    expect(screen.queryByText('subscription.manageLink')).toBeNull();

    await act(async () => { resolveSubscription(paidSubscription({ status: 'past_due' })); });

    expect(screen.getByText('subscription.paymentFailedTitle')).toBeTruthy();
    expect(screen.queryByText('subscription.alreadyPremiumTitle')).toBeNull();
  });
});

describe('coming back from the browser after paying', () => {
  let appStateHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUser = { id: 'user-1', isPremium: false, isTrialEligible: true };
    createCheckoutSession.mockResolvedValue({ url: 'https://checkout.example/pay' });
    jest.spyOn(Linking, 'openURL').mockResolvedValue();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((event, handler) => {
      appStateHandler = handler;
      return { remove: jest.fn() };
    });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const payAndComeBack = async () => {
    renderScreen();
    await act(async () => { fireEvent.press(screen.getAllByText('subscription.ctaStartTrial')[0]); });
    act(() => { appStateHandler('active'); });
  };

  it('says the Premium is being activated instead of showing the plans again', async () => {
    await payAndComeBack();

    expect(screen.getByText('subscription.activatingTitle')).toBeTruthy();
    expect(screen.queryByText('subscription.ctaStartTrial')).toBeNull();
  });

  it('keeps asking for the user while the webhook is late', async () => {
    await payAndComeBack();
    const askedOnReturn = mockDispatch.mock.calls.length;

    act(() => { jest.advanceTimersByTime(8000); });

    expect(mockDispatch.mock.calls.length).toBe(askedOnReturn + 3);
  });

  // Regression: the plans came back after the wait, inviting someone who had
  // just paid to pay again.
  it('says it is late instead of selling Premium again if the activation never arrives', async () => {
    await payAndComeBack();
    expect(screen.getByText('subscription.activatingTitle')).toBeTruthy();

    act(() => { jest.advanceTimersByTime(13000); });

    expect(screen.getByText('subscription.activationDelayedTitle')).toBeTruthy();
    expect(screen.queryByText('subscription.activatingTitle')).toBeNull();
    expect(screen.queryByText('subscription.ctaStartTrial')).toBeNull();
  });

  it('waits and asks for the user again when checking again', async () => {
    await payAndComeBack();
    act(() => { jest.advanceTimersByTime(13000); });
    const askedBefore = mockDispatch.mock.calls.length;

    act(() => { fireEvent.press(screen.getByText('subscription.activationDelayedCta')); });

    expect(mockDispatch.mock.calls.length).toBe(askedBefore + 1);
    expect(screen.getByText('subscription.activatingTitle')).toBeTruthy();
  });

  it('does not say it when the user simply returns to the app without having paid', async () => {
    renderScreen();

    act(() => { appStateHandler('active'); });

    expect(screen.queryByText('subscription.activatingTitle')).toBeNull();
  });
});

describe('analytics', () => {
  let appStateHandler;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, callback) => {
      appStateHandler = callback;
      return { remove: jest.fn() };
    });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const payAndComeBack = async () => {
    renderScreen();
    createCheckoutSession.mockResolvedValue({ url: 'https://checkout.stripe.com/x' });
    jest.spyOn(Linking, 'openURL').mockResolvedValue();
    await act(async () => { fireEvent.press(screen.getAllByText('subscription.ctaStartTrial')[0]); });
    act(() => { appStateHandler('active'); });
  };

  it('records which state the screen was seen in, once', () => {
    const { rerender } = renderScreen();
    rerender(screenElement());

    expect(eventsNamed('subscription_page_viewed')).toEqual([['subscription_page_viewed', { view: 'plans' }]]);
  });

  it('records when the activation runs late', async () => {
    await payAndComeBack();

    act(() => { jest.advanceTimersByTime(13000); });

    expect(eventsNamed('activation_delayed')).toHaveLength(1);
  });

  it('records that the payment went through once Premium arrives', async () => {
    getMySubscription.mockResolvedValue({ status: 'trialing', currentPeriodEnd: new Date(Date.now() + 7 * 86400000).toISOString(), cancelAtPeriodEnd: false });
    const { rerender } = render(screenElement());
    createCheckoutSession.mockResolvedValue({ url: 'https://checkout.stripe.com/x' });
    jest.spyOn(Linking, 'openURL').mockResolvedValue();
    await act(async () => { fireEvent.press(screen.getAllByText('subscription.ctaStartTrial')[0]); });
    act(() => { appStateHandler('active'); });

    mockUser = { id: 'user-1', isPremium: true };
    await act(async () => { rerender(screenElement()); });
    await act(async () => { rerender(screenElement()); });

    expect(eventsNamed('checkout_completed')).toHaveLength(1);
  });

  it('does not record a completed checkout for someone who was already Premium', async () => {
    mockUser = { id: 'user-1', isPremium: true };
    getMySubscription.mockResolvedValue(null);
    renderScreen();
    await act(async () => {});

    expect(eventsNamed('checkout_completed')).toHaveLength(0);
  });
});

describe('deciding whether to subscribe', () => {
  it('shows what the yearly plan costs per month, only on the yearly plan', () => {
    renderScreen();

    expect(screen.getAllByText('subscription.annualPerMonth')).toHaveLength(1);
  });

  // The answers state what the API does (a trial with no card that ends by
  // canceling), so they have to stay on the screen.
  it('answers the doubts that hold people back, one tap away', () => {
    renderScreen();

    expect(screen.getByText('subscription.faqTitle')).toBeTruthy();
    expect(screen.getByText('subscription.faqTrialQuestion')).toBeTruthy();
    expect(screen.queryByText('subscription.faqTrialAnswer')).toBeNull();

    fireEvent.press(screen.getByText('subscription.faqTrialQuestion'));
    expect(screen.getByText('subscription.faqTrialAnswer')).toBeTruthy();

    fireEvent.press(screen.getByText('subscription.faqTrialQuestion'));
    expect(screen.queryByText('subscription.faqTrialAnswer')).toBeNull();
  });

  it('does not pitch the FAQ to someone who is already Premium', async () => {
    mockUser = { id: 'user-1', isPremium: true };
    getMySubscription.mockResolvedValue(null);
    renderScreen();
    await act(async () => {});

    expect(screen.queryByText('subscription.faqTitle')).toBeNull();
  });
});

describe('right after Premium is activated', () => {
  let appStateHandler;
  const navigate = jest.fn();
  const element = () => <SubscriptionScreen navigation={{ navigate, goBack: jest.fn() }} />;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, callback) => {
      appStateHandler = callback;
      return { remove: jest.fn() };
    });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const payAndBecomePremium = async () => {
    getMySubscription.mockResolvedValue({ status: 'trialing', currentPeriodEnd: new Date(Date.now() + 7 * 86400000).toISOString(), cancelAtPeriodEnd: false });
    const { rerender } = render(element());
    createCheckoutSession.mockResolvedValue({ url: 'https://checkout.stripe.com/x' });
    jest.spyOn(Linking, 'openURL').mockResolvedValue();
    await act(async () => { fireEvent.press(screen.getAllByText('subscription.ctaStartTrial')[0]); });
    act(() => { appStateHandler('active'); });

    mockUser = { id: 'user-1', isPremium: true };
    await act(async () => { rerender(element()); });
    await act(async () => { rerender(element()); });
  };

  it('welcomes the new subscriber and points to what to try first', async () => {
    await payAndBecomePremium();

    expect(screen.getByText('subscription.welcomeTitle')).toBeTruthy();
    fireEvent.press(screen.getByText('subscription.featureAiItineraries'));
    expect(navigate).toHaveBeenCalledWith('CreateItinerary');
    fireEvent.press(screen.getByText('subscription.featurePackingChecklistTitle'));
    expect(navigate).toHaveBeenCalledWith('PackingChecklist');
    fireEvent.press(screen.getByText('subscription.featureVanLogTitle'));
    expect(navigate).toHaveBeenCalledWith('VanLog');
  });

  it('does not welcome someone who was already Premium when they opened the screen', async () => {
    mockUser = { id: 'user-1', isPremium: true };
    getMySubscription.mockResolvedValue(null);
    render(element());
    await act(async () => {});

    expect(screen.queryByText('subscription.welcomeTitle')).toBeNull();
  });
});

describe('coming back to the app', () => {
  let appStateHandler;
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, callback) => {
      appStateHandler = callback;
      return { remove: jest.fn() };
    });
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  const IN_TWO_WEEKS = new Date(Date.now() + 14 * 86400000).toISOString();
  const paid = (overrides = {}) => ({ status: 'active', currentPeriodEnd: IN_TWO_WEEKS, cancelAtPeriodEnd: false, ...overrides });

  // Regression: the subscription was only read when the screen gained focus,
  // so after canceling in the Stripe portal the screen kept saying "renews".
  it('shows a cancellation made in the billing portal, without leaving the screen', async () => {
    mockUser = { id: 'user-1', isPremium: true, premiumUntil: IN_TWO_WEEKS };
    getMySubscription.mockResolvedValue(paid());
    renderScreen();
    await act(async () => {});
    expect(screen.queryByText('subscription.canceledTitle')).toBeNull();

    getMySubscription.mockResolvedValue(paid({ cancelAtPeriodEnd: true }));
    await act(async () => { appStateHandler('active'); });

    expect(screen.getByText('subscription.canceledTitle')).toBeTruthy();
  });

  // Regression: closing the Checkout browser without paying left the screen on
  // "It's taking longer than usual" with no way back to the plans.
  it('lets someone who did not pay go back to the plans from the late activation notice', async () => {
    createCheckoutSession.mockResolvedValue({ url: 'https://checkout.stripe.com/x' });
    jest.spyOn(Linking, 'openURL').mockResolvedValue();
    renderScreen();
    await act(async () => { fireEvent.press(screen.getAllByText('subscription.ctaStartTrial')[0]); });
    act(() => { appStateHandler('active'); });
    act(() => { jest.advanceTimersByTime(13000); });
    expect(screen.getByText('subscription.activationDelayedTitle')).toBeTruthy();

    fireEvent.press(screen.getByText('subscription.activationDelayedBack'));

    expect(screen.getAllByText('subscription.ctaStartTrial')).toHaveLength(2);
    expect(screen.queryByText('subscription.activationDelayedTitle')).toBeNull();
  });
});

describe('choosing between the free trial and paying right away', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createCheckoutSession.mockResolvedValue({ url: 'https://checkout.stripe.com/x' });
    jest.spyOn(Linking, 'openURL').mockResolvedValue();
  });
  afterEach(() => jest.restoreAllMocks());

  it('offers to subscribe now, without the trial, on each plan', () => {
    renderScreen();

    expect(screen.getAllByText('subscription.ctaSubscribeNow')).toHaveLength(2);
  });

  it('starts the trial from the main button', async () => {
    renderScreen();

    await act(async () => { fireEvent.press(screen.getAllByText('subscription.ctaStartTrial')[0]); });

    expect(createCheckoutSession).toHaveBeenCalledWith('monthly', { startTrial: true });
  });

  it('skips the trial for someone who prefers to pay now, and records which way they chose', async () => {
    renderScreen();

    await act(async () => { fireEvent.press(screen.getAllByText('subscription.ctaSubscribeNow')[1]); });

    expect(createCheckoutSession).toHaveBeenCalledWith('annual', { startTrial: false });
    expect(trackEvent).toHaveBeenCalledWith('checkout_started', { plan: 'annual', trial: false });
  });

  // Regression: the API can answer a Subscribe with the billing portal (a
  // payment is pending on a subscription that is still alive); it was counted as a
  // checkout that never happened, and the screen then waited for an activation.
  it('does not count as a checkout, nor wait for an activation, what was sent to the billing portal', async () => {
    createCheckoutSession.mockResolvedValue({ url: 'https://billing.stripe.com/x', kind: 'billing_portal' });
    renderScreen();

    await act(async () => { fireEvent.press(screen.getAllByText('subscription.ctaStartTrial')[0]); });

    expect(trackEvent).not.toHaveBeenCalledWith('checkout_started', expect.anything());
    expect(trackEvent).toHaveBeenCalledWith('subscription_portal_opened', { view: 'plans' });
  });

  it('blocks every button while a checkout is starting', async () => {
    createCheckoutSession.mockReturnValue(new Promise(() => {}));
    renderScreen();

    await act(async () => { fireEvent.press(screen.getAllByText('subscription.ctaStartTrial')[0]); });
    fireEvent.press(screen.getAllByText('subscription.ctaSubscribeNow')[1]);

    expect(createCheckoutSession).toHaveBeenCalledTimes(1);
  });

  it('does not offer it to someone who has no trial to skip', () => {
    mockUser = { ...mockUser, isTrialEligible: false };
    renderScreen();

    expect(screen.queryByText('subscription.ctaSubscribeNow')).toBeNull();
  });
});

// The customer gives up the right of withdrawal only by asking for the service to
// start right away and acknowledging it, and that is asked on the Stripe page,
// next to the payment button: this screen adds no step of its own.
describe('consent to start right away', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    createCheckoutSession.mockResolvedValue({ url: 'https://checkout.stripe.com/x' });
    jest.spyOn(Linking, 'openURL').mockResolvedValue();
  });
  afterEach(() => jest.restoreAllMocks());

  it('keeps the screen about the plans, with no checkbox', () => {
    render(<SubscriptionScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() }} />);

    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('goes straight to the payment when choosing to pay, with no step in between', async () => {
    render(<SubscriptionScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() }} />);

    await act(async () => { fireEvent.press(screen.getAllByText('subscription.ctaSubscribeNow')[1]); });

    expect(createCheckoutSession).toHaveBeenCalledWith('annual', { startTrial: false });
    expect(Linking.openURL).toHaveBeenCalledWith('https://checkout.stripe.com/x');
  });

  it('does the same for someone with no trial left, who is charged right away', async () => {
    mockUser = { ...mockUser, isTrialEligible: false };
    render(<SubscriptionScreen navigation={{ navigate: jest.fn(), goBack: jest.fn() }} />);

    await act(async () => { fireEvent.press(screen.getAllByText('subscription.ctaSubscribe')[1]); });

    expect(createCheckoutSession).toHaveBeenCalledWith('monthly', { startTrial: true });
  });
});
