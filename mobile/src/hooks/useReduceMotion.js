import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export const useReduceMotion = () => {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription?.remove();
  }, []);

  return reduceMotion;
};
