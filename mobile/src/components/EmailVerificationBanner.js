import { useEffect, useState } from 'react';
import { Alert, AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { resendVerificationEmail, selectMe, setUserInfo } from '@tobeatraveller/shared';

const TOO_MANY_REQUESTS_STATUS = 429;

// Only for someone whose email is known not to be confirmed: while the profile
// has not arrived the state is unknown, and a notice that blinks away is worse
// than none.
export const EmailVerificationBanner = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const navigation = useNavigation();
  const me = useSelector(selectMe);
  const [status, setStatus] = useState('idle');
  const unconfirmed = me?.emailVerified === false;

  // The link opens in the browser: coming back to the app is when it may be confirmed.
  useEffect(() => {
    if (!unconfirmed) return undefined;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') dispatch(setUserInfo(me.id));
    });
    return () => subscription.remove();
  }, [unconfirmed, me?.id, dispatch]);

  if (!unconfirmed) return null;

  const handleSend = async () => {
    setStatus('sending');
    try {
      await resendVerificationEmail();
      setStatus('sent');
    } catch (error) {
      setStatus('idle');
      Alert.alert(
        t('errors.somethingWrong'),
        t(error.status === TOO_MANY_REQUESTS_STATUS ? 'emailVerification.tooMany' : 'emailVerification.sendFailed'),
      );
    }
  };

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.text}>{t('emailVerification.bannerText', { email: me.email })}</Text>
      {status === 'sent' ? (
        <Text style={styles.sent}>{t('emailVerification.bannerSent')}</Text>
      ) : (
        <TouchableOpacity
          style={[styles.button, status === 'sending' && styles.buttonDisabled]}
          onPress={handleSend}
          disabled={status === 'sending'}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>
            {status === 'sending' ? t('emailVerification.bannerSending') : t('emailVerification.bannerSend')}
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={() => navigation.navigate('Settings')} accessibilityRole="link">
        <Text style={styles.changeLink}>{t('emailVerification.changeLink')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#fff7ed', borderBottomWidth: 1, borderBottomColor: '#fed7aa',
    paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center', gap: 8,
  },
  text: { color: '#9a3412', fontSize: 13, textAlign: 'center' },
  sent: { color: '#9a3412', fontSize: 13, fontWeight: '700' },
  button: { borderWidth: 1.5, borderColor: '#9a3412', borderRadius: 999, paddingVertical: 5, paddingHorizontal: 16 },
  changeLink: { color: '#9a3412', fontSize: 12, textDecorationLine: 'underline' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#9a3412', fontSize: 12, fontWeight: '700' },
});
