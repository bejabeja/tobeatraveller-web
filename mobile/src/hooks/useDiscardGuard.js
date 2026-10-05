import { useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

// Asks before leaving a form with unsaved changes, however they leave: the
// screen's own back button, the system back button of Android or the swipe of
// iOS. `leaveWithoutAsking` is for a screen that has just saved and goes back.
export const useDiscardGuard = (navigation, hasUnsavedChanges) => {
  const { t } = useTranslation();
  const isLeavingRef = useRef(false);

  useEffect(() => navigation.addListener('beforeRemove', (event) => {
    if (!hasUnsavedChanges || isLeavingRef.current) return;
    event.preventDefault();
    Alert.alert(t('editProfile.discardChanges'), t('editProfile.discardChangesDesc'), [
      { text: t('editProfile.keepEditing'), style: 'cancel' },
      { text: t('editProfile.discard'), style: 'destructive', onPress: () => navigation.dispatch(event.data.action) },
    ]);
  }), [navigation, hasUnsavedChanges, t]);

  return useCallback(() => { isLeavingRef.current = true; }, []);
};
