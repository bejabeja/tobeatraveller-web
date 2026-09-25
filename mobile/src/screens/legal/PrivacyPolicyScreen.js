import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { selectIsAuthenticated } from '@tobeatraveller/shared';
import { RichText } from '../../components/RichText';

const onInternalLink = (navigation, isAuthenticated) => (href) => {
  if (href === '/terms') navigation.navigate('Terms');
  if (href === '/settings') navigation.navigate(isAuthenticated ? 'Settings' : 'Login');
};

const PrivacyPolicyScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const lp = (key, vars) => t(`legalPrivacy.${key}`, vars);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.back}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel={t('common.back')}
        >
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{lp('documentTitle')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}>
        <Text style={styles.meta}>{lp('lastUpdated', { date: '25 September 2026' })}</Text>

        <Section title={lp('s1Title')}>
          <RichText text={lp('s1Body')} style={styles.p} linkStyle={styles.link} />
        </Section>
        <Section title={lp('s2Title')}>
          <Text style={styles.p}>{lp('s2Intro')}</Text>
          {lp('s2Items', { returnObjects: true }).map((item, i) => (
            <Bullet key={i}><RichText text={item} style={styles.bulletText} boldStyle={styles.bold} /></Bullet>
          ))}
        </Section>
        <Section title={lp('s3Title')}>
          <Text style={styles.p}>{lp('s3Intro')}</Text>
          {lp('s3Items', { returnObjects: true }).map((item, i) => <Bullet key={i}><Text style={styles.bulletText}>{item}</Text></Bullet>)}
          <Text style={styles.p}>{lp('s3Body2')}</Text>
          <Text style={styles.p}>{lp('s3Body3')}</Text>
        </Section>
        <Section title={lp('s4Title')}>
          <Text style={styles.p}>{lp('s4Intro')}</Text>
          {lp('s4Items', { returnObjects: true }).map((item, i) => (
            <Bullet key={i}>
              <RichText text={item} style={styles.bulletText} boldStyle={styles.bold} linkStyle={styles.link} />
            </Bullet>
          ))}
        </Section>
        <Section title={lp('s5Title')}>
          <Text style={styles.p}>{lp('s5Body')}</Text>
        </Section>
        <Section title={lp('s6Title')}>
          <Text style={styles.p}>{lp('s6Intro')}</Text>
          {lp('s6Items', { returnObjects: true }).map((item, i) => (
            <Bullet key={i}><RichText text={item} style={styles.bulletText} boldStyle={styles.bold} /></Bullet>
          ))}
          <RichText
            text={lp('s6Body2')}
            style={styles.p}
            linkStyle={styles.link}
            onInternalLink={onInternalLink(navigation, isAuthenticated)}
          />
          <RichText text={lp('s6Body3')} style={styles.p} linkStyle={styles.link} />
        </Section>
        <Section title={lp('s7Title')}>
          {lp('s7Body', { returnObjects: true }).map((p, i) => <Text key={i} style={styles.p}>{p}</Text>)}
        </Section>
        <Section title={lp('s8Title')}>
          <Text style={styles.p}>{lp('s8Body')}</Text>
        </Section>
        <Section title={lp('s9Title')}>
          <Text style={styles.p}>{lp('s9Body')}</Text>
        </Section>
        <Section title={lp('s10Title')}>
          <Text style={styles.p}>{lp('s10Body')}</Text>
        </Section>
        <Section title={lp('s11Title')}>
          <RichText
            text={lp('s11Body')}
            style={styles.p}
            linkStyle={styles.link}
            onInternalLink={onInternalLink(navigation, isAuthenticated)}
          />
        </Section>

        <TouchableOpacity onPress={() => navigation.navigate('Terms')} style={styles.footerLink}>
          <Text style={styles.footerLinkText}>{lp('footerTermsLink')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const Section = ({ title, children }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    {children}
  </View>
);

const Bullet = ({ children }) => (
  <View style={styles.bulletRow}>
    <Text style={styles.bulletDot}>•</Text>
    <View style={{ flex: 1 }}>{children}</View>
  </View>
);

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  back: { width: 40, padding: 4 },
  backText: { fontSize: 20, color: '#374151' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: '#111827' },

  body: { padding: 20 },
  meta: { fontSize: 12, color: '#9ca3af', marginBottom: 20 },

  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 8 },
  p: { fontSize: 13.5, color: '#374151', lineHeight: 20, marginBottom: 8 },
  bold: { fontWeight: '700', color: '#111827' },
  link: { color: '#E8743B', fontWeight: '600' },

  bulletRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  bulletDot: { fontSize: 13.5, color: '#9ca3af' },
  bulletText: { fontSize: 13.5, color: '#374151', lineHeight: 20 },

  footerLink: { alignItems: 'center', marginTop: 12, paddingVertical: 10 },
  footerLinkText: { color: '#E8743B', fontWeight: '600', fontSize: 14 },
});

export default PrivacyPolicyScreen;
