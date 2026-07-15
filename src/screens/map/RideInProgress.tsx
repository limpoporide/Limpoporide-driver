import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Linking,
  Animated,
  PanResponder,
  Image,
  Share,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import Geolocation from 'react-native-geolocation-service';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ridesAPI } from '../../services/api';
import toastService from '../../Utility/toast';
import Config from 'react-native-config';
import useSocketListener from '../../webSocket/useSocketListener';
import { SOCKET_EVENTS } from '../../webSocket/socketEvents';
import { Modal } from 'react-native';


const GOOGLE_MAPS_API_KEY = Config.GOOGLE_MAPS_API_KEY ?? '';

const C = { bg: '#0B0B0B', orange: '#E59332', textPrimary: '#FFFFFF', border: '#2D2D2D' };

const PEEK_HEIGHT = 44;
// NOTE: TAB_BAR_HEIGHT removed — this screen is a stack screen (no bottom
// tab bar rendered here), so it was incorrectly padding the drag/hide math.

// ── Live tracking constants (same as RideStarted reference) ──────────────────
const ANIM_DURATION_MS = 900;
const SMOOTH_STEPS     = 60;
const MIN_MOVE_METRES  = 5;

// ⚠️ Placeholder emergency contact — wire this up to wherever your app
// stores the driver's configured SOS number (profile API, Redux, or
// AsyncStorage), the same way you'd wire up `sosNumber` on the rider side.
const SOS_CONTACT_NUMBER = '100';

// ⚠️ Replace with your actual public tracking domain/route once the
// backend/web tracking page exists. Should require no login — just the
// booking_id — since whoever opens it isn't necessarily a registered user.
const LIVE_TRACKING_BASE_URL = 'https://yourapp.com/track-ride';

// ── Pure helpers (same as RideStarted reference) ──────────────────────────────
const toRad = (v) => (v * Math.PI) / 180;

const haversineMetres = (a, b) => {
  if (!a || !b) return 0;
  const R    = 6371000;
  const dLat = toRad(b.latitude  - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const sa   =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa));
};

const getBearing = (from, to) => {
  const lat1 = toRad(from.latitude);
  const lat2 = toRad(to.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const y    = Math.sin(dLon) * Math.cos(lat2);
  const x    =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

const lerp = (from, to, t) => ({
  latitude:  from.latitude  + (to.latitude  - from.latitude)  * t,
  longitude: from.longitude + (to.longitude - from.longitude) * t,
});

export default function RideInProgress({ navigation, route }) {
  const { ride } = route.params;
  console.log('Ride in Progress --->', ride);

  const insets = useSafeAreaInsets();

  const [loading,          setLoading]          = useState(true);
  const [completing,       setCompleting]        = useState(true);
  const [routeInfo,        setRouteInfo]         = useState({ distance: '—', duration: '—' });
  const [showSuccessBanner,setShowSuccessBanner] = useState(true);

  // ── Live tracking state (same as RideStarted) ─────────────────────────────
  const [vehicleCoord,   setVehicleCoord]   = useState(null);
  const [vehicleHeading, setVehicleHeading] = useState(0);

  const travelledRef                      = useRef([]);
  const [travelledPath, setTravelledPath] = useState([]);

  const queueRef     = useRef([]);
  const animatingRef = useRef(false);
  const prevRef      = useRef(null);
  const timerRef     = useRef(null);
  const lastRawRef   = useRef(null);
  const watchIdRef   = useRef(null);

  const mapViewRef    = useRef(null);
  const cardTranslateY = useRef(new Animated.Value(0)).current;
  const cardHeightRef  = useRef(0);
  const cardIsVisible  = useRef(true);
  const [isCompleting, setIsCompleting] = useState(false); // API loading
  const [canCompleteRide, setCanCompleteRide] = useState(false); // Distance check
  const [sosSending, setSosSending] = useState(false);
  const [sosOptionsVisible, setSosOptionsVisible] = useState(false);



  // ── Coords from ride data ─────────────────────────────────────────────────
  const pickupCoords = ride?.picup_lat && ride?.picup_long
    ? { latitude: parseFloat(ride.picup_lat), longitude: parseFloat(ride.picup_long) }
    : null;

  const dropCoords = ride?.drop_lat && ride?.drop_long
    ? { latitude: parseFloat(ride.drop_lat), longitude: parseFloat(ride.drop_long) }
    : null;

  // ── Drag card ──────────────────────────────────────────────────────────────
  // Hide translate = how far to push the card down so only PEEK_HEIGHT
  // remains visible above the physical bottom edge. Card itself is anchored
  // at bottom:0 and its own paddingBottom accounts for the safe-area inset,
  // so no additional inset/tab-bar subtraction is needed here.
  const getHideTranslate = () =>
    cardHeightRef.current - PEEK_HEIGHT;

  useEffect(() => {
    if (!vehicleCoord || !dropCoords) return;

    const distance = haversineMetres(vehicleCoord, dropCoords);

    console.log('Distance:', distance);

    setCanCompleteRide(distance <= 350);
  }, [vehicleCoord, dropCoords]);

  useSocketListener(SOCKET_EVENTS.USER_CANCELLED, data => {
    console.log("User Canclled Ride Started Screen --->");
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })
  });

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 8,
      onPanResponderMove: (_, gs) => {
        if (cardIsVisible.current && gs.dy > 0)
          cardTranslateY.setValue(gs.dy);
        else if (!cardIsVisible.current && gs.dy < 0)
          cardTranslateY.setValue(getHideTranslate() + gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (cardIsVisible.current && gs.dy > 60) {
          cardIsVisible.current = false;
          Animated.timing(cardTranslateY, {
            toValue: getHideTranslate(), duration: 280, useNativeDriver: true,
          }).start();
        } else if (!cardIsVisible.current && gs.dy < -60) {
          cardIsVisible.current = true;
          Animated.timing(cardTranslateY, {
            toValue: 0, duration: 280, useNativeDriver: true,
          }).start();
        } else {
          Animated.timing(cardTranslateY, {
            toValue: cardIsVisible.current ? 0 : getHideTranslate(),
            duration: 200, useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  // ── Fit map between vehicle and drop (same as RideStarted) ───────────────
  useEffect(() => {
    if (mapViewRef?.current && vehicleCoord && dropCoords) {
      mapViewRef.current?.fitToCoordinates([vehicleCoord, dropCoords], {
        edgePadding: { top: 100, right: 80, bottom: 320, left: 80 },
        animated: true,
      });
    }
  }, [vehicleCoord]);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  useEffect(() => {
    requestLocationPermission();
    const timer = setTimeout(() => setShowSuccessBanner(false), 3000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      clearTimeout(timer);
    };
  }, []);

  // ── Animate one GPS segment (same as RideStarted) ────────────────────────
  const animateSegment = useCallback((from, to, bearing, onDone) => {
    let step = 0;
    setVehicleHeading(bearing);

    const tick = () => {
      step++;
      const t     = Math.min(step / SMOOTH_STEPS, 1);
      const point = lerp(from, to, t);

      setVehicleCoord(point);
      travelledRef.current.push(point);

      if (step < SMOOTH_STEPS) {
        timerRef.current = setTimeout(tick, ANIM_DURATION_MS / SMOOTH_STEPS);
      } else {
        setTravelledPath([...travelledRef.current]);
        onDone();
      }
    };

    tick();
  }, []);

  // ── Drain queue one segment at a time (same as RideStarted) ──────────────
  const drainQueue = useCallback(() => {
    if (animatingRef.current || queueRef.current.length === 0) return;

    const next = queueRef.current.shift();
    const from = prevRef.current;

    if (!from) {
      prevRef.current      = next;
      travelledRef.current = [next];
      setVehicleCoord(next);
      setTravelledPath([next]);
      drainQueue();
      return;
    }

    const bearing        = getBearing(from, next);
    animatingRef.current = true;

    animateSegment(from, next, bearing, () => {
      prevRef.current      = next;
      animatingRef.current = false;
      drainQueue();
    });

    // ✅ 3D follow camera (same as RideStarted)
    mapViewRef.current?.animateCamera(
      { center: next, heading: bearing, pitch: 45, zoom: 17 },
      { duration: ANIM_DURATION_MS }
    );
  }, [animateSegment]);

  // ── Accept new raw GPS point (same as RideStarted) ───────────────────────
  const onNewLocation = useCallback(
    (pt) => { queueRef.current.push(pt); drainQueue(); },
    [drainQueue]
  );

  // ── GPS handler (same as RideStarted) ────────────────────────────────────
  const handleGPSPosition = useCallback(
    (position) => {
      const { latitude, longitude } = position.coords;
      const next = { latitude, longitude };
      const dist = haversineMetres(lastRawRef.current, next);
      if (!lastRawRef.current || dist >= MIN_MOVE_METRES) {
        lastRawRef.current = next;
        onNewLocation(next);
      }
    },
    [onNewLocation]
  );

  // ── Location permission + GPS watch (same as RideStarted) ────────────────
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

      // Step 1a: cached location instantly
      Geolocation.getCurrentPosition(
        (pos) => { handleGPSPosition(pos); setLoading(false); },
        () => {
          // Step 1b: low accuracy fallback
          Geolocation.getCurrentPosition(
            (pos) => { handleGPSPosition(pos); setLoading(false); },
            () => setLoading(false),
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 0 }
          );
        },
        { enableHighAccuracy: false, timeout: 3000, maximumAge: Infinity }
      );

      // Step 2: continuous GPS watch
      watchIdRef.current = Geolocation.watchPosition(
        handleGPSPosition,
        (error) => console.log('watchPosition error:', error.message),
        {
          enableHighAccuracy:   true,
          distanceFilter:       0,
          interval:             2000,
          fastestInterval:      1000,
          forceRequestLocation: true,
          showLocationDialog:   true,
        }
      );
    } catch {
      Alert.alert('Error', 'Location permission denied');
      setLoading(false);
    }
  };

  // ── Cleanup GPS watch on unmount ──────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, []);

  // ── Navigate to drop ──────────────────────────────────────────────────────
  const handleNavigate = async () => {
    const lat = parseFloat(ride?.drop_lat);
    const lng = parseFloat(ride?.drop_long);
    if (!lat || !lng) return;

    const wazeUrl      = Platform.select({
      ios:     `waze://?ll=${lat},${lng}&navigate=yes`,
      android: `waze://ul?ll=${lat},${lng}&navigate=yes`,
    });
    const googleUrl    = Platform.select({
      ios:     `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`,
      android: `google.navigation:q=${lat},${lng}`,
    });
    const browserUrl   = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

    try {
      // Try Waze first (same as RideStarted)
      const wazeInstalled = await Linking.canOpenURL(wazeUrl);
      if (wazeInstalled) { await Linking.openURL(wazeUrl); return; }

      // Try Google Maps
      const googleInstalled = await Linking.canOpenURL(googleUrl);
      if (googleInstalled) { await Linking.openURL(googleUrl); return; }

      // Fallback browser
      await Linking.openURL(browserUrl);
    } catch {
      Linking.openURL(browserUrl);
    }
  };

  // ── Call / Chat ───────────────────────────────────────────────────────────
  const handleCall = () => {
    if (!ride?.mobile_no) return;
    Linking.openURL(`tel:${ride.mobile_no}`);
  };

  const handleChat = () => {
    navigation.navigate('ChatScreen', { data: ride });
  };




  const handleSOS = () => {
  if (!SOS_CONTACT_NUMBER) {
    Alert.alert(
      'No SOS contact configured',
      'Please set up an emergency contact number for SOS to work.'
    );
    return;
  }
  setSosOptionsVisible(true);
};

// Builds a fresh message with the driver's current location, called at
// the moment an SOS action is actually chosen (not when the sheet opens).
const buildSosMessage = () => {
  const coords = vehicleCoord || lastRawRef.current;
  const mapsLink = coords
    ? `https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`
    : null;

  return (
    `🚨 SOS! I need help.\n` +
    `Booking ID: ${ride?.booking_id ?? '—'}\n` +
    `Passenger: ${ride?.user_name ?? '—'}\n` +
    (mapsLink ? `My location: ${mapsLink}` : 'Location unavailable')
  );
};

const handleSOSCall = async () => {
  setSosOptionsVisible(false);
  setSosSending(true);
  try {
    await Linking.openURL(`tel:${SOS_CONTACT_NUMBER}`);
  } catch (e) {
    console.log('SOS call error:', e);
    Alert.alert('Error', 'Unable to make phone call. Please dial manually.');
  } finally {
    setSosSending(false);
  }
};

const handleSOSMessage = async () => {
  setSosOptionsVisible(false);
  setSosSending(true);
  try {
    const smsSeparator = Platform.OS === 'ios' ? '&' : '?';
    const smsUrl = `sms:${SOS_CONTACT_NUMBER}${smsSeparator}body=${encodeURIComponent(buildSosMessage())}`;
    await Linking.openURL(smsUrl);
  } catch (e) {
    console.log('SOS message error:', e);
    Alert.alert('Error', 'Unable to open messages app.');
  } finally {
    setSosSending(false);
  }
};

const handleSOSShare = async () => {
  setSosOptionsVisible(false);
  setSosSending(true);
  try {
    await Share.share({ message: buildSosMessage(), title: 'SOS Alert' });
  } catch (e) {
    console.log('SOS share error:', e);
  } finally {
    setSosSending(false);
  }
};

 const handleShareLiveLocation = async () => {
  const coords = vehicleCoord || lastRawRef.current;

  if (!coords) {
    Alert.alert('Location unavailable', 'Waiting for a GPS fix — try again in a moment.');
    return;
  }

  // Universal Google Maps link — opens the Maps app if installed,
  // falls back to the browser otherwise, on both iOS and Android.
  const mapsLink = `https://www.google.com/maps/search/?api=1&query=${coords.latitude},${coords.longitude}`;

  const message =
    `📍 My current ride location.\n` +
    `Booking ID: ${ride?.booking_id ?? '—'}\n` +
    `${mapsLink}`;

  try {
    await Share.share({ message, title: 'My Location' });
  } catch (e) {
    console.log('Share location error:', e);
  }
};


  // ── Cancel ────────────────────────────────────────────────────────────────
  const handleCancel = () => {
    Alert.alert('Cancel Ride', 'Are you sure you want to cancel?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: () => navigation.navigate('ReasonForCancel', { rideId: ride?.booking_id }),
      },
    ]);
  };

  // ── Complete ride ─────────────────────────────────────────────────────────
  const handleCompleteRide = async () => {
    if (!canCompleteRide) {
    toastService.error('You must be within 500m of the drop location to complete this ride.');
      return;
    }

    Alert.alert(
      'Complete Ride',
      'Are you sure you want to complete this ride?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            setIsCompleting(true);

            try {
              const response = await ridesAPI.updateRideStatus({
                booking_id: ride?.booking_id,
              });

              toastService.success(response?.message);

              navigation.reset({
                index: 1,
                routes: [
                  { name: 'MainTabs' },
                  { name: 'BookingDetails', params: { ride } },
                ],
              });
            } catch (error) {
              Alert.alert(
                'Error',
                'Failed to complete ride. Please try again.'
              );
            } finally {
              setIsCompleting(false);
            }
          },
        },
      ]
    );
  };

  // ── Fit map to route ──────────────────────────────────────────────────────
  const fitMapToRoute = () => {
    if (!vehicleCoord || !dropCoords) return;
    mapViewRef.current?.fitToCoordinates(
      [vehicleCoord, dropCoords],
      { edgePadding: { top: 80, right: 60, bottom: 420, left: 60 }, animated: true }
    );
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8C00" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  const defaultRegion = {
    latitude:      vehicleCoord?.latitude  ?? dropCoords?.latitude  ?? 0,
    longitude:     vehicleCoord?.longitude ?? dropCoords?.longitude ?? 0,
    latitudeDelta:  0.05,
    longitudeDelta: 0.05,
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar backgroundColor="#0B0B0B" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride In Progress</Text>
        <View style={styles.headerRight}>
          {/* <TouchableOpacity style={styles.sosHeaderBtn} onPress={handleSOS} activeOpacity={0.8}>
            <Text style={styles.sosHeaderBtnText}>SOS</Text>
          </TouchableOpacity> */}
          <TouchableOpacity
  style={styles.sosHeaderBtn}
  onPress={handleSOS}
  disabled={sosSending}
  activeOpacity={0.8}
>
  {sosSending ? (
    <ActivityIndicator size="small" color="#fff" />
  ) : (
    <Text style={styles.sosHeaderBtnText}>SOS</Text>
  )}
</TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={fitMapToRoute}>
            <MaterialCommunityIcons name="map-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Success Banner */}
      {showSuccessBanner && (
        <View style={styles.successBannerTop}>
          <MaterialCommunityIcons name="check-circle" size={18} color="#22c55e" />
          <Text style={styles.successBannerTopText}>Ride Started Successfully!</Text>
        </View>
      )}

      <View style={styles.container}>
        {/* ── Map ── */}
        <MapView
          ref={mapViewRef}
          style={{flex:1}}
          showsUserLocation={false}
          followsUserLocation={false}
          initialRegion={defaultRegion}
        >
          {/* ── Travelled polyline (blue trail) ── */}
          {travelledPath.length >= 2 && (
            <Polyline
              coordinates={travelledPath}
              strokeColor="#1565C0"
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
              geodesic
              zIndex={3}
            />
          )}

          {/* ── Remaining route via Directions API ── */}
          {/* ✅ origin = vehicleCoord (live), destination = drop */}
          {vehicleCoord && dropCoords && (
            <MapViewDirections
              origin={vehicleCoord}
              destination={dropCoords}
              apikey={GOOGLE_MAPS_API_KEY}
              strokeWidth={4}
              strokeColor="#4A90E2"
              optimizeWaypoints={false}
              resetOnChange={false}       // ✅ prevents API call on every GPS tick
              onReady={(result) => {
                // ✅ same as RideStarted onReady
                setRouteInfo({
                  distance: `${result.distance.toFixed(1)} km`,
                  duration: `${Math.ceil(result.duration)} mins`,
                });
              }}
              onError={(e) => console.log('Directions error:', e)}
            />
          )}

          {/* ── Animated vehicle marker (same as RideStarted) ── */}
          {(vehicleCoord || lastRawRef.current) && (
            <Marker
              coordinate={{
                latitude:  vehicleCoord?.latitude  || 0,
                longitude: vehicleCoord?.longitude || 0,
              }}
              anchor={{ x: 0.5, y: 0.5 }}
              tracksViewChanges={false}
              flat
              rotation={vehicleHeading}
            >
              <View style={styles.driverMarker}>
                <MaterialCommunityIcons name="navigation" size={22} color="#fff" />
              </View>
            </Marker>
          )}

          {/* ── Pickup marker ── */}
          {/* {pickupCoords && (
            <Marker coordinate={pickupCoords} anchor={{ x: 0.5, y: 1 }}>
              <View style={styles.markerWrap}>
                <View style={[styles.markerBubble, { backgroundColor: '#FF8C00' }]}>
                  <Text style={styles.markerBubbleText}>Pickup</Text>
                </View>
                <MaterialCommunityIcons name="map-marker" size={32} color="#FF8C00" />
              </View>
            </Marker>
          )} */}

          {/* ── Drop marker ── */}
          {dropCoords && (
            <Marker coordinate={dropCoords} anchor={{ x: 0.5, y: 1 }}>
              <View style={styles.markerWrap}>
                <View style={[styles.markerBubble, { backgroundColor: '#ef4444' }]}>
                  <Text style={styles.markerBubbleText}>Drop-off</Text>
                </View>
                <MaterialCommunityIcons name="map-marker" size={32} color="#ef4444" />
              </View>
            </Marker>
          )}
        </MapView>

        {/* ── ETA + Distance badge (same as RideStarted) ── */}
        <View style={styles.estimateContainer}>
          <View style={styles.estimateBox}>
            <Text style={styles.estimateLabel}>ETA</Text>
            <Text style={styles.estimateValue}>{routeInfo.duration || '—'}</Text>
          </View>
          <View style={styles.estimateDivider} />
          <View style={styles.estimateBox}>
            <Text style={styles.estimateLabel}>Distance</Text>
            <Text style={styles.estimateValue}>{routeInfo.distance || '—'}</Text>
          </View>
        </View>

        {/* ── Bottom Card ── */}
        <Animated.View
          style={[
            styles.card,
            {
              paddingBottom: insets.bottom + 16,
              transform: [{ translateY: cardTranslateY }],
            },
          ]}
          onLayout={(e) => { cardHeightRef.current = e.nativeEvent.layout.height; }}
          {...panResponder.panHandlers}
        >
          {/* Drag handle */}
          <View style={styles.dragHandle} />

          {/* Booking ID */}
          <Text style={styles.bookingIdText}>
            Booking ID: {ride?.booking_id ?? '—'}
          </Text>

          {/* Navigate to Drop + Cancel */}
          <View style={styles.topButtonRow}>
            <TouchableOpacity style={[styles.topBtn, styles.navigateBtn]} onPress={handleNavigate}>
              <MaterialCommunityIcons name="navigation" size={15} color="#fff" />
              <Text style={styles.topBtnText}>Navigate to Drop</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.topBtn, styles.cancelTopBtn]} onPress={handleCancel}>
              <Text style={styles.topBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>

          {/* Share Live Location */}
          <TouchableOpacity
            style={styles.shareLiveBtn}
            onPress={handleShareLiveLocation}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="map-marker-radius" size={16} color="#fff" />
            <Text style={styles.shareLiveBtnText}>Share Live Location</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Customer row */}
          <View style={styles.customerRow}>
            <View style={styles.customerAvatar}>
              <MaterialCommunityIcons name="account" size={22} color="#E59332" />
            </View>
            <View style={{ flex: 1}}>
              <Text style={styles.customerName}>{ride?.user_name ?? '—'}</Text>
              <Text style={styles.customerPhone}>{ride?.mobile_no ?? '—'}</Text>
            </View>
            <TouchableOpacity style={styles.circleBtn} onPress={handleChat}>
              <MaterialCommunityIcons name="chat" size={17} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.circleBtn, { marginLeft: 8 }]} onPress={handleCall}>
              <MaterialCommunityIcons name="phone" size={17} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Pickup */}
          <View style={styles.addressRow}>
            <View style={styles.dotPickup} />
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>PICKUP LOCATION</Text>
              <Text style={styles.addressText}>{ride?.picup_location ?? '—'}</Text>
            </View>
          </View>

          <View style={styles.connectorLine} />

          {/* Drop */}
          <View style={styles.addressRow}>
            <View style={styles.dotDrop} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.addressLabel, { color: '#ef4444' }]}>DROP LOCATION</Text>
              <Text style={styles.addressText}>{ride?.drop_location ?? '—'}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Date + Time + Fare */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>{ride?.booking_date ?? '—'}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Time</Text>
              <Text style={styles.metaValue}>{ride?.booking_time ?? '—'}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={[styles.metaItem, { alignItems: 'flex-end' }]}>
              <Text style={styles.metaLabel}>Fare</Text>
              <Text style={styles.fareValue}>R{ride?.fare ?? '0'}</Text>
            </View>
          </View>

          {/* Complete Ride button */}
         <TouchableOpacity
  style={[
    styles.completeRideBtn,
    !canCompleteRide && styles.disabledBtn,
  ]}
  onPress={handleCompleteRide}
  disabled={!canCompleteRide || isCompleting}
>
            {isCompleting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="flag-checkered"
                  size={18}
                  color="#fff"
                />
                <Text style={styles.completeRideBtnText}>
                  Complete Ride
                </Text>
              </>
            )}
          </TouchableOpacity>

        </Animated.View>
      </View>
      <Modal
  visible={sosOptionsVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setSosOptionsVisible(false)}
>
  <TouchableOpacity
    style={styles.backdrop}
    activeOpacity={1}
    onPress={() => setSosOptionsVisible(false)}
  >
    <View style={styles.sheet}>
      <View style={styles.sheetHandle} />
      <Text style={styles.sheetTitle}>Send SOS Alert</Text>
      <Text style={styles.sheetSub}>Choose how to reach your emergency contact</Text>

      <TouchableOpacity style={[styles.optionBtn, styles.callOption]} onPress={handleSOSCall}>
        <MaterialCommunityIcons name="phone" size={20} color="#fff" />
        <Text style={styles.optionText}>Call</Text>
      </TouchableOpacity>


      <TouchableOpacity style={[styles.optionBtn, styles.shareOption]} onPress={handleSOSShare}>
        <MaterialCommunityIcons name="share-variant" size={20} color="#fff" />
        <Text style={styles.optionText}>Share</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={() => setSosOptionsVisible(false)}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  </TouchableOpacity>
</Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:            { flex: 1, backgroundColor: '#0B0B0B' },
  header:              { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2C2C2C', backgroundColor: C.bg, zIndex: 10 },
  headerRight:         { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBtn:             { width: 36, height: 36, borderRadius: 10, backgroundColor: '#0E0E0E', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2C2C2C' },
  headerTitle:         { color: '#FFFFFF', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
  sosHeaderBtn:        { backgroundColor: '#d32f2f', paddingHorizontal: 12, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sosHeaderBtnText:    { color: '#fff', fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  container:           { flex: 1 },
  loadingContainer:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0B0B' },
  loadingText:         { marginTop: 12, fontSize: 16, color: '#888' },

  // Markers
  driverMarker:        { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E59332', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff', elevation: 5 },
  markerWrap:          { alignItems: 'center' },
  markerBubble:        { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 2 },
  markerBubbleText:    { color: '#fff', fontSize: 11, fontWeight: '700' },

  // Success banner
  successBannerTop:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0D2B1A', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#14532d' },
  successBannerTopText: { fontSize: 14, fontWeight: '700', color: '#22c55e' },

  // ETA badge (same as RideStarted)
  estimateContainer:   { position: 'absolute', top: 14, alignSelf: 'center', flexDirection: 'row', backgroundColor: '#fff', borderRadius: 15, paddingVertical: 10, paddingHorizontal: 20, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, zIndex: 999 },
  estimateBox:         { alignItems: 'center', justifyContent: 'center' },
  estimateLabel:       { fontSize: 12, color: '#666', fontWeight: '500' },
  estimateValue:       { fontSize: 16, color: '#000', fontWeight: 'bold', marginTop: 2 },
  estimateDivider:     { width: 1, backgroundColor: '#ddd', marginHorizontal: 20 },

  // Card
  card:                { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#121212', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingTop: 8, borderTopWidth: 1, borderColor: '#2C2C2C', elevation: 8 },
  dragHandle:          { width: 40, height: 4, borderRadius: 2, backgroundColor: '#444', alignSelf: 'center', marginBottom: 12 },
  bookingIdText:       { fontSize: 12, color: '#888', fontWeight: '500', marginBottom: 8 },

  topButtonRow:        { flexDirection: 'row', gap: 10, marginBottom: 12 },
  topBtn:              { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5 },
  navigateBtn:         { backgroundColor: '#1F87FE' },
  cancelTopBtn:        { backgroundColor: '#2C2C2C', borderWidth: 1, borderColor: '#3C3C3C' },
  topBtnText:          { fontSize: 13, fontWeight: '700', color: '#fff' },

  shareLiveBtn:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#8B5CF6', borderRadius: 8, paddingVertical: 10, marginBottom: 12 },
  shareLiveBtnText:    { fontSize: 13, fontWeight: '700', color: '#fff' },

  divider:             { height: 1, backgroundColor: '#2C2C2C', marginBottom: 12, marginTop: 4 },

  customerRow:         { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  customerAvatar:      { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E1E1E', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  customerName:        { fontSize: 14, fontWeight: '700', color: '#fff' },
  customerPhone:       { fontSize: 11, color: '#888', marginTop: 2 },
  circleBtn:           { width: 38, height: 38, borderRadius: 19, backgroundColor: '#E59332', justifyContent: 'center', alignItems: 'center' },

  addressRow:          { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 4 },
  dotPickup:           { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF8C00', marginTop: 13 },
  dotDrop:             { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444', marginTop: 13 },
  connectorLine:       { width: 1, height: 10, backgroundColor: '#444', marginLeft: 4, marginBottom: 4 },
  addressLabel:        { fontSize: 10, fontWeight: '700', color: '#E59332', letterSpacing: 0.8, marginBottom: 2 },
  addressText:         { fontSize: 12, color: '#ccc', lineHeight: 18 },

  metaRow:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', },
  metaItem:            { flex: 1 },
  metaDivider:         { width: 1, height: 28, backgroundColor: '#2C2C2C' },
  metaLabel:           { fontSize: 11, color: '#888' },
  metaValue:           { fontSize: 13, fontWeight: '700', color: '#fff' },
  fareValue:           { fontSize: 16, fontWeight: '800', color: '#E59332' },

  completeRideBtn:     { backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, },
  completeRideBtnText: { fontSize: 15, fontWeight: '800', color: '#fff' },
  disabledBtn:         { opacity: 0.6 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#121212', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#444', alignSelf: 'center', marginBottom: 16 },
  sheetTitle: { color: '#fff', fontSize: 16, fontWeight: '800', textAlign: 'center' },
  sheetSub: { color: '#888', fontSize: 12, textAlign: 'center', marginTop: 4, marginBottom: 20 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10 },
  callOption: { backgroundColor: '#d32f2f' },
  messageOption: { backgroundColor: '#1F87FE' },
  shareOption: { backgroundColor: '#8B5CF6' },
  optionText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  cancelText: { color: '#888', fontSize: 14, fontWeight: '600' },
});