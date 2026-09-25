import { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { describePassportMoment, MOMENT_KINDS } from '@tobeatraveller/shared';
import { useReduceMotion } from '../hooks/useReduceMotion';
import { STORY_COLORS } from './StoryCard';

const SEAL_SIZE = 176;
const CONFETTI_PIECES = 12;
const FULL_TURN_DEGREES = 360;
const CONFETTI_DISTANCE = 144;
const STAMP_DELAY_MS = 100;
const BURST_DELAY_MS = 450;
const BURST_DURATION_MS = 900;
const RISE_DELAY_MS = 550;
const RISE_DURATION_MS = 400;
const RISE_DISTANCE = 12;
const CONFETTI_COLORS = [STORY_COLORS.GOLD, '#E8743B', STORY_COLORS.PAPER];

// A new country or badge, stamped on screen the moment it's earned, with a
// shortcut to share its card from the passport. Motion is skipped when the
// user asked the system to reduce it.
const AchievementCelebration = ({ celebration, position, total, onDismiss, onShare }) => {
  const { t, i18n } = useTranslation();
  const reduceMotion = useReduceMotion();
  const stamp = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;
  const { notificationId, moment } = celebration;
  const { symbol, name } = describePassportMoment(moment, t, i18n.language);
  const title = moment.kind === MOMENT_KINDS.COUNTRY ? t('passport.celebrationCountryTitle') : t('passport.celebrationBadgeTitle');

  useEffect(() => {
    if (reduceMotion) {
      [stamp, burst, rise].forEach(value => value.setValue(1));
      return undefined;
    }
    [stamp, burst, rise].forEach(value => value.setValue(0));
    const animation = Animated.parallel([
      Animated.spring(stamp, { toValue: 1, delay: STAMP_DELAY_MS, friction: 5, tension: 90, useNativeDriver: true }),
      Animated.timing(burst, { toValue: 1, delay: BURST_DELAY_MS, duration: BURST_DURATION_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(rise, { toValue: 1, delay: RISE_DELAY_MS, duration: RISE_DURATION_MS, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [notificationId, reduceMotion, stamp, burst, rise]);

  const sealStyle = {
    opacity: stamp.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
    transform: [
      { scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [2.4, 1] }) },
      { rotate: stamp.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '-6deg'] }) },
    ],
  };
  const riseStyle = {
    opacity: rise,
    transform: [{ translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [RISE_DISTANCE, 0] }) }],
  };

  return (
    <Modal visible transparent animationType={reduceMotion ? 'none' : 'fade'} statusBarTranslucent onRequestClose={onDismiss}>
      <View style={styles.backdrop} accessibilityViewIsModal>
        <View style={styles.stage} importantForAccessibility="no-hide-descendants">
          {!reduceMotion && Array.from({ length: CONFETTI_PIECES }, (_, index) => (
            <Animated.View
              key={index}
              style={[styles.confetti, {
                backgroundColor: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
                opacity: burst.interpolate({ inputRange: [0, 0.01, 1], outputRange: [0, 1, 0] }),
                transform: [
                  { rotate: `${(FULL_TURN_DEGREES / CONFETTI_PIECES) * index}deg` },
                  { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, -CONFETTI_DISTANCE] }) },
                ],
              }]}
            />
          ))}
          <Animated.View style={[styles.seal, sealStyle]}>
            <View style={styles.sealInner} />
            <Text style={styles.symbol}>{symbol}</Text>
          </Animated.View>
        </View>

        <Animated.View style={[styles.texts, riseStyle]}>
          <Text style={styles.title} accessibilityRole="header">{title}</Text>
          <Text style={styles.name}>{name}</Text>
          {total > 1 && <Text style={styles.progress}>{t('passport.celebrationProgress', { current: position, total })}</Text>}
        </Animated.View>

        <Animated.View style={[styles.actions, riseStyle]}>
          <TouchableOpacity style={styles.shareBtn} onPress={() => onShare(celebration)} accessibilityRole="button">
            <Text style={styles.btnText}>{t('passport.celebrationShare')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.continueBtn} onPress={onDismiss} accessibilityRole="button">
            <Text style={styles.btnText}>{t('passport.celebrationContinue')}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const { NAVY, GOLD, PAPER } = STORY_COLORS;
const NAVY_LIGHT = '#2a3d5c';

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: NAVY },
  stage: { width: SEAL_SIZE, height: SEAL_SIZE, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  confetti: { position: 'absolute', width: 8, height: 14, borderRadius: 2 },
  seal: {
    width: SEAL_SIZE, height: SEAL_SIZE, borderRadius: SEAL_SIZE / 2, alignItems: 'center', justifyContent: 'center',
    backgroundColor: PAPER, borderWidth: 7, borderColor: GOLD,
  },
  sealInner: {
    position: 'absolute', top: 7, left: 7, right: 7, bottom: 7,
    borderRadius: SEAL_SIZE / 2, borderWidth: 3, borderColor: 'rgba(217, 164, 65, 0.7)',
  },
  symbol: { fontSize: 80, lineHeight: 96, textAlign: 'center' },
  texts: { alignItems: 'center', alignSelf: 'stretch' },
  title: { fontSize: 24, fontWeight: '800', color: GOLD, textAlign: 'center' },
  name: { marginTop: 6, fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' },
  progress: { marginTop: 12, fontSize: 13, color: 'rgba(255, 255, 255, 0.7)' },
  actions: { flexDirection: 'row', gap: 12, width: '100%', maxWidth: 360, marginTop: 32 },
  shareBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center', backgroundColor: '#E8743B' },
  continueBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center',
    backgroundColor: NAVY_LIGHT, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  btnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

export default AchievementCelebration;
