import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Image,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { driverAPI, driverAuthAPI, ridesAPI } from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getCurrentCoordinates, fetchReverseGeocode } from '../../Utility/locationService';
import { locationTracker } from '../../services/locationTracker';
import { useRideRequest } from '../../context/RideRequestContext';
import toastService from '../../Utility/toast';
import { useFocusEffect } from '@react-navigation/native';
import Geolocation from '@react-native-community/geolocation';

function formatHours(minutes) {
  if (!minutes) return '0 Hr';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} Min`;
  if (m === 0) return `${h} Hr`;
  return `${h} Hr ${m} Min`;
}

function formatFare(amount) {
  if (!amount) return 'R0.00';
  return `R${Number(amount).toLocaleString('en', { minimumFractionDigits: 2 })}`;
}



const QUICK_ACTIONS = [
  { icon: 'history',         label: 'Trip History', sub: 'View all rides',  screen: 'BookingHistoryScreen' },
  { icon: 'wallet-outline',  label: 'Earnings',     sub: 'Weekly report',   screen: 'PayoutHistoryScreen' },
  { icon: 'account-outline', label: 'My Profile',   sub: 'Edit details',    screen: 'Profile' },
  { icon: 'headset',         label: 'Support',      sub: 'Get help',        screen: 'SupportScreen' },
];

export default function DashboardScreen({ navigation }) {
  const { setNavigateOnAccept } = useRideRequest();

  const [loading,            setLoading]            = useState(false);
  const [refreshing,         setRefreshing]         = useState(false);
  const [currentAddress,     setCurrentAddress]     = useState('Fetching location...');
  const [profile,            setProfile]            = useState(null);
  const [ongoingRide,        setOngoingRide]        = useState(null);

  // ── Dashboard values ──────────────────────────────────────────────────────
  const [walletAmount,       setWalletAmount]       = useState(0);
  const [todayWorkingHours,  setTodayWorkingHours]  = useState(0);
  const [todayEarning,       setTodayEarning]       = useState(0);
  const [todayRides,         setTodayRides]         = useState(0);
  const [goal,setGoal]=useState(null)

  useFocusEffect(
    React.useCallback(() => {
      loadDashboardData();
      updateLocationAddress();
    }, [])
  );

  React.useEffect(() => {
    setNavigateOnAccept((ride) => {
      if (ride?.ride_type === 'instant') {
        navigation.navigate('MapScreen', { ride });
      }
    });
  }, []);

  const updateLocationAddress = async () => {
    try {
      const coords  = await getCurrentCoordinates();
      const address = await fetchReverseGeocode(coords.latitude, coords.longitude);
      setCurrentAddress(address);
    } catch (error) {
      setCurrentAddress(error.message || 'Location Error');
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [profileResponse, homeResponse] = await Promise.all([
        driverAPI.getProfile(),
        ridesAPI.getHomeOngoingRide(),
      ]);

      const profileData = profileResponse?.data || null;
      console.log('Profile Data ==>', profileData);
      console.log('homeResponse ==>', homeResponse);

      setProfile(profileData);
      locationTracker.setOnline(Boolean(profileData?.is_live));

      if (homeResponse?.status == 1) {
        const data = homeResponse?.data;
        console.log('Dashboard data ==>', data);

        // ✅ Set all 4 values from API
        setWalletAmount(data?.wallet_amount       ?? 0);
        setTodayWorkingHours(data?.today_working_hours ?? 0);
        setTodayEarning(data?.today_earning       ?? 0);
        setTodayRides(data?.today_rides           ?? 0);
        setOngoingRide(data?.ongoing_ride         || null);
        setGoal(data?.weekly_goals || 100)
      }
    } catch (error) {
      console.log('loadDashboardData error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    await updateLocationAddress();
    setRefreshing(false);
  };

  const getFreshCoords = () => {
    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (pos) => resolve({
          latitude:  pos.coords.latitude.toString(),
          longitude: pos.coords.longitude.toString(),
        }),
        () => resolve({ latitude: '0', longitude: '0' }),
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 10000 }
      );
    });
  };

  const handleToggle = async (value) => {
    try {
      setProfile(prev => prev ? { ...prev, is_live: value ? 1 : 0 } : null);
      locationTracker.setOnline(value);

      const { latitude, longitude } = await getFreshCoords();

      const response = await driverAuthAPI.toggleOnline({
        status: value ? 1 : 0,
        latitude,
        longitude,
      });

      console.log('Toggle Handler --->', response);

      if (response?.status === 1) {
        const isLiveFromAPI = response?.data?.is_live ?? (value ? 1 : 0);
        setProfile(prev => prev ? { ...prev, is_live: isLiveFromAPI } : null);
        locationTracker.setOnline(isLiveFromAPI === 1);
        toastService.success(response?.message);
      } else {
        setProfile(prev => prev ? { ...prev, is_live: value ? 0 : 1 } : null);
        locationTracker.setOnline(!value);
      }
    } catch (error) {
      setProfile(prev => prev ? { ...prev, is_live: value ? 0 : 1 } : null);
      locationTracker.setOnline(!value);
      console.log('Toggle error:', error);
    }
  };

  const handleResumeRide = (ride) => {
    switch (ride.booking_status) {
      case 2:
        navigation.navigate('MapScreen', { ride }); break;
      case 'driver_arrived':
        navigation.navigate('ReachedOnLocationMap', { ride, pickupData: null }); break;
      case 4:
        navigation.navigate('RideInProgress', { ride }); break;
      default:
        navigation.navigate('BookingDetails', { ride: { id: ride.id } });
    }
  };

  // ✅ Derived values from state
  const goalPct  = Math.min(Math.round((todayEarning / goal) * 100), 100);
  const isOnline = Boolean(profile?.is_live);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8C00" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF8C00" />
        }
      >

        {/* ── HEADER ── */}
        <View style={styles.header}>

          {/* Row 1: Avatar + Name | SOS + Bell */}
          <View style={styles.headerRow}>
            <View style={styles.driverBlock}>
              <View style={styles.avatarCircle}>
                {profile?.profile ? (
                  <Image
                    source={{ uri: profile.profile }}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                ) : (
                  <MaterialCommunityIcons name="account" size={22} color="#FF8C00" />
                )}
              </View>
              <View style={styles.driverTextBlock}>
                <Text style={styles.welcomeLabel}>Welcome back</Text>
                <Text style={styles.driverName} numberOfLines={1}>
                  {profile?.name ?? 'Driver'}
                </Text>
              </View>
            </View>

            <View style={styles.headerIcons}>
              <TouchableOpacity
                style={styles.sosButton}
                onPress={() => {
                  const phone = 100;
                  phone
                    ? Linking.openURL(`tel:${phone}`)
                    : Alert.alert('SOS', 'No phone number available.');
                }}
              >
                <Text style={styles.sosText}>SOS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.iconCircle}
                onPress={() => navigation.navigate('NotificationScreen')}
              >
                <MaterialCommunityIcons name="bell-outline" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Row 2: Location | Online toggle */}
          <View style={styles.statusRow}>
            <View style={styles.locationBlock}>
              <MaterialCommunityIcons name="map-marker-outline" size={13} color="#000" />
              <Text style={styles.locationText} numberOfLines={1}>{currentAddress}</Text>
            </View>
            <View style={styles.toggleBlock}>
              <Text style={styles.toggleLabel}>{isOnline ? 'Online' : 'Offline'}</Text>
              <Switch
                value={isOnline}
                onValueChange={handleToggle}
                trackColor={{ false: '#55555580', true: '#22c55e' }}
                thumbColor="#fff"
                ios_backgroundColor="#55555580"
                style={styles.switch}
              />
            </View>
          </View>

        </View>
        {/* ── END HEADER ── */}

        <View style={styles.body}>

          {/* ── Earnings hero card ── */}
          <View style={styles.earningsCard}>
            <View style={styles.earningsTopRow}>
              <Text style={styles.earningsLabel}>Weekly Earnings</Text>
            </View>

            {/* ✅ todayEarning state */}
            <Text style={styles.earningsAmount}>{formatFare(todayEarning)}</Text>

            <View style={styles.goalRow}>
              <Text style={styles.goalLabel}>weekly goal: {formatFare(goal)}</Text>
              <Text style={styles.goalPct}>{goalPct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${goalPct}%` }]} />
            </View>
          </View>

          {/* ── Stats row ── */}
          <View style={styles.statsRow}>
            {/* ✅ todayRides state */}
            <View style={styles.statCard}>
              <View style={styles.statIconRow}>
                <MaterialCommunityIcons name="car-outline" size={16} color="#FF8C00" />
                <Text style={styles.statLabel}>Rides</Text>
              </View>
              <Text style={styles.statValue}>{todayRides}</Text>
              {/* <Text style={styles.statMeta}>Today</Text> */}
            </View>

            <View style={styles.statDivider} />

            {/* ✅ todayWorkingHours state */}
            <View style={styles.statCard}>
              <View style={styles.statIconRow}>
                <MaterialCommunityIcons name="clock-outline" size={16} color="#FF8C00" />
                <Text style={styles.statLabel}>Hours</Text>
              </View>
              <Text style={[styles.statValue, { fontSize: 18 }]}>
                {todayWorkingHours}
              </Text>
              {/* <Text style={styles.statMeta}>Online</Text> */}
            </View>
          </View>

          {/* ── Wallet card ── */}
          {/* ✅ walletAmount state */}
          <View style={styles.walletCard}>
            <View style={styles.walletLeft}>
              <MaterialCommunityIcons name="wallet-outline" size={20} color="#FF8C00" />
              <Text style={styles.walletLabel}>Wallet Balance</Text>
            </View>
            <Text style={styles.walletAmount}>{formatFare(walletAmount)}</Text>
          </View>

          {/* ── Ongoing ride ── */}
          {ongoingRide && (
            <View style={styles.ongoingCard}>
              <View style={styles.ongoingHeader}>
                <MaterialCommunityIcons name="car" size={17} color="#FF8C00" />
                <Text style={styles.ongoingTitle}>Ongoing Ride</Text>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>
                    {ongoingRide?.booking_status_name ?? ''}
                  </Text>
                </View>
              </View>

              <View style={styles.routeContainer}>
                <View style={styles.routeDotsCol}>
                  <View style={[styles.routeDot, { backgroundColor: '#22c55e' }]} />
                  <View style={styles.routeConnector} />
                  <View style={[styles.routeDot, { backgroundColor: '#ef4444' }]} />
                </View>
                <View style={styles.routeAddressCol}>
                  <View style={styles.routeAddressBlock}>
                    <Text style={styles.routeAddressLabel}>Pickup</Text>
                    <Text style={styles.routeAddressText} numberOfLines={2}>
                      {ongoingRide.picup_location ?? '—'}
                    </Text>
                  </View>
                  <View style={styles.routeAddressBlock}>
                    <Text style={styles.routeAddressLabel}>Drop-off</Text>
                    <Text style={styles.routeAddressText} numberOfLines={2}>
                      {ongoingRide.drop_location ?? '—'}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.resumeButton}
                onPress={() => handleResumeRide(ongoingRide)}
                activeOpacity={0.85}
              >
                <Text style={styles.resumeButtonText}>Resume Ride</Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          )}

          {/* ── Quick actions ── */}
          {/* <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {QUICK_ACTIONS.map((item) => (
              <TouchableOpacity
                key={item.label}
                style={styles.actionCard}
                activeOpacity={0.8}
                onPress={() => navigation.navigate(item.screen)}
              >
                <View style={styles.actionIconWrap}>
                  <MaterialCommunityIcons name={item.icon} size={20} color="#FF8C00" />
                </View>
                <Text style={styles.actionLabel}>{item.label}</Text>
                <Text style={styles.actionSub}>{item.sub}</Text>
              </TouchableOpacity>
            ))}
          </View> */}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:         { flex: 1, backgroundColor: '#DF9323' },
  container:        { flex: 1, backgroundColor: '#101010' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#101010' },

  // Header
  header:           { backgroundColor: '#DF9323', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14, gap: 10 },
  headerRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  driverBlock:      { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatarCircle:     { width: 42, height: 42, borderRadius: 21, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  avatarImage:      { width: '100%', height: '100%' },
  driverTextBlock:  { flex: 1 },
  welcomeLabel:     { fontSize: 11, color: '#0008', fontWeight: '500', letterSpacing: 0.3 },
  driverName:       { fontSize: 17, fontWeight: '700', color: '#000', marginTop: 1 },
  headerIcons:      { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sosButton:        { backgroundColor: '#d32f2f', borderRadius: 7, paddingHorizontal: 11, paddingVertical: 6 },
  sosText:          { color: '#fff', fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  iconCircle:       { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0002', justifyContent: 'center', alignItems: 'center' },
  statusRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#0001', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  locationBlock:    { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1, marginRight: 8 },
  locationText:     { fontSize: 11, color: '#000', fontWeight: '500', flex: 1 },
  toggleBlock:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toggleLabel:      { fontSize: 12, fontWeight: '700', color: '#000' },
  switch:           { transform: [{ scaleX: 0.88 }, { scaleY: 0.88 }] },

  // Body
  body:             { padding: 14, paddingBottom: 24, gap: 12 },

  // Earnings card
  earningsCard:     { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 18, borderWidth: 0.5, borderColor: '#2E2E2E' },
  earningsTopRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  earningsLabel:    { fontSize: 12, color: '#888', fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.6 },
  earningsAmount:   { fontSize: 30, fontWeight: '700', color: '#FF8C00', marginBottom: 10, letterSpacing: 0.5 },
  goalRow:          { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  goalLabel:        { fontSize: 11, color: '#555' },
  goalPct:          { fontSize: 11, color: '#FF8C00', fontWeight: '700' },
  progressTrack:    { height: 4, backgroundColor: '#2C2C2C', borderRadius: 2, overflow: 'hidden' },
  progressFill:     { height: 4, backgroundColor: '#FF8C00', borderRadius: 2 },

  // Stats row
  statsRow:         { flexDirection: 'row', backgroundColor: '#1A1A1A', borderRadius: 16, borderWidth: 0.5, borderColor: '#2E2E2E', overflow: 'hidden' },
  statCard:         { flex: 1, padding: 16, gap: 4 },
  statDivider:      { width: 0.5, backgroundColor: '#2E2E2E', marginVertical: 12 },
  statIconRow:      { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  statLabel:        { fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue:        { fontSize: 24, fontWeight: '700', color: '#FF8C00' },
  statMeta:         { fontSize: 11, color: '#555' },

  // Wallet card
  walletCard:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, borderWidth: 0.5, borderColor: '#2E2E2E' },
  walletLeft:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  walletLabel:      { fontSize: 13, color: '#888', fontWeight: '500' },
  walletAmount:     { fontSize: 18, fontWeight: '700', color: '#FF8C00' },

  // Ongoing ride
  ongoingCard:      { backgroundColor: '#1A1A1A', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FF8C00', gap: 12 },
  ongoingHeader:    { flexDirection: 'row', alignItems: 'center', gap: 7 },
  ongoingTitle:     { fontSize: 14, fontWeight: '700', color: '#FF8C00', flex: 1 },
  statusBadge:      { backgroundColor: '#2C2C2C', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  statusText:       { fontSize: 10, color: '#ccc', fontWeight: '600', textTransform: 'capitalize' },
  routeContainer:   { flexDirection: 'row', gap: 10 },
  routeDotsCol:     { alignItems: 'center', paddingTop: 4, gap: 0 },
  routeDot:         { width: 10, height: 10, borderRadius: 5 },
  routeConnector:   { width: 1.5, flex: 1, backgroundColor: '#333', marginVertical: 3 },
  routeAddressCol:  { flex: 1, gap: 12 },
  routeAddressBlock:{ gap: 2 },
  routeAddressLabel:{ fontSize: 10, color: '#666', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  routeAddressText: { fontSize: 13, color: '#ccc', lineHeight: 18 },
  resumeButton:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF8C00', borderRadius: 12, paddingVertical: 13, gap: 6 },
  resumeButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  // Quick actions
  sectionTitle:     { fontSize: 11, fontWeight: '700', color: '#555', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  actionsGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard:       { width: '47.5%', backgroundColor: '#1A1A1A', borderRadius: 14, padding: 14, borderWidth: 0.5, borderColor: '#2E2E2E', gap: 6 },
  actionIconWrap:   { width: 38, height: 38, borderRadius: 11, backgroundColor: '#FF8C0015', justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
  actionLabel:      { fontSize: 13, fontWeight: '700', color: '#fff' },
  actionSub:        { fontSize: 11, color: '#555' },
});