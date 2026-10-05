jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key) => key }) }));

import { Alert } from 'react-native';
import { renderHook } from '@testing-library/react-native';
import { useDiscardGuard } from '../../hooks/useDiscardGuard';

const makeNavigation = () => {
  const listeners = {};
  return {
    addListener: jest.fn((name, listener) => { listeners[name] = listener; return jest.fn(); }),
    dispatch: jest.fn(),
    leave: (action = { type: 'GO_BACK' }) => {
      const event = { preventDefault: jest.fn(), data: { action } };
      listeners.beforeRemove(event);
      return event;
    },
  };
};

beforeEach(() => jest.spyOn(Alert, 'alert').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe('useDiscardGuard', () => {
  it('lets them leave a form they did not touch', () => {
    const navigation = makeNavigation();
    renderHook(() => useDiscardGuard(navigation, false));

    const event = navigation.leave();

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  // Regression: only the screen's own back button asked, so the system back button and the iOS swipe threw the text away.
  it('stops any way of leaving a form with changes, and asks first', () => {
    const navigation = makeNavigation();
    renderHook(() => useDiscardGuard(navigation, true));

    const event = navigation.leave();

    expect(event.preventDefault).toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('editProfile.discardChanges', 'editProfile.discardChangesDesc', expect.any(Array));
  });

  it('leaves, doing what was asked, once they choose to discard', () => {
    const navigation = makeNavigation();
    renderHook(() => useDiscardGuard(navigation, true));
    const action = { type: 'POP' };

    navigation.leave(action);
    Alert.alert.mock.calls[0][2].find((button) => button.style === 'destructive').onPress();

    expect(navigation.dispatch).toHaveBeenCalledWith(action);
  });

  it('does not ask after saving, when the screen goes back by itself', () => {
    const navigation = makeNavigation();
    const { result } = renderHook(() => useDiscardGuard(navigation, true));

    result.current();
    const event = navigation.leave();

    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
