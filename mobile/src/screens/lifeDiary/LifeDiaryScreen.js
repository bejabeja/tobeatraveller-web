import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  Alert, FlatList, Image, RefreshControl,
  ScrollView, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import {
  getLifeDiaryEntries, isNetworkError, isPremiumRequiredError, selectAuthUser,
} from '@tobeatraveller/shared';
import FeatureLoadState from '../../components/FeatureLoadState';
import { PendingChangesNotice } from '../../components/PendingChangesNotice';
import { PendingSyncBadge } from '../../components/PendingSyncBadge';
import { runOrQueue } from '../../offline/outbox';
import { applyPendingChanges, CHANGE_KINDS, COLLECTIONS, sortByEntryDateDesc } from '../../offline/pendingChanges';
import { useOutbox, useRefetchAfterSync } from '../../offline/useOutbox';
import { cacheGet, cacheSet } from '../../utils/offlineCache';
import { shadow } from '../../utils/styles';

const LifeDiaryScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const d = (key, vars) => t(`lifeDiary.${key}`, vars);
  const insets = useSafeAreaInsets();
  // The session user rather than the full profile: it is restored even when
  // the app opens offline, so the cached data can still be found.
  const authUser = useSelector(selectAuthUser);
  const cacheKey = `lifediary:entries:${authUser?.id}`;

  const [serverEntries, setServerEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [loadError, setLoadError] = useState(null); // null | 'premium' | 'error'
  const [showingCached, setShowingCached] = useState(false);
  const { changes } = useOutbox();
  const entries = useMemo(
    () => sortByEntryDateDesc(applyPendingChanges(serverEntries, changes, COLLECTIONS.LIFE_DIARY)),
    [serverEntries, changes]
  );

  const fetchEntries = async () => {
    try {
      const data = await getLifeDiaryEntries();
      const list = Array.isArray(data) ? data : [];
      setServerEntries(list);
      setLoadError(null);
      setShowingCached(false);
      cacheSet(cacheKey, list);
    } catch (err) {
      if (isNetworkError(err)) {
        const cached = await cacheGet(cacheKey);
        if (cached) {
          setServerEntries(cached);
          setLoadError(null);
          setShowingCached(true);
          return;
        }
      }
      setServerEntries([]);
      setShowingCached(false);
      setLoadError(isPremiumRequiredError(err) ? 'premium' : 'error');
    }
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchEntries().finally(() => setLoading(false));
    }, [])
  );

  useRefetchAfterSync(fetchEntries);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchEntries();
    setRefreshing(false);
  };

  const toggleExpanded = (id) => setExpandedId(prev => (prev === id ? null : id));

  const handleDelete = (entry) => {
    Alert.alert(
      d('deleteConfirmTitle'),
      d('deleteConfirmDesc'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { queued } = await runOrQueue({
                collection: COLLECTIONS.LIFE_DIARY,
                kind: CHANGE_KINDS.DELETE,
                entityId: entry.id,
                label: entry.location?.name || entry.entryDate,
              });
              if (!queued) fetchEntries();
            } catch (err) {
              Alert.alert(t('errors.somethingWrong'), err?.message || d('deleteError'));
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={t('common.back')}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{d('title')}</Text>
        {loadError !== 'premium' && (
          <TouchableOpacity
            style={styles.newBtn}
            onPress={() => navigation.navigate('LifeDiaryEntryForm')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.newBtnText}>+ {d('addEntry')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <PendingChangesNotice />
      {showingCached && (
        <View style={styles.cachedBanner}>
          <Text style={styles.cachedBannerText}>{t('common.showingCachedData')}</Text>
        </View>
      )}

      <FlatList
        data={loading && !entries.length
          ? Array.from({ length: 3 }, (_, i) => ({ id: `sk-${i}`, _skeleton: true }))
          : entries
        }
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#E8743B" />
        }
        ListEmptyComponent={
          !loading ? (
            loadError ? (
              <FeatureLoadState status={loadError} onRetry={fetchEntries} />
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>📔</Text>
                <Text style={styles.emptyTitle}>{d('noEntries')}</Text>
              </View>
            )
          ) : null
        }
        renderItem={({ item }) => {
          if (item._skeleton) return <View style={[styles.entry, styles.entrySkeleton]} />;

          const expanded = expandedId === item.id;
          const hasMore = !!(item.lessonLearned || item.memories || item.peopleMet);

          return (
            <View style={styles.entry}>
              <View style={styles.entryTop}>
                <View style={styles.entryPlace}>
                  {item.location?.name && (
                    <View style={styles.entryLocationRow}>
                      <Ionicons name="location-outline" size={13} color="#6b7280" />
                      <Text style={styles.entryLocation}>
                        {item.location.name}{item.location.country ? `, ${item.location.country}` : ''}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.entryDate}>{item.entryDate}</Text>
                </View>
                <View style={styles.entryActions}>
                  <TouchableOpacity
                    style={styles.entryActionBtn}
                    onPress={() => navigation.navigate('LifeDiaryEntryForm', { entry: item })}
                  >
                    <Ionicons name="pencil-outline" size={16} color="#6b7280" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.entryActionBtn} onPress={() => handleDelete(item)}>
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>

              {item.images?.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photos}>
                  {item.images.map(image => (
                    <Image key={image.id} source={{ uri: image.photoUrl }} style={styles.photo} resizeMode="cover" />
                  ))}
                </ScrollView>
              )}

              {item.bestMoment && <Text style={styles.excerpt}>"{item.bestMoment}"</Text>}

              <PendingSyncBadge item={item} />

              {item.wouldReturn !== null && (
                <View style={[styles.badge, item.wouldReturn ? styles.badgeYes : styles.badgeNo]}>
                  <Text style={[styles.badgeText, item.wouldReturn ? styles.badgeTextYes : styles.badgeTextNo]}>
                    {item.wouldReturn ? d('wouldReturnBadge') : d('wouldNotReturnBadge')}
                  </Text>
                </View>
              )}

              {expanded && (
                <View style={styles.details}>
                  {item.lessonLearned && (
                    <Text style={styles.detailText}>
                      <Text style={styles.detailLabel}>{d('lessonLearnedLabel')}: </Text>{item.lessonLearned}
                    </Text>
                  )}
                  {item.memories && <Text style={styles.memories}>{item.memories}</Text>}
                  {item.peopleMet && (
                    <Text style={styles.detailText}>
                      <Text style={styles.detailLabel}>{d('peopleMetLabel')}: </Text>{item.peopleMet}
                    </Text>
                  )}
                </View>
              )}

              {hasMore && (
                <TouchableOpacity onPress={() => toggleExpanded(item.id)}>
                  <Text style={styles.readMore}>{expanded ? t('common.close') : d('readMore')}</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },

  cachedBanner: {
    paddingVertical: 6, paddingHorizontal: 16,
    backgroundColor: '#fef3c7',
  },
  cachedBannerText: { fontSize: 12, color: '#92400e', fontWeight: '600' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    ...shadow(2, 0.05, 6, 2),
  },
  backBtn: { marginRight: 10, padding: 4 },
  backText: { fontSize: 20, color: '#374151' },
  title: { flex: 1, fontSize: 20, fontWeight: '800', color: '#111827' },
  newBtn: {
    backgroundColor: '#E8743B', borderRadius: 999,
    paddingVertical: 7, paddingHorizontal: 14,
  },
  newBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  list: { padding: 12, gap: 10 },

  entry: {
    backgroundColor: '#fff', borderRadius: 14,
    borderWidth: 1, borderColor: '#e5e7eb',
    padding: 14,
    ...shadow(2, 0.05, 6, 2),
  },
  entrySkeleton: { height: 96, backgroundColor: '#f3f4f6', borderColor: '#f3f4f6' },
  entryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  entryPlace: { flex: 1 },
  entryLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  entryLocation: { fontSize: 13, color: '#374151', fontWeight: '600' },
  entryDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  entryActions: { flexDirection: 'row', gap: 12 },
  entryActionBtn: { padding: 2 },

  photos: { gap: 8, marginTop: 10 },
  photo: { width: 72, height: 72, borderRadius: 10, backgroundColor: '#f3f4f6' },

  excerpt: { fontSize: 14, color: '#374151', fontStyle: 'italic', marginTop: 10, lineHeight: 20 },

  badge: {
    alignSelf: 'flex-start', borderRadius: 999, marginTop: 8,
    paddingVertical: 3, paddingHorizontal: 10,
  },
  badgeYes: { backgroundColor: '#dcfce7' },
  badgeNo: { backgroundColor: '#fef2f2' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextYes: { color: '#16a34a' },
  badgeTextNo: { color: '#dc2626' },

  details: { marginTop: 10, gap: 6 },
  detailText: { fontSize: 13, color: '#374151', lineHeight: 19 },
  detailLabel: { fontWeight: '700', color: '#111827' },
  memories: { fontSize: 13, color: '#374151', lineHeight: 20 },

  readMore: { fontSize: 13, color: '#E8743B', fontWeight: '600', marginTop: 10 },

  empty: { alignItems: 'center', paddingTop: 56, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 15, color: '#6b7280', textAlign: 'center' },
});

export default LifeDiaryScreen;
