import { clearOutbox } from '../offline/outbox';
import { cacheClearAll } from './offlineCache';
import { unregisterCurrentPushToken } from './pushNotifications';

// Runs while the session is still valid (the push token needs it), right
// before logging out or after deleting the account.
export const clearDeviceSessionData = async () => {
  await unregisterCurrentPushToken();
  await Promise.all([clearOutbox(), cacheClearAll()]);
};
