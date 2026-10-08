import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getBlockedUsers, unblockUser } from '@tobeatraveller/shared';
import { shadow } from '../utils/styles';

// The people the viewer has blocked, with a way to undo it: someone blocked
// disappears from every list, so their profile cannot be found to unblock.
const BlockedPeopleCard = () => {
  const { t } = useTranslation();
  const [blockedUsers, setBlockedUsers] = useState(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [unblockingId, setUnblockingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    getBlockedUsers()
      .then((users) => { if (!cancelled) setBlockedUsers(users); })
      .catch(() => { if (!cancelled) setLoadFailed(true); });
    return () => { cancelled = true; };
  }, []);

  const handleUnblock = async (user) => {
    setUnblockingId(user.id);
    try {
      await unblockUser(user.id);
      setBlockedUsers((previous) => previous.filter((blocked) => blocked.id !== user.id));
    } catch {
      Alert.alert(t('errors.somethingWrong'), t('block.error'));
    } finally {
      setUnblockingId(null);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{t('settings.blockedPeople')}</Text>
      {loadFailed && <Text style={styles.hint} accessibilityRole="alert">{t('block.listError')}</Text>}
      {!loadFailed && blockedUsers?.length === 0 && <Text style={styles.hint}>{t('settings.blockedPeopleEmpty')}</Text>}
      {blockedUsers?.map((user, index) => (
        <View key={user.id} style={[styles.row, index === 0 && styles.rowFirst]}>
          <Text style={styles.username} numberOfLines={1}>@{user.username}</Text>
          <TouchableOpacity
            style={[styles.unblockBtn, unblockingId === user.id && styles.btnDisabled]}
            onPress={() => handleUnblock(user)}
            disabled={unblockingId === user.id}
            accessibilityRole="button"
            accessibilityLabel={`${t('block.unblockButton')} @${user.username}`}
          >
            <Text style={styles.unblockText}>{t('block.unblockButton')}</Text>
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    ...shadow(2, 0.06, 8, 2),
  },
  cardTitle: {
    fontSize: 13, fontWeight: '700', color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
  },
  hint: { fontSize: 14, color: '#6b7280', paddingVertical: 8 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    minHeight: 48, paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e5e7eb',
  },
  rowFirst: { borderTopWidth: 0 },
  username: { flex: 1, fontSize: 15, color: '#111827' },
  unblockBtn: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14 },
  unblockText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  btnDisabled: { opacity: 0.5 },
});

export default BlockedPeopleCard;
