import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '@tobeatraveller/shared';
import { COLORS } from '../utils/styles';

import HomeScreen from '../screens/home/HomeScreen';
import ExploreScreen from '../screens/explore/ExploreScreen';
import SavedScreen from '../screens/saved/SavedScreen';
import CommunityScreen from '../screens/community/CommunityScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ContactScreen from '../screens/contact/ContactScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import ItineraryScreen from '../screens/itinerary/ItineraryScreen';
import EditItineraryScreen from '../screens/itinerary/EditItineraryScreen';
import CreateItineraryScreen from '../screens/itinerary/CreateItineraryScreen';
import PlanExperienceScreen from '../screens/itinerary/PlanExperienceScreen';
import MyItinerariesScreen from '../screens/myItineraries/MyItinerariesScreen';
import FollowsScreen from '../screens/follows/FollowsScreen';
import OnboardingScreen from '../screens/auth/OnboardingScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home:      { active: 'home',    inactive: 'home-outline'    },
  Explore:   { active: 'compass', inactive: 'compass-outline' },
  Community: { active: 'people',  inactive: 'people-outline'  },
  Profile:   { active: 'person',  inactive: 'person-outline'  },
};

const CreateButton = ({ onPress }) => (
  <TouchableOpacity style={tb.createWrap} onPress={onPress} activeOpacity={0.85}>
    <View style={tb.createCircle}>
      <Ionicons name="add" size={28} color="#fff" />
    </View>
  </TouchableOpacity>
);

const TabNavigator = ({ navigation }) => {
  const [showSheet, setShowSheet] = useState(false);

  return (
    <>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: '#E8743B',
          tabBarInactiveTintColor: '#9ca3af',
          tabBarStyle: {
            borderTopColor: '#e5e7eb',
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
            paddingTop: 6,
            backgroundColor: '#fff',
          },
          tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
          tabBarIcon: ({ focused, color, size }) => (
            <Ionicons
              name={TAB_ICONS[route.name]
                ? (focused ? TAB_ICONS[route.name].active : TAB_ICONS[route.name].inactive)
                : 'add'}
              size={size}
              color={color}
            />
          ),
        })}
      >
        <Tab.Screen name="Home"      component={HomeScreen}      options={{ tabBarLabel: 'Home' }} />
        <Tab.Screen name="Explore"   component={ExploreScreen}   options={{ tabBarLabel: 'Explore' }} />
        <Tab.Screen
          name="Create"
          component={CreateItineraryScreen}
          options={{
            tabBarLabel: () => null,
            tabBarButton: () => <CreateButton onPress={() => setShowSheet(true)} />,
          }}
        />
        <Tab.Screen name="Community" component={CommunityScreen} options={{ tabBarLabel: 'People' }} />
        <Tab.Screen name="Profile"   component={ProfileScreen}   options={{ tabBarLabel: 'Profile' }} />
      </Tab.Navigator>

      {/* Create type bottom sheet */}
      <Modal visible={showSheet} animationType="slide" transparent onRequestClose={() => setShowSheet(false)}>
        <TouchableOpacity style={tb.backdrop} onPress={() => setShowSheet(false)} activeOpacity={1}>
          <View style={tb.sheet}>
            <View style={tb.handle} />
            <Text style={tb.sheetTitle}>What do you want to create?</Text>

            {/* Option 1 — Itinerary */}
            <TouchableOpacity
              style={[tb.option, { borderColor: COLORS.accent + '40' }]}
              onPress={() => { setShowSheet(false); navigation.navigate('CreateItinerary'); }}
              activeOpacity={0.85}
            >
              <View style={[tb.optionIcon, { backgroundColor: COLORS.accent + '18' }]}>
                <Ionicons name="list-outline" size={28} color={COLORS.accent} />
              </View>
              <View style={tb.optionText}>
                <Text style={[tb.optionTitle, { color: COLORS.accent }]}>Itinerary</Text>
                <Text style={tb.optionDesc}>Plan day by day — places, budget, and all the details.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </TouchableOpacity>

            {/* Option 2 — Experience */}
            <TouchableOpacity
              style={[tb.option, { borderColor: COLORS.primary + '40' }]}
              onPress={() => { setShowSheet(false); navigation.navigate('PlanExperience'); }}
              activeOpacity={0.85}
            >
              <View style={[tb.optionIcon, { backgroundColor: COLORS.primary + '18' }]}>
                <Ionicons name="flash-outline" size={28} color={COLORS.primary} />
              </View>
              <View style={tb.optionText}>
                <Text style={[tb.optionTitle, { color: COLORS.primary }]}>Experience</Text>
                <Text style={tb.optionDesc}>Tell AI where you're going — it plans the whole journey.</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity style={tb.cancelBtn} onPress={() => setShowSheet(false)}>
              <Text style={tb.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const tb = StyleSheet.create({
  createWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -12,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36, gap: 12,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 8 },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 1.5, borderRadius: 16, padding: 14,
    backgroundColor: '#FAFAFA',
  },
  optionIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  optionDesc: { fontSize: 13, color: '#6b7280', lineHeight: 17 },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelText: { fontSize: 15, color: '#9CA3AF', fontWeight: '500' },
  createCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#E8743B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(232,116,59,0.45)' },
      default: {
        shadowColor: '#E8743B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
        elevation: 10,
      },
    }),
  },
});

const Navigation = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen name="Explore" component={ExploreScreen} />
        <Stack.Screen name="Itinerary" component={ItineraryScreen} />
        <Stack.Screen name="UserProfile" component={ProfileScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="EditItinerary" component={EditItineraryScreen} />
        <Stack.Screen name="CreateItinerary" component={CreateItineraryScreen} />
        <Stack.Screen name="PlanExperience" component={PlanExperienceScreen} />
        <Stack.Screen name="Community" component={CommunityScreen} />
        <Stack.Screen name="MyItineraries" component={MyItinerariesScreen} />
        <Stack.Screen name="Follows" component={FollowsScreen} options={{ presentation: 'formSheet', headerShown: false }} />
        <Stack.Screen name="Saved" component={SavedScreen} />
        <Stack.Screen name="Contact" component={ContactScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ gestureEnabled: false }} />
        {!isAuthenticated && (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;
