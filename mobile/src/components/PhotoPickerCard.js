import * as ImagePicker from 'expo-image-picker';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

export const PhotoPickerCard = ({ photoUri, onChange }) => {
  const { t } = useTranslation();

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('createItinerary.permissionNeeded'), t('createItinerary.permissionDesc'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, aspect: [16, 9], quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]) onChange(result.assets[0].uri);
  };

  return (
    <TouchableOpacity
      style={[styles.card, photoUri && styles.cardComplete]}
      onPress={pickPhoto}
      activeOpacity={0.85}
    >
      {photoUri
        ? <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
        : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderIcon}>📷</Text>
            <Text style={styles.placeholderText}>{t('createItinerary.addCoverPhoto')}</Text>
          </View>
        )}
      {photoUri && (
        <View style={styles.overlay}>
          <Text style={styles.overlayText}>{t('createItinerary.changePhoto')}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    height: 160, borderRadius: 14, overflow: 'hidden',
    backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: '#e5e7eb', borderStyle: 'dashed',
  },
  cardComplete: { borderStyle: 'solid', borderColor: '#B5501B', borderWidth: 2 },
  photo: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  placeholderIcon: { fontSize: 28 },
  placeholderText: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  overlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)', paddingVertical: 8, alignItems: 'center',
  },
  overlayText: { color: '#fff', fontWeight: '600', fontSize: 14 },
});
