import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { RichText } from '../../components/RichText';

const onInternalLink = (navigation) => (href) => {
  if (href === '/privacy-policy') navigation.navigate('PrivacyPolicy');
};

const TermsScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const lt = (key, vars) => t(`legalTerms.${key}`, vars);

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
        <Text style={styles.headerTitle}>{lt('documentTitle')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32 }]}>
        <Text style={styles.meta}>{lt('lastUpdated', { date: '29 May 2025' })}</Text>

        <Section title={lt('s1Title')}>
          {lt('s1Body', { returnObjects: true }).map((p, i) => <Text key={i} style={styles.p}>{p}</Text>)}
        </Section>
        <Section title={lt('s2Title')}>
          {lt('s2Body', { returnObjects: true }).map((p, i) => <Text key={i} style={styles.p}>{p}</Text>)}
        </Section>
        <Section title={lt('s3Title')}>
          {lt('s3Items', { returnObjects: true }).map((item, i) => <Bullet key={i} text={item} />)}
        </Section>
        <Section title={lt('s4Title')}>
          {lt('s4Body', { returnObjects: true }).map((p, i) => <Text key={i} style={styles.p}>{p}</Text>)}
          <Text style={styles.p}>{lt('s4Warrant')}</Text>
          {lt('s4Items', { returnObjects: true }).map((item, i) => <Bullet key={i} text={item} />)}
        </Section>
        <Section title={lt('s5Title')}>
          <Text style={styles.p}>{lt('s5Intro')}</Text>
          {lt('s5Items', { returnObjects: true }).map((item, i) => <Bullet key={i} text={item} />)}
        </Section>
        <Section title={lt('s6Title')}>
          <RichText
            text={lt('s6Body')}
            style={styles.p}
            linkStyle={styles.link}
            onInternalLink={onInternalLink(navigation)}
          />
        </Section>
        <Section title={lt('s7Title')}>
          <RichText text={lt('s7Body')} style={styles.p} boldStyle={styles.bold} />
        </Section>
        <Section title={lt('s8Title')}>
          {lt('s8Body', { returnObjects: true }).map((p, i) => <Text key={i} style={styles.p}>{p}</Text>)}
        </Section>
        <Section title={lt('s9Title')}>
          {lt('s9Body', { returnObjects: true }).map((p, i) => <Text key={i} style={styles.p}>{p}</Text>)}
        </Section>
        <Section title={lt('s10Title')}>
          {lt('s10Body', { returnObjects: true }).map((p, i) => <Text key={i} style={styles.p}>{p}</Text>)}
        </Section>
        <Section title={lt('s11Title')}>
          {lt('s11Body', { returnObjects: true }).map((p, i) => <Text key={i} style={styles.p}>{p}</Text>)}
        </Section>
        <Section title={lt('s12Title')}>
          <Text style={styles.p}>{lt('s12Body')}</Text>
        </Section>
        <Section title={lt('s13Title')}>
          <Text style={styles.p}>{lt('s13Body')}</Text>
        </Section>
        <Section title={lt('s14Title')}>
          <RichText text={lt('s14Body')} style={styles.p} linkStyle={styles.link} />
        </Section>

        <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')} style={styles.footerLink}>
          <Text style={styles.footerLinkText}>{lt('footerPrivacyLink')}</Text>
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

const Bullet = ({ text }) => (
  <View style={styles.bulletRow}>
    <Text style={styles.bulletDot}>•</Text>
    <Text style={styles.bulletText}>{text}</Text>
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
  bulletText: { flex: 1, fontSize: 13.5, color: '#374151', lineHeight: 20 },

  footerLink: { alignItems: 'center', marginTop: 12, paddingVertical: 10 },
  footerLinkText: { color: '#E8743B', fontWeight: '600', fontSize: 14 },
});

export default TermsScreen;
