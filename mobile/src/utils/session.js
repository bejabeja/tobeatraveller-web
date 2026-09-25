import { clearOutbox } from '../offline/outbox';
import { resetAnalytics } from './analytics';
import { cacheClearAll } from './offlineCache';
import { unregisterCurrentPushToken } from './pushNotifications';

// Runs while the session is still valid (the push token needs it), right
// before logging out or after deleting the account. The next person on this
// phone mustn't be measured as the previous one.
export const clearDeviceSessionData = async () => {
  await unregisterCurrentPushToken();
  resetAnalytics();
  await Promise.all([clearOutbox(), cacheClearAll()]);
};
