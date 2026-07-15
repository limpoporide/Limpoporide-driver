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
  Linking,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import MapViewDirections from 'react-native-maps-directions';
import Geolocation from 'react-native-geolocation-service';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ridesAPI } from '../../services/api';
import { locationTracker } from '../../services/locationTracker';
import toastService from '../../Utility/toast';
import Config from 'react-native-config';
import { useSocket } from '../../webSocket/SocketContext';
import useSocketListener from '../../webSocket/useSocketListener';
import { useSelector } from 'react-redux';
import { SOCKET_EVENTS } from '../../webSocket/socketEvents';
import { Image } from 'react-native';


const GOOGLE_MAPS_API_KEY = Config.GOOGLE_MAPS_API_KEY ?? '';

const C = { bg: '#0B0B0B', orange: '#E59332', textPrimary: '#FFFFFF', border: '#2D2D2D' };

const CANCELLED_STATUSES = ['cancelled_by_user', 'cancelled_by_driver', 'cancelled_by_admin'];

// ── Route re-fetch throttling ────────────────────────────────────────────
// Re-hitting the Directions API on every raw GPS tick is expensive, gets
// rate-limited, and makes the route line look jittery/stuck. We only ask
// for a new route when the driver has moved far enough OR enough time has
// passed, whichever comes first.
const MIN_DISTANCE_FOR_REROUTE = 30;        // meters moved before re-fetching route
const MIN_TIME_BETWEEN_ROUTE_FETCH = 8000;  // ms between route re-fetches

const getDistanceMeters = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export default function MapScreen({ navigation, route }) {
  const { ride } = route.params;
  console.log("Ride Data --->",ride);
  

  const [location, setLocation]               = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [updating, setUpdating]               = useState(false);
  const [pickupData, setPickupData]           = useState(null);
  const [pickupDataLoading, setPickupDataLoading] = useState(true);
  const [routeInfo, setRouteInfo]             = useState({ distance: '—', duration: '—' });
  const [isFollowing, setIsFollowing]         = useState(true);
  const [routeOrigin, setRouteOrigin]         = useState(null); // throttled origin fed to MapViewDirections

  const mapViewRef       = useRef(null);
  const isFollowingRef   = useRef(true);
  const lastHeading      = useRef(0);
  const pollIntervalRef  = useRef(null);
  const routeOriginRef   = useRef(null); // last location a route was fetched from
  const lastRouteFetchAt = useRef(0);

  useEffect(() => {
    requestLocationPermission();
  }, []);

      useSocketListener(SOCKET_EVENTS.USER_CANCELLED, data => {
          console.log("User Canclled Ride OTP Screen --->");
            navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] })
          });
  // useEffect(() => {
  //   if (ride?.id) {
  //     // fetchArriveAtPickup();
  //     // startStatusPolling();
  //   }
  //   return () => stopStatusPolling();
  // }, [ride]);

  useEffect(() => {
    isFollowingRef.current = isFollowing;
  }, [isFollowing]);

  useEffect(() => {
    return locationTracker.addListener((pos) => {
      const newHeading = pos.heading || lastHeading.current;
      lastHeading.current = newHeading;
      const newLoc = {
        latitude: pos.latitude,
        longitude: pos.longitude,
        heading: newHeading,
        speed: pos.speed,
      };
      setLocation(newLoc);
      console.log("new Location --->",newLoc);
      

      // Decide whether this movement warrants a fresh route fetch.
      // We refetch if we've moved far enough since the last fetch, OR if
      // enough time has elapsed (keeps route fresh even if crawling slowly).
      const now = Date.now();
      const prevOrigin = routeOriginRef.current;
      const movedFar =
        !prevOrigin ||
        getDistanceMeters(
          prevOrigin.latitude,
          prevOrigin.longitude,
          newLoc.latitude,
          newLoc.longitude
        ) >= MIN_DISTANCE_FOR_REROUTE;
      const timeElapsed = now - lastRouteFetchAt.current >= MIN_TIME_BETWEEN_ROUTE_FETCH;

      if (movedFar || timeElapsed) {
        routeOriginRef.current = newLoc;
        lastRouteFetchAt.current = now;
        setRouteOrigin(newLoc);
      }

      if (isFollowingRef.current) {
        mapViewRef.current?.animateCamera(
          {
            center: { latitude: pos.latitude, longitude: pos.longitude },
            heading: newHeading,
            pitch: 45,
            zoom: 17,
            altitude: 500,
          },
          { duration: 1000 }
        );
      }
    });
  }, []);

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
      console.log('checkStatus error:', error);
    }
  };

  // ── Fetch pickup data ─────────────────────────────────────────────────────

  const fetchArriveAtPickup = async () => {
    setPickupDataLoading(true);
    try {
      const response = await ridesAPI.arriveAtPickup({ ride_id: ride?.id }); // ✅ ride.id
      if (response?.data) setPickupData(response.data);
    } catch (error) {
      console.log('arriveAtPickup error:', error);
      // Alert.alert('Error', 'Failed to load ride details');
    } finally {
      setPickupDataLoading(false);
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
          const { latitude, longitude, heading } = position.coords;
          const initial = { latitude, longitude, heading: heading ?? 0 };
          setLocation(initial);

          // Seed the throttled route origin with the first fix so the
          // route renders immediately without waiting for the next tick.
          routeOriginRef.current = initial;
          lastRouteFetchAt.current = Date.now();
          setRouteOrigin(initial);
          console.log("initial Location --->",initial);
          

          setLoading(false);
          mapViewRef.current?.animateCamera({
            center: { latitude, longitude },
            heading: heading ?? 0,
            pitch: 45,
            zoom: 17,
            altitude: 500,
          });
        },
        (error) => {
          Alert.alert('Error', error.message);
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
      );
    } catch {
      Alert.alert('Error', 'Location permission denied');
      setLoading(false);
    }
  };

  // ── Camera controls ───────────────────────────────────────────────────────

  const handleRecenter = () => {
    setIsFollowing(true);
    if (!location) return;
    mapViewRef.current?.animateCamera(
      {
        center: { latitude: location.latitude, longitude: location.longitude },
        heading: location.heading ?? 0,
        pitch: 45,
        zoom: 17,
        altitude: 500,
      },
      { duration: 800 }
    );
  };

  const fitMapToMarkers = () => {
    setIsFollowing(false);
    if (!location || !pickupCoords) return;
    mapViewRef.current?.animateCamera({ pitch: 0, heading: 0, zoom: 12 }, { duration: 500 });
    setTimeout(() => {
      mapViewRef.current?.fitToCoordinates(
        [location, pickupCoords],
        { edgePadding: { top: 80, right: 60, bottom: 340, left: 60 }, animated: true }
      );
    }, 600);
  };

  // ── Navigate to pickup via Google Maps ────────────────────────────────────

  const handleNavigate = () => {
    const lat = parseFloat(ride?.picup_lat);   // ✅ ride field
    const lng = parseFloat(ride?.picup_long);  // ✅ ride field
    if (!lat || !lng) return;

    const androidUrl   = `google.navigation:q=${lat},${lng}&mode=d`;
    const iosGoogleUrl = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
    const browserUrl   = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

    if (Platform.OS === 'android') {
      Linking.canOpenURL(androidUrl)
        .then((supported) => Linking.openURL(supported ? androidUrl : browserUrl))
        .catch(() => Linking.openURL(browserUrl));
    } else {
      Linking.canOpenURL(iosGoogleUrl)
        .then((supported) =>
          Linking.openURL(supported ? iosGoogleUrl : `maps://?daddr=${lat},${lng}&dirflg=d`)
        )
        .catch(() => Linking.openURL(browserUrl));
    }
  };

  // ── Reached pickup ────────────────────────────────────────────────────────

  const handleReached = async () => {
    // setUpdating(true);
    // try {
    //   const response = await ridesAPI.updateRideStatus({
    //     ride_id: ride?.id,
    //     status: 'driver_arrived',
    //   });
    //   console.log('updateRideStatus:', response);
    //   if (response?.status) {
        navigation.replace('ReachedOnLocationMap', { ride });
    //   }
    //   toastService?.success(response?.message);
    // } catch (error) {
    //   console.log('updateRideStatus error:', error);
    //   Alert.alert('Error', 'Failed to update ride status. Please try again.');
    // } finally {
    //   setUpdating(false);
    // }
  };

  // ── Coords from ride data directly ────────────────────────────────────────

  // ✅ Use ride fields: picup_lat, picup_long, drop_lat, drop_long
  const pickupCoords =
    ride?.picup_lat && ride?.picup_long
      ? {
          latitude:  parseFloat(ride.picup_lat),
          longitude: parseFloat(ride.picup_long),
        }
      : pickupData?.ride?.pickup_latitude
      ? {
          latitude:  parseFloat(pickupData.ride.pickup_latitude),
          longitude: parseFloat(pickupData.ride.pickup_longitude),
        }
      : null;

  const dropCoords =
    ride?.drop_lat && ride?.drop_long
      ? {
          latitude:  parseFloat(ride.drop_lat),
          longitude: parseFloat(ride.drop_long),
        }
      : pickupData?.ride?.drop_latitude
      ? {
          latitude:  parseFloat(pickupData.ride.drop_latitude),
          longitude: parseFloat(pickupData.ride.drop_longitude),
        }
      : null;

  // Live straight-line distance to pickup, recalculated on every GPS tick.
  // This gives instant feedback in between the throttled Directions
  // (road-based) refetches, which only happen every ~8s or 30m of movement.
  const liveDistanceKm =
    location && pickupCoords
      ? getDistanceMeters(
          location.latitude,
          location.longitude,
          pickupCoords.latitude,
          pickupCoords.longitude
        ) / 1000
      : null;

  const liveDistanceLabel =
    liveDistanceKm !== null
      ? liveDistanceKm < 1
        ? `${Math.round(liveDistanceKm * 1000)} m`
        : `${liveDistanceKm.toFixed(1)} km`
      : routeInfo.distance;

  // ── Loading screen ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF8C00" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <StatusBar backgroundColor="#0B0B0B" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Navigation</Text>
        <TouchableOpacity style={styles.iconBtn} onPress={fitMapToMarkers}>
          <MaterialCommunityIcons name="map-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        {location && (
          <MapView
            ref={mapViewRef}
            style={styles.map}
            userInterfaceStyle="dark"
            rotateEnabled
            pitchEnabled
            onPanDrag={() => setIsFollowing(false)}
            initialCamera={{
              center: { latitude: location.latitude, longitude: location.longitude },
              heading: location.heading ?? 0,
              pitch: 45,
              zoom: 17,
              altitude: 500,
            }}
          >
            {/* Driver marker */}
            <Marker
              coordinate={{ latitude: location.latitude, longitude: location.longitude }}
              anchor={{ x: 0.5, y: 0.5 }}
              flat
              rotation={location.heading ?? 0}
            >
              <View style={styles.driverMarker}>
                <MaterialCommunityIcons name="navigation" size={22} color="#fff" />
              </View>
            </Marker>

            {/* Pickup marker */}
            {pickupCoords && (
              <Marker coordinate={pickupCoords} anchor={{ x: 0.5, y: 1 }}>
                <View style={styles.pickupMarkerWrap}>
                  <View style={styles.pickupMarkerBubble}>
                    <Text style={styles.pickupMarkerText}>Pickup</Text>
                  </View>
                  <MaterialCommunityIcons name="map-marker" size={32} color="#FF8C00" />
                </View>
              </Marker>
            )}

            {/* Drop marker */}
            {dropCoords && (
              <Marker coordinate={dropCoords} anchor={{ x: 0.5, y: 1 }}>
                <View style={styles.pickupMarkerWrap}>
                  <View style={[styles.pickupMarkerBubble, { backgroundColor: '#ef4444' }]}>
                    <Text style={styles.pickupMarkerText}>Drop-off</Text>
                  </View>
                  <MaterialCommunityIcons name="map-marker" size={32} color="#ef4444" />
                </View>
              </Marker>
            )}

            {/* Route: driver → pickup (origin is throttled, not raw GPS) */}
            {pickupCoords && routeOrigin && (
              <MapViewDirections
                origin={{ latitude: routeOrigin.latitude, longitude: routeOrigin.longitude }}
                destination={pickupCoords}
                apikey={GOOGLE_MAPS_API_KEY}
                strokeWidth={5}
                strokeColor="#4A90E2"
                lineDashPattern={[0]}
                optimizeWaypoints
                onReady={(result) => {
                  setRouteInfo({
                    distance:
                      result.distance < 1
                        ? `${Math.round(result.distance * 1000)} m`
                        : `${result.distance.toFixed(1)} km`,
                    duration:
                      result.duration < 1
                        ? `${Math.round(result.duration * 60)} sec`
                        : `${Math.round(result.duration)} min`,
                  });
                }}
                onError={(e) => console.log('Directions error:', e)}
              />
            )}
          </MapView>
        )}

        {/* Re-center FAB */}
        {!isFollowing && (
          <TouchableOpacity style={styles.recenterFab} onPress={handleRecenter}>
            <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Speed badge */}
        {location?.speed !== undefined && (
          <View style={styles.speedBadge}>
            <Text style={styles.speedValue}>
              {Math.round((location.speed ?? 0) * 3.6)}
            </Text>
            <Text style={styles.speedUnit}>km/h</Text>
          </View>
        )}

        {/* Navigation Card */}
        <View style={styles.navigationCard}>
          {loading ? (
            <ActivityIndicator size="small" color="#E59332" style={{ marginVertical: 20 }} />
          ) : (
            <>
              {/* Customer + ETA row */}
              <View style={styles.customerRow}>
          <View style={styles.customerAvatar}>
  {ride?.profile ? (
    <Image
      source={{ uri: ride.profile }}
      style={{}}
      resizeMode="cover"
    />
  ) : (
    <MaterialCommunityIcons
      name="account"
      size={22}
      color="#E59332"
    />
  )}
</View>
                <View style={{ flex: 1 }}>
                  {/* ✅ driver_name from ride data */}
                  <Text style={styles.customerName}>{ride?.user_name ?? '—'}</Text>
                  <View style={styles.statusBadge}>
                    <View style={styles.statusDot} />
                    <Text style={styles.statusText}>
                      {pickupData?.ride?.status?.replace(/_/g, ' ') ?? 'driver assigned'}
                    </Text>
                  </View>
                </View>
                <View style={styles.etaPill}>
                  <Text style={styles.etaPillValue}>{routeInfo.duration}</Text>
                  <Text style={styles.etaPillLabel}>ETA</Text>
                </View>
                <View style={[styles.etaPill, { marginLeft: 8 }]}>
                  {/* Live straight-line distance; updates every GPS tick */}
                  <Text style={styles.etaPillValue}>{liveDistanceLabel}</Text>
                  <Text style={styles.etaPillLabel}>Away</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Pickup address */}
              <View style={styles.addressRow}>
                <View style={styles.dotPickup} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.addressLabel}>PICKUP</Text>
                  {/* ✅ picup_location from ride data */}
                  <Text style={styles.addressText}>{ride?.picup_location ?? '—'}</Text>
                </View>
              </View>

              <View style={styles.connectorLine} />

              {/* Drop address */}
              <View style={styles.addressRow}>
                <View style={styles.dotDrop} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.addressLabel, { color: '#ef4444' }]}>DROP-OFF</Text>
                  {/* ✅ drop_location from ride data */}
                  <Text style={styles.addressText}>{ride?.drop_location ?? '—'}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Fare + Booking ID row */}
              <View style={styles.fareRow}>
                <View style={styles.fareItem}>
                  <Text style={styles.fareLabel}>Booking ID</Text>
                  {/* ✅ booking_id from ride data */}
                  <Text style={styles.fareValue}>{ride?.booking_id ?? '—'}</Text>
                </View>
                <View style={styles.fareDivider} />
                <View style={styles.fareItem}>
                  <Text style={styles.fareLabel}>Fare</Text>
                  {/* ✅ fare from ride data */}
                  <Text style={[styles.fareValue, { color: '#E59332' }]}>
                    R{ride?.fare ?? '0'}
                  </Text>
                </View>
                <View style={styles.fareDivider} />
                <View style={styles.fareItem}>
                  <Text style={styles.fareLabel}>Date</Text>
                  {/* ✅ booking_date from ride data */}
                  <Text style={styles.fareValue}>{ride?.booking_date ?? '—'}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.navigateBtn]}
                  onPress={handleNavigate}
                >
                  <MaterialCommunityIcons name="navigation" size={16} color="#fff" />
                  <Text style={styles.btnText}>Navigate</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.reachedBtn, updating && styles.disabledBtn]}
                  onPress={handleReached}
                  disabled={updating}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="map-marker-check" size={16} color="#fff" />
                      <Text style={styles.btnText}>Reached</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:         { flex: 1, backgroundColor: '#0B0B0B' },
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#2C2C2C', backgroundColor: C.bg, zIndex: 10 },
  iconBtn:          { width: 36, height: 36, borderRadius: 10, backgroundColor: '#0E0E0E', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2C2C2C' },
  headerTitle:      { color: '#FFFFFF', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },
  container:        { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0B0B' },
  loadingText:      { marginTop: 12, fontSize: 16, color: '#888' },
  map:              { flex: 1 },

  // Driver marker
  driverMarker:     { width: 42, height: 42, borderRadius: 21, backgroundColor: '#E59332', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#fff', elevation: 5 },

  // Pickup/drop markers
  pickupMarkerWrap:   { alignItems: 'center' },
  pickupMarkerBubble: { backgroundColor: '#FF8C00', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 2 },
  pickupMarkerText:   { color: '#fff', fontSize: 11, fontWeight: '700' },

  // FAB
  recenterFab:    { position: 'absolute', right: 16, bottom: 360, width: 48, height: 48, borderRadius: 24, backgroundColor: '#1C1C1E', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333', elevation: 6 },

  // Speed badge
  speedBadge:   { position: 'absolute', left: 16, bottom: 360, backgroundColor: '#1C1C1E', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#333', elevation: 6 },
  speedValue:   { fontSize: 18, fontWeight: '800', color: '#fff' },
  speedUnit:    { fontSize: 10, color: '#888', fontWeight: '500' },

  // Navigation card
  navigationCard:  { position: 'absolute', bottom: 20, left: 16, right: 16, backgroundColor: '#121212', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#2C2C2C', elevation: 8 },
  customerRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  customerAvatar:  { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1E1E1E', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
  customerName:    { fontSize: 14, fontWeight: '700', color: '#fff' },
  statusBadge:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  statusDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  statusText:      { fontSize: 11, color: '#22c55e', fontWeight: '600', textTransform: 'capitalize' },
  etaPill:         { backgroundColor: '#1E1E1E', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center', borderWidth: 1, borderColor: '#2C2C2C' },
  etaPillValue:    { fontSize: 13, fontWeight: '800', color: '#E59332' },
  etaPillLabel:    { fontSize: 9, color: '#888', fontWeight: '500', marginTop: 1 },
  divider:         { height: 1, backgroundColor: '#2C2C2C', marginBottom: 12, marginTop: 4 },
  addressRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 4 },
  dotPickup:       { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF8C00', marginTop: 13 },
  dotDrop:         { width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444', marginTop: 13 },
  connectorLine:   { width: 1, height: 10, backgroundColor: '#444', marginLeft: 4, marginBottom: 4 },
  addressLabel:    { fontSize: 10, fontWeight: '700', color: '#E59332', letterSpacing: 0.8, marginBottom: 2 },
  addressText:     { fontSize: 12, color: '#ccc', lineHeight: 18 },

  // Fare row
  fareRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  fareItem:     { flex: 1, alignItems: 'center' },
  fareDivider:  { width: 1, height: 28, backgroundColor: '#2C2C2C' },
  fareLabel:    { fontSize: 10, color: '#888', marginBottom: 3, fontWeight: '500' },
  fareValue:    { fontSize: 12, color: '#fff', fontWeight: '700' },

  // Buttons
  buttonRow:   { flexDirection: 'row', gap: 12, marginTop: 4 },
  actionBtn:   { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  navigateBtn: { backgroundColor: '#1F87FE' },
  reachedBtn:  { backgroundColor: '#EA2A2A' },
  disabledBtn: { opacity: 0.6 },
  btnText:     { fontSize: 14, fontWeight: '700', color: '#fff' },
});