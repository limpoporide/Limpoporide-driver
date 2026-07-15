import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  PermissionsAndroid,
  Platform,
  StatusBar,
  TextInput,
  Linking,
  KeyboardAvoidingView,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Geolocation from 'react-native-geolocation-service';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { driverAuthAPI, ridesAPI } from '../../services/api';
import toastService from '../../Utility/toast';
import { useSocket } from '../../webSocket/SocketContext';
import useSocketListener from '../../webSocket/useSocketListener';
import { useSelector } from 'react-redux';
import { SOCKET_EVENTS } from '../../webSocket/socketEvents';

const C = {
  bg: '#0B0B0B',
  orange: '#E59332',
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0B0',
  border: '#2D2D2D',
};

const CANCELLED_STATUSES = ['cancelled_by_user', 'cancelled_by_driver', 'cancelled_by_admin'];

export default function ReachedOnLocationMap({ navigation, route }) {
  const { ride } = route.params;
  console.log('ReachedOnLocationMap ride ===>', ride);

  const [location, setLocation]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [otp, setOtp]                 = useState('');
  const [showSuccessBanner, setShowSuccessBanner] = useState(false);

  const mapViewRef            = useRef(null);
  const watchIdRef            = useRef(null);
  const locationInitialized   = useRef(false);
  const pollIntervalRef       = useRef(null);

  useEffect(() => {
    requestLocationPermission();
    // startStatusPolling();
    return () => {
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
      }
      stopStatusPolling();
    };
  }, []);

       useSocketListener(SOCKET_EVENTS.USER_CANCELLED, data => {
        console.log("User Canclled Ride OTP Screen --->");
                        navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })
        });

  // Start live watch once location is set
  useEffect(() => {
    if (!location || locationInitialized.current) return;
    locationInitialized.current = true;

    watchIdRef.current = Geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
        try {
          await driverAuthAPI.updateLocation(latitude, longitude);
        } catch (e) {
          console.error('Location update error:', e);
        }
      },
      (error) => console.error('Watch error:', error),
      {
        enableHighAccuracy: true,
        distanceFilter: 10,
        interval: 5000,
        fastestInterval: 3000,
      }
    );
  }, [location]);

  // ── Polling ───────────────────────────────────────────────────────────────

  // const startStatusPolling = () => {
  //   checkAllStatus();
  //   pollIntervalRef.current = setInterval(() => checkAllStatus(), 5000);
  // };

  const stopStatusPolling = () => {
    if (pollIntervalRef.current !== null) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  const checkAllStatus = async () => {
    try {
      const response = await ridesAPI.checkStatus({ ride_id: ride?.id }); // ✅ ride.id
      const rideStatus = response?.data?.ride_status;

      if (rideStatus && CANCELLED_STATUSES.includes(rideStatus)) {
        stopStatusPolling();
        if (watchIdRef.current !== null) {
          Geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
        Alert.alert(
          'Ride Cancelled',
          'This ride has been Cancelled.',
          [
            {
              text: 'OK',
              onPress: () =>
                navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] }),
            },
          ],
          { cancelable: false }
        );
      }
    } catch (error) {
      console.log('checkAllStatus error:', error);
    }
  };

  // ── Location permission ───────────────────────────────────────────────────

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const alreadyGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (!alreadyGranted) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: 'Location Permission',
              message: 'App needs access to your location',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            Alert.alert('Permission Denied', 'Location permission is required');
            setLoading(false);
            return;
          }
        }
      }

      Geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({ latitude, longitude });
          setLoading(false);
          mapViewRef.current?.animateToRegion({
            latitude,
            longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        },
        (error) => {
          Alert.alert('Error', error.message);
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } catch {
      Alert.alert('Error', 'Location permission denied');
      setLoading(false);
    }
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleCall = () => {
    if (!ride?.mobile_no) return;                    // ✅ ride.mobile_no
    Linking.openURL(`tel:${ride.mobile_no}`);
  };

  const handleChat = () => {
    navigation.navigate('ChatScreen', { data: ride }); // ✅ ride.id
  };

  const handleVerifyOtp = async () => {
    
    if (otp.length === 0) {
      Alert.alert('Error', 'Please enter OTP');
      return;
    }
    if (otp.length < 4) {
      Alert.alert('Error', 'Please enter a valid OTP');
      return;
    }
    setSubmitting(true);
    try {
      const response = await ridesAPI.verifyOtp({
        booking_id: ride?.booking_id,  
        otp: otp,
      });
      console.log('verifyOtp response:', response);

      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      if (response?.status) {
        setShowSuccessBanner(true);
        setTimeout(() => {
          setShowSuccessBanner(false);
          navigation.replace('RideInProgress', {
            ride,
            verifyResponse: response?.data ?? null,
          });
        }, 1500);
      }
      toastService.success(response?.message);
    } catch (error) {
      console.log('verifyOtp error:', error);
      Alert.alert('Invalid OTP', error?.message || 'OTP verification failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    Alert.alert('Cancel Ride', 'Are you sure you want to cancel?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: () =>
          navigation.navigate('ReasonForCancel', {
            rideId: ride?.booking_id,           // ✅ ride.id
          }),
      },
    ]);
  };

  // ── Pickup coords from ride data ──────────────────────────────────────────

  // ✅ Use ride.picup_lat / ride.picup_long directly
  const pickupCoords =
    ride?.picup_lat && ride?.picup_long
      ? {
          latitude:  parseFloat(ride.picup_lat),
          longitude: parseFloat(ride.picup_long),
        }
      : null;

  // ── Loading screen ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={C.orange} />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar backgroundColor={C.bg} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Enter OTP</Text>
        <View style={{ width: 36 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Map */}
        {location && (
          <MapView
            ref={mapViewRef}
            style={styles.map}
            userInterfaceStyle="dark"
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            {/* Driver marker */}
            <Marker coordinate={location} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.driverMarker}>
                <MaterialCommunityIcons name="car" size={20} color="#fff" />
              </View>
            </Marker>

            {/* Pickup marker */}
            {pickupCoords && (
              <Marker coordinate={pickupCoords} anchor={{ x: 0.5, y: 1 }}>
                <View style={styles.markerWrap}>
                  <View style={styles.markerBubble}>
                    <Text style={styles.markerBubbleText}>Pickup</Text>
                  </View>
                  <MaterialCommunityIcons name="map-marker" size={32} color="#FF8C00" />
                </View>
              </Marker>
            )}
          </MapView>
        )}

        {/* Success Banner */}
        {showSuccessBanner && (
          <View style={styles.successBanner}>
            <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
            <Text style={styles.successText}>OTP Verified! Starting ride...</Text>
          </View>
        )}

        {/* Bottom Card */}
        <View style={styles.otpCard}>

          {/* Passenger row */}
          <View style={styles.passengerRow}>
            <View style={styles.passengerAvatar}>
              <MaterialCommunityIcons name="account" size={22} color={C.orange} />
            </View>
            <View style={{ flex: 1 }}>
              {/* ✅ driver_name from ride */}
              <Text style={styles.passengerName}>{ride?.driver_name ?? '—'}</Text>
              {/* ✅ booking_id from ride */}
              <Text style={styles.bookingId}>Booking ID: {ride?.booking_id ?? '—'}</Text>
            </View>
            {/* Chat & Call */}
            <TouchableOpacity style={styles.iconBtn} onPress={handleChat}>
              <MaterialCommunityIcons name="chat" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, { marginLeft: 8 }]} onPress={handleCall}>
              <MaterialCommunityIcons name="phone" size={18} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* OTP instruction */}
          <Text style={styles.instruction}>Enter OTP to start the ride</Text>

          {/* OTP Input */}
          <TextInput
            style={styles.otpInput}
            placeholder="• • • •"
            placeholderTextColor={C.textSecondary}
            keyboardType="number-pad"
            maxLength={4}
            value={otp}
            onChangeText={setOtp}
          />

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={[styles.actionBtn, styles.cancelBtn]} onPress={handleCancel}>
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.continueBtn, submitting && styles.disabledBtn]}
              onPress={handleVerifyOtp}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.btnText}>Verify & Start</Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Pickup address */}
          <View style={styles.addressRow}>
            <View style={styles.dotPickup} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>PICKUP</Text>
              {/* ✅ picup_location from ride */}
              <Text style={styles.addressText}>{ride?.picup_location ?? '—'}</Text>
            </View>
          </View>

          <View style={styles.connectorLine} />

          {/* Drop address */}
          <View style={styles.addressRow}>
            <View style={styles.dotDrop} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.addressLabel, { color: '#ef4444' }]}>DROP-OFF</Text>
              {/* ✅ drop_location from ride */}
              <Text style={styles.addressText}>{ride?.drop_location ?? '—'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Fare + Date row */}
          <View style={styles.distanceFareRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Booking Date</Text>
              {/* ✅ booking_date from ride */}
              <Text style={styles.metaValue}>{ride?.booking_date ?? '—'}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Booking Time</Text>
              {/* ✅ booking_time from ride */}
              <Text style={styles.metaValue}>{ride?.booking_time ?? '—'}</Text>
            </View>
            <View style={[styles.metaItem, { alignItems: 'flex-end' }]}>
              <Text style={styles.metaLabel}>Fare</Text>
              {/* ✅ fare from ride */}
              <Text style={styles.fareValue}>R{ride?.fare ?? '0'}</Text>
            </View>
          </View>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:         { flex: 1, backgroundColor: C.bg },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.bg },
  backBtn:          { width: 36, height: 36, borderRadius: 10, backgroundColor: '#0E0E0E', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  headerTitle:      { color: C.textPrimary, fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
  container:        { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
  loadingText:      { marginTop: 12, fontSize: 16, color: C.textSecondary },
  map:              { flex: 1 },

  // Markers
  driverMarker:     { width: 38, height: 38, borderRadius: 19, backgroundColor: C.orange, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  markerWrap:       { alignItems: 'center' },
  markerBubble:     { backgroundColor: '#FF8C00', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 2 },
  markerBubbleText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Success banner
  successBanner:    { position: 'absolute', top: 20, left: 20, right: 20, backgroundColor: '#22c55e', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 99, elevation: 10 },
  successText:      { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Card
  otpCard:          { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#121212', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, borderTopWidth: 1, borderColor: C.border, elevation: 8 },

  // Passenger row
  passengerRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  passengerAvatar:  { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E1E1E', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  passengerName:    { fontSize: 14, fontWeight: '700', color: '#fff' },
  bookingId:        { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  iconBtn:          { width: 38, height: 38, borderRadius: 19, backgroundColor: C.orange, justifyContent: 'center', alignItems: 'center' },

  divider:          { height: 1, backgroundColor: C.border, marginBottom: 12, marginTop: 4 },

  instruction:      { fontSize: 14, color: C.textSecondary, fontWeight: '500', marginBottom: 10 },
  otpInput:         { backgroundColor: '#1C1C1E', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 22, fontWeight: '700', color: C.textPrimary, textAlign: 'center', letterSpacing: 8, marginBottom: 14, borderWidth: 1, borderColor: C.border },

  buttonRow:        { flexDirection: 'row', gap: 12, marginBottom: 14 },
  actionBtn:        { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  continueBtn:      { backgroundColor: C.orange },
  cancelBtn:        { backgroundColor: '#2C2C2C', borderWidth: 1, borderColor: C.border },
  disabledBtn:      { opacity: 0.6 },
  btnText:          { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Address
  addressRow:       { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 4 },
  dotPickup:        { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF8C00', marginTop: 13 },
  dotDrop:          { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444', marginTop: 13 },
  connectorLine:    { width: 1, height: 10, backgroundColor: '#444', marginLeft: 4, marginBottom: 4 },
  addressLabel:     { fontSize: 10, fontWeight: '700', color: C.orange, letterSpacing: 0.8, marginBottom: 2 },
  addressText:      { fontSize: 12, color: '#ccc', lineHeight: 18 },

  // Fare row
  distanceFareRow:  { flexDirection: 'row', justifyContent: 'space-between' },
  metaItem:         { flex: 1 },
  metaLabel:        { fontSize: 11, color: C.textSecondary, marginBottom: 3 },
  metaValue:        { fontSize: 13, fontWeight: '700', color: '#fff' },
  fareValue:        { fontSize: 16, fontWeight: '800', color: C.orange },
});