import React, { useEffect, useReducer, ReactElement, useState, useRef } from 'react';
import {
  createNavigationContainerRef,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  Platform,
} from 'react-native';
import { useSelector } from 'react-redux';

import { RideRequestProvider } from './src/context/RideRequestContext';
import { registerAppWithFCM, setupNotificationListeners } from './src/firebase/FCMService';

// Auth Screens
import LoginScreen from './src/screens/auth/LoginScreen';
import SignupScreen from './src/screens/auth/SignupScreen';

// Main Screens
import DashboardScreen from './src/screens/dashboard/DashboardScreen';
import NotificationScreen from './src/screens/dashboard/NotificationScreen';
import BookingHistoryScreen from './src/screens/History/BookingHistoryScreen';
import PayoutHistoryScreen from './src/screens/payout/PayoutHistoryScreen';

// Map Screens
import MapScreen from './src/screens/map/MapScreen';
import RideInProgress from './src/screens/map/RideInProgress';
import ReachedOnLocationMap from './src/screens/map/ReachedOnLocationMap';
import ReasonForCancel from './src/screens/map/ReasonForCancel';

// Booking
import BookingDetails from './src/screens/History/BookingDetails';

// Profile Screens
import ProfileScreen from './src/screens/profile/ProfileScreen';
import VehicleProfileScreen from './src/screens/profile/VehicleProfileScreen';
import VehicleDocumentScreen from './src/screens/profile/VehicleDocumentScreen';
import BankAccountScreen from './src/screens/profile/BankAccountScreen';
import BankAccountEditScreen from './src/screens/profile/BankAccountEditScreen';
import ChangePasswordScreen from './src/screens/profile/ChangePasswordScreen';
import PrivacyPolicyScreen from './src/screens/profile/PrivacyPolicyScreen';
import AboutUsScreen from './src/screens/profile/AboutUsScreen';
import TermsConditionsScreen from './src/screens/profile/TermsConditionsScreen';
import FAQScreen from './src/screens/profile/FAQScreen';
import SplashScreen from './src/screens/SplashScreen';
import SupportScreen from './src/screens/support/SupportScreen';
import ChatScreen from './src/screens/chat/ChatScreen';

import { Provider } from 'react-redux';
import { persistor, store } from './store';
import { PersistGate } from 'redux-persist/integration/react';
import { SocketProvider, useSocket } from './src/webSocket/SocketContext';
import useSocketListener from './src/webSocket/useSocketListener';
import { SOCKET_EVENTS } from './src/webSocket/socketEvents';
import { mapApiRideToNewRideRequest } from './src/Utility/rideMapper';
import { getMessaging } from '@react-native-firebase/messaging';
import { ridesAPI } from './src/services/api';
import Driverearningsscreen from './src/screens/History/Driverearningsscreen'
import toastService from './src/Utility/toast';
import ForgetScreen from './src/screens/auth/ForgetScreen';




const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

export const navigationRef = createNavigationContainerRef();

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const isSmallScreen = SCREEN_WIDTH < 360;
const isShortScreen = SCREEN_HEIGHT < 700;

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppState {
  isLoading: boolean;
  isSignout: boolean;
  userToken: string | null;
}

interface AppAction {
  type: 'RESTORE_TOKEN' | 'SIGN_IN' | 'SIGN_OUT';
  payload?: string | null;
}

// booking_id is the ONLY identifier used across the app for a ride request —
// it is what the backend expects on accept/decline calls.
interface RideData {
  booking_id: string;
  pickup_address: string;
  drop_address: string;
  distance_km: string;
  total_fare: string;
  created_at: string;
  isUpcoming?: boolean;
  user?: string;
}

// ─── Ride Popup Modal ─────────────────────────────────────────────────────────

interface RidePopupProps {
  ride: RideData | null;
  visible: boolean;
  onAccept: (bookingId: string) => void;
  onDecline: (bookingId: string) => void;
  acceptingId: string | null;
  decliningId: string | null;
  timeLeft: number;
}

const RidePopupModal = ({
  ride,
  visible,
  onAccept,
  onDecline,
  acceptingId,
  decliningId,
  timeLeft,
}: RidePopupProps): ReactElement | null => {
  const insets = useSafeAreaInsets();

  if (!ride) return null;

  const formatTime = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const formatDistance = (distance: string): string => {
    if (!distance || parseFloat(distance) === 0) return '0 km';
    return `${parseFloat(distance).toFixed(1)} km`;
  };

  const isBusy = acceptingId !== null || decliningId !== null;
  const timerColor = timeLeft <= 10 ? '#f44336' : timeLeft <= 20 ? '#FFB020' : '#FF8C00';
  const progressPct = Math.max(0, Math.min(100, (timeLeft / 30) * 100));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={() => {
        // Android hardware back press — treat as no-op so the driver
        // can't accidentally dismiss without deciding.
      }}
    >
      <View style={popupStyles.overlay}>
        <View
          style={[
            popupStyles.card,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          {/* Drag handle for visual affordance */}
          <View style={popupStyles.dragHandle} />

          {/* Header */}
          <View style={popupStyles.header}>
            <View style={popupStyles.headerLeft}>
              <Text style={popupStyles.rideId} numberOfLines={1}>
                #{ride.booking_id}
              </Text>
              <View style={popupStyles.upcomingBadge}>
                <MaterialCommunityIcons
                  name={ride.isUpcoming ? 'clock-outline' : 'car'}
                  size={12}
                  color="#fff"
                />
                <Text style={popupStyles.upcomingText}>
                  {ride.isUpcoming ? 'Upcoming' : 'New Ride'}
                </Text>
              </View>
            </View>
            <View style={[popupStyles.timerBadge, { borderColor: timerColor }]}>
              <MaterialCommunityIcons name="timer-outline" size={13} color={timerColor} />
              <Text style={[popupStyles.timerText, { color: timerColor }]}>
                {timeLeft}s
              </Text>
            </View>
          </View>

          <Text style={popupStyles.time}>{formatTime(ride.created_at)}</Text>

          {/* Timer Progress Bar */}
          <View style={popupStyles.progressBar}>
            <View
              style={[
                popupStyles.progressFill,
                { width: `${progressPct}%`, backgroundColor: timerColor },
              ]}
            />
          </View>

          {/* Scrollable content area — protects against small screens / long addresses */}
          <ScrollView
            style={popupStyles.scrollArea}
            contentContainerStyle={popupStyles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Route */}
            <View style={popupStyles.routeContainer}>
              <View style={popupStyles.routePoint}>
                <View style={popupStyles.routeIconWrap}>
                  <MaterialCommunityIcons name="map-marker" size={18} color="#FF8C00" />
                </View>
                <View style={popupStyles.routeText}>
                  <Text style={popupStyles.routeLabel}>Pickup</Text>
                  <Text style={popupStyles.routeAddress} numberOfLines={2}>
                    {ride.pickup_address || 'Location not specified'}
                  </Text>
                </View>
              </View>
              <View style={popupStyles.routeLine} />
              <View style={popupStyles.routePoint}>
                <View style={popupStyles.routeIconWrap}>
                  <MaterialCommunityIcons name="map-marker-check" size={18} color="#4CAF50" />
                </View>
                <View style={popupStyles.routeText}>
                  <Text style={popupStyles.routeLabel}>Dropoff</Text>
                  <Text style={popupStyles.routeAddress} numberOfLines={2}>
                    {ride.drop_address || 'Location not specified'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Details */}
            <View style={popupStyles.detailsRow}>
              <View style={popupStyles.detail}>
                <MaterialCommunityIcons name="road-variant" size={16} color="#aaa" />
                <Text style={popupStyles.detailText} numberOfLines={1}>
                  {formatDistance(ride.distance_km)}
                </Text>
              </View>
              <View style={popupStyles.detailDivider} />
              <View style={popupStyles.detail}>
                <MaterialCommunityIcons name="cash" size={16} color="#aaa" />
                <Text style={popupStyles.detailText} numberOfLines={1}>
                  R{ride.total_fare || '0'}
                </Text>
              </View>
              <View style={popupStyles.detailDivider} />
              <View style={popupStyles.detail}>
                <MaterialCommunityIcons name="account" size={16} color="#aaa" />
                <Text style={popupStyles.detailText} numberOfLines={1}>
                  {ride.user || 'Passenger'}
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={popupStyles.actionButtons}>
            <TouchableOpacity
              style={[
                popupStyles.declineButton,
                isBusy && popupStyles.buttonDisabled,
              ]}
              onPress={() => onDecline(ride.booking_id)}
              disabled={isBusy}
              activeOpacity={0.75}
            >
              {decliningId === ride.booking_id ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="close-circle-outline" size={20} color="#fff" />
                  <Text style={popupStyles.buttonText}>Decline</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                popupStyles.acceptButton,
                isBusy && popupStyles.buttonDisabled,
              ]}
              onPress={() => onAccept(ride.booking_id)}
              disabled={isBusy}
              activeOpacity={0.75}
            >
              {acceptingId === ride.booking_id ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <MaterialCommunityIcons name="check-circle-outline" size={20} color="#fff" />
                  <Text style={popupStyles.buttonText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Auth Stack ───────────────────────────────────────────────────────────────

const AuthStack = (): ReactElement => (
  <Stack.Navigator screenOptions={{ headerShown: false, animationEnabled: true }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
          <Stack.Screen name="ForgetScreen" component={ForgetScreen} />

    <Stack.Screen name="TermsConditionsScreen" component={TermsConditionsScreen} />
  </Stack.Navigator>
);

// ─── Main Tabs ────────────────────────────────────────────────────────────────

const MainTabs = (): ReactElement => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarHideOnKeyboard: true,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName = '';
        if (route.name === 'Dashboard') iconName = focused ? 'home' : 'home-outline';
        else if (route.name === 'BookingHistoryScreen')
          iconName = focused ? 'clipboard-text' : 'clipboard-text-outline';
        else if (route.name === 'PayoutHistoryScreen')
          iconName = focused ? 'wallet' : 'wallet-outline';
        else if (route.name === 'Profile')
          iconName = focused ? 'account' : 'account-outline';
        if (!iconName) iconName = 'circle-outline';
        return <Icon name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#FF8902',
      tabBarInactiveTintColor: '#fff',
      tabBarStyle: { backgroundColor: '#000', borderTopWidth: 0, elevation: 0 },
      tabBarItemStyle: { paddingVertical: 5 },
    })}
  >
    <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'HOME' }} />
    <Tab.Screen name="BookingHistoryScreen" component={BookingHistoryScreen} options={{ title: 'MY RIDES' }} />
    <Tab.Screen name="PayoutHistoryScreen" component={PayoutHistoryScreen} options={{ title: 'PAYOUT' }} />
    <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'PROFILE' }} />
  </Tab.Navigator>
);

// ─── App Reducer ──────────────────────────────────────────────────────────────

const appReducer = (prevState: AppState, action: AppAction): AppState => {
  switch (action.type) {
    case 'RESTORE_TOKEN':
      return { ...prevState, userToken: action.payload || null, isLoading: false };
    case 'SIGN_IN':
      return { ...prevState, isSignout: false, userToken: action.payload || null };
    case 'SIGN_OUT':
      return { ...prevState, isSignout: true, userToken: null };
    default:
      return prevState;
  }
};

// ─── App (providers only) ──────────────────────────────────────────────────────

export default function App(): ReactElement {
  const [state, dispatch] = useReducer(appReducer, {
    isLoading: true,
    isSignout: false,
    userToken: null,
  });

  (global as any).authDispatch = dispatch;

  // ── Restore token ─────────────────────────────────────────────────────────
  useEffect(() => {
    const bootstrapAsync = async (): Promise<void> => {
      const [token] = await Promise.all([
        AsyncStorage.getItem('userToken').catch(() => null),
        new Promise(resolve => setTimeout(resolve, 2000)),
      ]);
      dispatch({ type: 'RESTORE_TOKEN', payload: token });
    };
    bootstrapAsync();
  }, []);

  if (state.isLoading) return <SplashScreen />;

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SocketProvider>
          <SafeAreaProvider>
            <RideRequestProvider>
              <AppContent userToken={state.userToken} />
            </RideRequestProvider>
          </SafeAreaProvider>
        </SocketProvider>
      </PersistGate>
    </Provider>
  );
}

// ─── AppContent (navigation + socket-triggered ride popup) ────────────────────

function AppContent({ userToken }: { userToken: string | null }): ReactElement {
  // Popup state
  const [popupRide, setPopupRide] = useState<RideData | null>(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [rideData, setRideData] = useState<any>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const shownRideIds = useRef<Set<string>>(new Set()); // avoid re-opening popup for same booking_id
  const activeRideIdRef = useRef<string | null>(null); // booking_id currently shown, for auto-decline

  const user = useSelector((state: any) => state.auth.userData);
  const { isConnected, connectSocket } = useSocket();

  // ── Make sure socket is connected once logged in ──────────────────────────
  useEffect(() => {
    if (user?.id && !isConnected) {
      console.log('[App] socket connect:', user.id);
      connectSocket(user.id);
    }
  }, [user?.id, isConnected]);

  // ── Close popup UI only (no API call) ───────────────────────────────────────
  const closePopupUI = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setPopupVisible(false);
    setPopupRide(null);
    setTimeLeft(30);
    activeRideIdRef.current = null;
  };

  // ── Decline call to the backend (shared by manual decline + auto-timeout) ──
  const declineRide = async (bookingId: string, { silent = false }: { silent?: boolean } = {}) => {
    try {
      if (!silent) setDecliningId(bookingId);
      await ridesAPI.acceptAndRejectRide({ booking_id: bookingId, status: '1' });
    } catch (error: any) {
      console.log('declineRide error:', error);
      if (!silent) {
        Alert.alert('Error', error?.message || 'Failed to decline ride');
      }
    } finally {
      if (!silent) setDecliningId(null);
    }
  };

  // ── Show popup with 30s countdown; auto-declines via API on timeout ────────
  const showRidePopup = (ride: RideData) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);

    activeRideIdRef.current = ride.booking_id;
    setPopupRide(ride);
    setPopupVisible(true);
    setTimeLeft(30);

    countdownRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    timerRef.current = setTimeout(() => {
      // Timer ran out without a driver decision → auto-decline on backend,
      // then close the popup UI silently (no spinner / alert needed).
      const expiredBookingId = activeRideIdRef.current;
      closePopupUI();
      if (expiredBookingId != null) {
        declineRide(expiredBookingId, { silent: true });
      }
    }, 30000);
  };

    useEffect(() => {
    if (user?.id) {
      loadAvailableRides();
    }
  }, [user?.id]);
  
  const loadAvailableRides = async () => {
    try {
      const response = await ridesAPI.getAvailableRides();
      const ride = response?.data;
      console.log('Ride Data --->', ride);

      if (ride && ride.booking_id && !shownRideIds.current.has(ride.booking_id)) {
        shownRideIds.current.add(ride.booking_id); // mark as shown
        setRideData(ride);

        showRidePopup({
          booking_id: ride.booking_id,
          pickup_address: ride.picup_location,
          drop_address: ride.drop_location,
          distance_km: ride.distance,
          total_fare: ride.fare,
          created_at: ride.booking_date,
          isUpcoming: false,
          user: ride.user_name,
        });
      }
    } catch (error) {
      console.log('loadAvailableRides error:', error);
    }
  };

  // ── Socket: trigger only — server tells us to check, we fetch via API ──────
  useSocketListener(SOCKET_EVENTS.NEW_RIDE_REQUEST, async (payload: any) => {
    console.log('[SOCKET] new_ride_request trigger:', payload);
    await loadAvailableRides();
  });



  // ── Accept ride ───────────────────────────────────────────────────────────
  const handleAcceptRide = async (bookingId: string) => {
    setAcceptingId(bookingId);
    try {
      const response =await ridesAPI.acceptAndRejectRide({ booking_id: bookingId, status: '2' });
      closePopupUI();
            toastService.success(response?.message || 'Profile photo updated');
      if (navigationRef.isReady() && rideData?.booking_type==1) {
        navigationRef.navigate('MapScreen', {
          ride: rideData,
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to accept ride');
    } finally {
      setAcceptingId(null);
    }
  };

  // ── Decline ride (manual, driver-initiated) ────────────────────────────────
  const handleDeclineRide = async (bookingId: string) => {
    await declineRide(bookingId);
    closePopupUI();
  };

  // ── FCM listeners ─────────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribeFCM = getMessaging().onMessage(async remoteMessage => {
      const fcmRideData = remoteMessage?.data;

      if (fcmRideData?.type === 'new_ride' || fcmRideData?.type === 'upcoming_ride') {
        // mapApiRideToNewRideRequest must return an object with a `booking_id`
        // field (string) to match RideData — update the mapper if it still
        // returns `id` / `ride_id`.
        const mappedRide = mapApiRideToNewRideRequest(fcmRideData);
        showRidePopup({
          ...mappedRide,
          isUpcoming: fcmRideData?.type === 'upcoming_ride',
        });
      }
    });

    const unsubscribeNav = setupNotificationListeners(navigationRef);

    return () => {
      unsubscribeFCM();
      unsubscribeNav();
    };
  }, []);

  // ── FCM registration ──────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      await registerAppWithFCM();
    };
    init();
  }, []);

  // ── Cleanup any pending timers on unmount ───────────────────────────────────
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  return (
    <>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {userToken == null ? (
            <Stack.Screen
              name="Auth"
              component={AuthStack}
              options={{ animationEnabled: false }}
            />
          ) : (
            <>
              <Stack.Screen name="MainTabs" component={MainTabs} options={{ animationEnabled: false }} />
              <Stack.Screen name="MapScreen" component={MapScreen} />
              <Stack.Screen name="ReachedOnLocationMap" component={ReachedOnLocationMap} />
              <Stack.Screen name="RideInProgress" component={RideInProgress} />
              <Stack.Screen name="BookingDetails" component={BookingDetails} />
              <Stack.Screen name="ReasonForCancel" component={ReasonForCancel} />
              <Stack.Screen name="ChatScreen" component={ChatScreen} />
              <Stack.Screen name="NotificationScreen" component={NotificationScreen} />
              <Stack.Screen name="VehicleProfileScreen" component={VehicleProfileScreen} />
              <Stack.Screen name="VehicleDocumentScreen" component={VehicleDocumentScreen} />
              <Stack.Screen name="BankAccountScreen" component={BankAccountScreen} />
              <Stack.Screen name="BankAccountEditScreen" component={BankAccountEditScreen} />
              <Stack.Screen name="ChangePasswordScreen" component={ChangePasswordScreen} />
              <Stack.Screen name="PrivacyPolicyScreen" component={PrivacyPolicyScreen} />
              <Stack.Screen name="AboutUsScreen" component={AboutUsScreen} />
              <Stack.Screen name="TermsConditionsScreen" component={TermsConditionsScreen} />
              <Stack.Screen name="FAQScreen" component={FAQScreen} />
              <Stack.Screen name="SupportScreen" component={SupportScreen} />
                                      <Stack.Screen name="Driverearningsscreen" component={Driverearningsscreen} />

            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>

      {/* ── Global Ride Popup (over any screen) ── */}
      <RidePopupModal
        ride={popupRide}
        visible={popupVisible}
        onAccept={handleAcceptRide}
        onDecline={handleDeclineRide}
        acceptingId={acceptingId}
        decliningId={decliningId}
        timeLeft={timeLeft}
      />
    </>
  );
}

// ─── Popup Styles ─────────────────────────────────────────────────────────────

const popupStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: isSmallScreen ? 16 : 20,
    paddingTop: 10,
    borderTopWidth: 2,
    borderColor: '#FFD580',
    maxHeight: SCREEN_HEIGHT * 0.72,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: { elevation: 16 },
    }),
  },
  dragHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3a3a3a',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  rideId: {
    fontSize: isSmallScreen ? 15 : 17,
    fontWeight: 'bold',
    color: '#FF8C00',
    flexShrink: 1,
  },
  upcomingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  upcomingText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '600',
  },
  timerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  timerText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  time: {
    fontSize: 11,
    color: '#888',
    marginBottom: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#2a2a2a',
    borderRadius: 2,
    marginBottom: 14,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  scrollArea: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: 4,
  },
  routeContainer: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  routeIconWrap: {
    width: 26,
    alignItems: 'center',
    paddingTop: 1,
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: '#3a3a3a',
    marginLeft: 12,
    marginVertical: 2,
  },
  routeText: {
    flex: 1,
    marginLeft: 6,
  },
  routeLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 2,
  },
  routeAddress: {
    fontSize: 13.5,
    color: '#fff',
    fontWeight: '500',
    lineHeight: 18,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#242424',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 1,
  },
  detailDivider: {
    width: 1,
    height: 18,
    backgroundColor: '#3a3a3a',
  },
  detailText: {
    fontSize: 12.5,
    color: '#ddd',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 6,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f44336',
    borderRadius: 12,
    paddingVertical: isShortScreen ? 11 : 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  acceptButton: {
    flex: 1.4,
    flexDirection: 'row',
    backgroundColor: '#FF8C00',
    borderRadius: 12,
    paddingVertical: isShortScreen ? 11 : 14,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14.5,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});