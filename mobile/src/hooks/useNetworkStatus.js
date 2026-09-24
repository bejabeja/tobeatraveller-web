import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

// Only an explicit false means offline (null is "still checking"). Wifi with
// no internet behind it (common at campsites) counts as offline too.
export const isOnlineNetState = (netState) =>
  netState.isConnected !== false && netState.isInternetReachable !== false;

export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    return NetInfo.addEventListener((state) => {
      setIsConnected(isOnlineNetState(state));
    });
  }, []);

  return { isConnected };
};
