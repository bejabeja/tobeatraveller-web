import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { selectIsAuthenticated } from '@tobeatraveller/shared';

import HomeScreen from '../screens/home/HomeScreen';
import ExploreScreen from '../screens/explore/ExploreScreen';
import SavedScreen from '../screens/saved/SavedScreen';
import CommunityScreen from '../screens/community/CommunityScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import ItineraryScreen from '../screens/itinerary/ItineraryScreen';
import EditItineraryScreen from '../screens/itinerary/EditItineraryScreen';
import CreateItineraryScreen from '../screens/itinerary/CreateItineraryScreen';
import MyItinerariesScreen from '../screens/myItineraries/MyItinerariesScreen';
import FollowsScreen from '../screens/follows/FollowsScreen';

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

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: '#0077b6',
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
        tabBarButton: (props) => <CreateButton onPress={props.onPress} />,
      }}
    />
    <Tab.Screen name="Community" component={CommunityScreen} options={{ tabBarLabel: 'People' }} />
    <Tab.Screen name="Profile"   component={ProfileScreen}   options={{ tabBarLabel: 'Profile' }} />
  </Tab.Navigator>
);

const tb = StyleSheet.create({
  createWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -12,
  },
  createCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#0077b6',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    ...Platform.select({
      web: { boxShadow: '0px 4px 12px rgba(0,119,182,0.45)' },
      default: {
        shadowColor: '#0077b6',
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
        <Stack.Screen name="EditItinerary" component={EditItineraryScreen} />
        <Stack.Screen name="CreateItinerary" component={CreateItineraryScreen} />
        <Stack.Screen name="Community" component={CommunityScreen} />
        <Stack.Screen name="MyItineraries" component={MyItinerariesScreen} />
        <Stack.Screen name="Follows" component={FollowsScreen} />
        {!isAuthenticated && (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default Navigation;
