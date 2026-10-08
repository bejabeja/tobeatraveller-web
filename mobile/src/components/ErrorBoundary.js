import { Component } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

const ErrorFallback = ({ onRetry }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>⚠️</Text>
      <Text style={styles.title} accessibilityRole="header">{t('errors.title')}</Text>
      <Text style={styles.message}>{t('errors.somethingWrong')}</Text>
      <TouchableOpacity style={styles.btn} onPress={onRetry} accessibilityRole="button">
        <Text style={styles.btnText}>{t('common.retry')}</Text>
      </TouchableOpacity>
    </View>
  );
};

// A screen that fails to draw would otherwise leave the app blank with no way out.
class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('A screen failed to render', error);
  }

  retry = () => this.setState({ failed: false });

  render() {
    if (this.state.failed) return <ErrorFallback onRetry={this.retry} />;
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: '#fff' },
  icon: { fontSize: 44, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8, textAlign: 'center' },
  message: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  btn: { backgroundColor: '#E8743B', borderRadius: 999, paddingVertical: 12, paddingHorizontal: 28 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default ErrorBoundary;
