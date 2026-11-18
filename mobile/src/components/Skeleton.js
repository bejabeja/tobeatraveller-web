import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

// ─── Base hook ────────────────────────────────────────────────────────────────
export const usePulse = () => {
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1,   duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 750, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return opacity;
};

// ─── Base box ─────────────────────────────────────────────────────────────────
export const SkeletonBox = ({ style }) => {
  const opacity = usePulse();
  return <Animated.View style={[sk.box, style, { opacity }]} />;
};

// ─── Itinerary card skeleton ──────────────────────────────────────────────────
export const ItineraryCardSkeleton = () => {
  const opacity = usePulse();
  return <Animated.View style={[sk.itinCard, { opacity }]} />;
};

// ─── User card skeleton (Community grid) ─────────────────────────────────────
export const UserCardSkeleton = () => {
  const opacity = usePulse();
  return (
    <Animated.View style={[sk.card, { opacity }]}>
      <View style={sk.userBanner} />
      <View style={sk.userAvatarWrapper}>
        <View style={sk.userAvatar} />
      </View>
      <View style={[sk.cardBody, { alignItems: 'center' }]}>
        <View style={[sk.line, { width: '70%', height: 12, marginBottom: 6 }]} />
        <View style={[sk.line, { width: '85%', height: 10, marginBottom: 6 }]} />
        <View style={[sk.line, { width: '55%', height: 10, marginBottom: 10 }]} />
        <View style={[sk.followBtnSk, { alignSelf: 'stretch' }]} />
      </View>
    </Animated.View>
  );
};

// ─── User row skeleton (Follows list) ────────────────────────────────────────
export const UserRowSkeleton = () => {
  const opacity = usePulse();
  return (
    <Animated.View style={[sk.userRow, { opacity }]}>
      <View style={sk.rowAvatar} />
      <View style={{ flex: 1, gap: 7 }}>
        <View style={[sk.line, { width: '55%', height: 13 }]} />
        <View style={[sk.line, { width: '35%', height: 11 }]} />
      </View>
      <View style={sk.followBtnSkSmall} />
    </Animated.View>
  );
};

// ─── Horizontal user avatar skeleton (Home "People") ─────────────────────────
export const UserAvatarSkeleton = () => {
  const opacity = usePulse();
  return (
    <Animated.View style={[sk.userAvatarItem, { opacity }]}>
      <View style={sk.avatarCircle} />
      <View style={[sk.line, { width: 60, height: 10, marginTop: 6 }]} />
    </Animated.View>
  );
};

// ─── Profile header skeleton ──────────────────────────────────────────────────
export const ProfileSkeleton = () => {
  const opacity = usePulse();
  return (
    <Animated.View style={{ opacity }}>
      {/* Banner */}
      <View style={sk.profileBanner} />
      {/* Card */}
      <View style={sk.profileCard}>
        <View style={sk.profileCardTop}>
          <View style={sk.profileAvatar} />
          <View style={sk.profileBtnSk} />
        </View>
        <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>
          <View style={[sk.line, { width: '40%', height: 18 }]} />
          <View style={[sk.line, { width: '30%', height: 13 }]} />
          <View style={[sk.line, { width: '75%', height: 12, marginTop: 4 }]} />
          <View style={[sk.line, { width: '60%', height: 12 }]} />
          <View style={sk.profileStats}>
            {[1, 2, 3].map(i => (
              <View key={i} style={sk.profileStat}>
                <View style={[sk.line, { width: 32, height: 18, marginBottom: 4 }]} />
                <View style={[sk.line, { width: 50, height: 10 }]} />
              </View>
            ))}
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

// ─── Itinerary detail skeleton ────────────────────────────────────────────────
export const ItineraryDetailSkeleton = () => {
  const opacity = usePulse();
  return (
    <Animated.View style={{ opacity }}>
      <View style={sk.detailHero} />
      <View style={sk.detailBody}>
        {/* Stats */}
        <View style={sk.detailStatsRow}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={sk.detailStatCard}>
              <View style={[sk.line, { width: 22, height: 22, borderRadius: 4, marginBottom: 6 }]} />
              <View style={[sk.line, { width: '70%', height: 10, marginBottom: 4 }]} />
              <View style={[sk.line, { width: '90%', height: 13 }]} />
            </View>
          ))}
        </View>
        {/* Places */}
        <View style={[sk.line, { width: '40%', height: 16, marginBottom: 14 }]} />
        {[1, 2, 3].map(i => (
          <View key={i} style={sk.detailPlaceRow}>
            <View style={sk.detailPlaceNum} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={[sk.line, { width: '65%', height: 13 }]} />
              <View style={[sk.line, { width: '80%', height: 11 }]} />
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
};

// ─── List row skeleton (van log, supplies) ───────────────────────────────────
// Goes inside the list's own row, so it keeps its padding and borders.
export const ListRowSkeleton = ({ leading = true, lines = 2 }) => {
  const opacity = usePulse();
  return (
    <Animated.View style={[sk.listRow, { opacity }]}>
      {leading && <View style={sk.listLeading} />}
      <View style={sk.listText}>
        <View style={[sk.line, { width: '60%', height: 12 }]} />
        {lines > 1 && <View style={[sk.line, { width: '35%', height: 10 }]} />}
      </View>
      <View style={[sk.line, { width: 48, height: 12 }]} />
    </Animated.View>
  );
};

// ─── Notification row skeleton ────────────────────────────────────────────────
export const NotificationRowSkeleton = () => {
  const opacity = usePulse();
  return (
    <Animated.View style={[sk.userRow, { opacity }]}>
      <View style={sk.notificationAvatar} />
      <View style={{ flex: 1, gap: 7 }}>
        <View style={[sk.line, { width: '80%', height: 12 }]} />
        <View style={[sk.line, { width: '30%', height: 10 }]} />
      </View>
    </Animated.View>
  );
};

// ─── Lines of text (a diary entry, a card's name and meta) ───────────────────
export const TextLinesSkeleton = ({ widths = ['40%', '90%', '60%'] }) => {
  const opacity = usePulse();
  return (
    <Animated.View style={[sk.textLines, { opacity }]}>
      {widths.map((width, i) => <View key={i} style={[sk.line, { width, height: i === 0 ? 14 : 11 }]} />)}
    </Animated.View>
  );
};

// ─── Form skeleton (editing a trip) ──────────────────────────────────────────
const FORM_SKELETON_FIELDS = 4;

export const FormSkeleton = () => {
  const opacity = usePulse();
  return (
    <Animated.View style={[sk.form, { opacity }]}>
      <View style={[sk.line, { width: '50%', height: 20, marginBottom: 8 }]} />
      {Array.from({ length: FORM_SKELETON_FIELDS }, (_, i) => (
        <View key={i} style={sk.formField}>
          <View style={[sk.line, { width: '30%', height: 11 }]} />
          <View style={sk.formInput} />
        </View>
      ))}
    </Animated.View>
  );
};

// ─── Shared styles ────────────────────────────────────────────────────────────
// One grey for every skeleton, so they all read as the same thing.
const SKELETON_COLOR = '#e5e7eb';

const sk = StyleSheet.create({
  box:      { backgroundColor: SKELETON_COLOR, borderRadius: 6 },
  line:     { backgroundColor: SKELETON_COLOR, borderRadius: 4 },
  metaRow:  { flexDirection: 'row', gap: 10 },

  // Itinerary card (full-bleed)
  itinCard: { height: 200, borderRadius: 14, backgroundColor: SKELETON_COLOR },

  // User card (Community grid)
  card: {
    backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden',
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  cardImage: { width: '100%', height: 140, backgroundColor: SKELETON_COLOR },
  cardBody:  { padding: 12, gap: 0 },

  // User card
  // Same shape as the person card: thin banner, centred avatar over it.
  userBanner:      { height: 56, backgroundColor: SKELETON_COLOR },
  userAvatarWrapper: { alignSelf: 'center', marginTop: -28 },
  userAvatar:      { width: 62, height: 62, borderRadius: 31, backgroundColor: SKELETON_COLOR, borderWidth: 3, borderColor: '#fff' },
  followBtnSk:     { height: 32, backgroundColor: SKELETON_COLOR, borderRadius: 999 },
  followBtnSkSmall:{ width: 72, height: 30, backgroundColor: SKELETON_COLOR, borderRadius: 999 },

  // User row (follows)
  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  rowAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: SKELETON_COLOR },

  // User avatar (home horizontal)
  userAvatarItem: { width: 88, alignItems: 'center' },
  avatarCircle:   { width: 64, height: 64, borderRadius: 32, backgroundColor: SKELETON_COLOR },

  // Profile
  profileBanner: { height: 110, backgroundColor: SKELETON_COLOR },
  profileCard: {
    backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 16,
    marginTop: -24, paddingBottom: 16,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  profileCardTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-end', paddingHorizontal: 16, paddingTop: 12,
  },
  profileAvatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: SKELETON_COLOR, marginTop: -36,
    borderWidth: 4, borderColor: '#fff',
  },
  profileBtnSk:  { width: 100, height: 34, backgroundColor: SKELETON_COLOR, borderRadius: 999 },
  profileStats:  { flexDirection: 'row', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  profileStat:   { flex: 1, alignItems: 'center' },

  // Itinerary detail
  detailHero:     { width: '100%', height: 420, backgroundColor: SKELETON_COLOR },
  detailBody:     { padding: 20 },
  detailStatsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 24 },
  detailStatCard: {
    flex: 1, minWidth: '44%', backgroundColor: '#f8fafc',
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#e5e7eb',
  },
  detailPlaceRow: {
    flexDirection: 'row', gap: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  detailPlaceNum: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: SKELETON_COLOR, flexShrink: 0,
  },

  // List row (van log, supplies), inside the list's own row
  listRow:     { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  listLeading: { width: 22, height: 22, borderRadius: 6, backgroundColor: SKELETON_COLOR },
  listText:    { flex: 1, gap: 6 },

  // Notification row
  notificationAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: SKELETON_COLOR },

  textLines: { gap: 8 },

  // Form
  form:      { padding: 20, gap: 18 },
  formField: { gap: 8 },
  formInput: { height: 44, borderRadius: 10, backgroundColor: SKELETON_COLOR },
});
