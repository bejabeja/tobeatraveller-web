import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { selectIsAuthenticated, selectAuthUser, logoutUser } from '@tobeatraveller/shared';

const ProfileScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectAuthUser);

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>My Profile</Text>
        <Text style={styles.subtitle}>Sign in to access your profile and itineraries.</Text>
        <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.btnText}>Sign in</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnSecondary} onPress={() => navigation.navigate('Register')}>
          <Text style={styles.btnSecondaryText}>Create account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{user?.username?.charAt(0).toUpperCase()}</Text>
      </View>
      <Text style={styles.username}>@{user?.username}</Text>
      {user?.name && <Text style={styles.name}>{user.name}</Text>}

      <TouchableOpacity style={styles.btnDanger} onPress={() => dispatch(logoutUser())}>
        <Text style={styles.btnText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 24 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#0077b6', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '700' },
  username: { fontSize: 18, fontWeight: '700', color: '#111827' },
  name: { fontSize: 14, color: '#6b7280', marginTop: 4, marginBottom: 24 },
  btn: { backgroundColor: '#0077b6', borderRadius: 999, paddingVertical: 13, paddingHorizontal: 32, marginTop: 8 },
  btnSecondary: { borderWidth: 1.5, borderColor: '#e5e7eb', borderRadius: 999, paddingVertical: 13, paddingHorizontal: 32, marginTop: 10 },
  btnSecondaryText: { color: '#111827', fontWeight: '600', fontSize: 15 },
  btnDanger: { backgroundColor: '#ef4444', borderRadius: 999, paddingVertical: 13, paddingHorizontal: 32, marginTop: 24 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default ProfileScreen;
