import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  Dimensions,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ridesAPI } from '../../services/api';
import Geolocation from '@react-native-community/geolocation';

const { width, height } = Dimensions.get('window');
const isSmall  = width < 375;
const isMedium = width >= 375 && width < 414;

const C = {
  bg: '#0E0E0E', card: '#1A1A1A', border: '#2C2C2C',
  orange: '#FF8C00', orangeLight: '#FFB347', orangeDim: 'rgba(255,140,0,0.15)',
  green: '#4CAF50', greenDim: 'rgba(76,175,80,0.15)',
  red: '#E53935', redDim: 'rgba(229,57,53,0.15)',
  blue: '#2196F3', blueDim: 'rgba(33,150,243,0.15)',
  purple: '#9C27B0', purpleDim: 'rgba(156,39,176,0.15)',
  textPrimary: '#F5F5F5', textSecondary: '#9E9E9E', textMuted: '#616161',
  divider: '#222222', white: '#FFFFFF', modalBg: 'rgba(0,0,0,0.7)',
};

function canStartRide(scheduleTime, bookingDate) {
  if (!scheduleTime) return true;
  const now = new Date();
  const scheduled = bookingDate
    ? new Date(`${bookingDate}T${scheduleTime}`)
    : (() => {
        const d = new Date();
        const [h, m] = scheduleTime.split(':').map(Number);
        d.setHours(h, m, 0, 0);
        return d;
      })();
  return scheduled.getTime() - now.getTime() <= 30 * 60 * 1000;
}

function RideCard({ ride, onPress }) {
  console.log("RideCard --->",ride);
  
  const fs = isSmall ? 10 : isMedium ? 11 : 12;
  const ready = ride.isScheduled ? canStartRide(ride.scheduleTime, ride.bookingDate) : true;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardHeader}>
        <Text style={[styles.rideId, { fontSize: fs }]}>{ride.booking_id}</Text>
        <View style={[styles.statusBadge]}>
          <Text style={[styles.statusText]}>
            {ride.booking_status_name}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.locationBlock}>
        <View style={styles.locationRow}>
          <View style={[styles.dot, { backgroundColor: C.orange }]} />
          <Text style={[styles.locationText, { fontSize: fs + 1 }]} numberOfLines={1}>
            {ride.picup_location}
          </Text>
        </View>
        <View style={styles.locationConnector}>
          <View style={styles.connectorLine} />
        </View>
        <View style={styles.locationRow}>
          <View style={[styles.dot, { backgroundColor: C.red }]} />
          <Text style={[styles.locationText, { fontSize: fs + 1 }]} numberOfLines={1}>
            {ride.drop_location}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardFooter}>
        <View style={styles.footerCol}>
          <Text style={[styles.footerLabel, { fontSize: fs - 1 }]}>Booking Date</Text>
          <Text style={[styles.footerValue, { fontSize: fs }]}>{ride.booking_date}</Text>
        </View>
        <View style={styles.footerDivider} />
        <View style={styles.footerCol}>
          <Text style={[styles.footerLabel, { fontSize: fs - 1 }]}>Booking Time</Text>
          <Text style={[styles.footerValue, { fontSize: fs }]}>{ride.booking_time}</Text>
        </View>
        <View style={styles.footerDivider} />
        <View style={styles.footerCol}>
          <Text style={[styles.footerLabel, { fontSize: fs - 1 }]}>Fare</Text>
          <Text style={[styles.footerValueFare, { fontSize: fs }]}>{ride.fare}</Text>
        </View>
      </View>

      {ride.isScheduled ? (
        <View style={[styles.paymentRow, { borderColor: (ready ? C.green : C.orange) + '44' }]}>
          <MaterialCommunityIcons
            name={ready ? 'clock-check-outline' : 'clock-alert-outline'}
            size={14}
            color={ready ? C.green : C.orange}
          />
          <Text style={[styles.paymentText, { color: ready ? C.green : C.orange, fontSize: fs }]}>
            {ready ? 'Ready to Start' : 'Too Early to Start'}
          </Text>
        </View>
      ) : (
        <View style={[styles.paymentRow, { borderColor: ride.paymentColor + '44' }]}>
          <MaterialCommunityIcons name="cash-multiple" size={14} color={ride.paymentColor} />
          <Text style={[styles.paymentText, { color: ride.paymentColor, fontSize: fs }]}>
            {ride.paymentStatus}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function TooEarlyModal({ visible, message, bookingDate, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalIconWrap}>
            <MaterialCommunityIcons name="clock-alert-outline" size={40} color={C.orange} />
          </View>
          <Text style={styles.modalTitle}>Too Early to Start</Text>
          <View style={styles.modalDivider} />
          {!!bookingDate && (
            <View style={styles.modalDateRow}>
              <MaterialCommunityIcons name="calendar" size={15} color={C.orange} />
              <Text style={styles.modalDateText}>{bookingDate}</Text>
            </View>
          )}
          <Text style={styles.modalBody}>{message}</Text>
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalGotItBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.modalGotItText}>Got it!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const TABS = ['Ongoing', 'Past', 'Scheduled'];

export default function BookingHistoryScreen({ navigation }) {
  const [modalVisible,    setModalVisible]    = useState(false);
  const [tooEarlyMessage, setTooEarlyMessage] = useState('');
  const [tooEarlyDate,    setTooEarlyDate]    = useState('');
  const [checkingRide,    setCheckingRide]    = useState(false);
  const [rides,           setRides]           = useState([]);
  const [activeTab,       setActiveTab]       = useState('Ongoing');
  const [page,            setPage]            = useState(1);
  const [hasMore,         setHasMore]         = useState(true);
  const [loadingMore,     setLoadingMore]     = useState(false);
  const [loading,         setLoading]         = useState(false);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setRides([]);
    getHistory(activeTab, 1);
  }, [activeTab]);

  const getCurrentLatLng = () => {
    return new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (position) => {
          const latitude  = position?.coords?.latitude?.toString()  ?? '';
          const longitude = position?.coords?.longitude?.toString() ?? '';
          resolve({ latitude, longitude });
        },
        (error) => {
          console.log('Location error:', error.message);
          resolve({ latitude: '', longitude: '' });
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  };

  const getHistory = async (tab, pageNo = 1) => {
    try {
      pageNo === 1 ? setLoading(false) : setLoadingMore(true);

      const status = tab === 'Ongoing' ? '1' : tab === 'Past' ? '2' : '3';
      const { latitude, longitude } = await getCurrentLatLng();

      const response = await ridesAPI.getRideHistory({
        status,
        page: pageNo,
        latitude,
        longitude,
      });

      if (response?.status==1) {
        setRides(response?.data);
      } else {
        setHasMore(false);
        if (pageNo === 1) setRides([]);
      }
    } catch (error) {
      console.log('getRideHistory error:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      getHistory(activeTab, nextPage);
    }
  };

  const handleScheduledCardPress = async (ride) => {
    try {
      setCheckingRide(true);
      const response = await ridesAPI.checkRideStatus({ ride_id: ride.ride_id });
      if (response?.data?.can_start === 1) {
        switch (ride.ride_status) {
          case 'driver_assigned':
            navigation.navigate('MapScreen', { ride }); break;
          case 'driver_arrived':
            navigation.navigate('ReachedOnLocationMap', { ride, pickupData: null }); break;
          case 'in_progress':
            navigation.navigate('RideInProgress', { ride }); break;
          default:
            navigation.navigate('BookingDetails', { ride });
        }
      } else {
        setTooEarlyMessage(response?.message || 'You can start this ride 30 minutes before the scheduled time.');
        setTooEarlyDate(ride.bookingDate || '');
        setModalVisible(true);
      }
    } catch (error) {
      console.log('checkRideStatus error:', error);
    } finally {
      setCheckingRide(false);
    }
  };

  // const handleRidePress = (ride) => {
  //   console.log('ride pressed --->', ride);

  //   if (activeTab === 'Scheduled') {
  //     if(ride?.booking_status_name=="Accepted"){

  //     }
  //     // handleScheduledCardPress(ride);
  //     return;
  //   }

  //   if (activeTab === 'Past') {
  //     navigation.navigate('BookingDetails', { ride });
  //     return;
  //   }

  //   switch (ride.booking_status) {
  //     case 2:
  //       navigation.navigate('MapScreen', { ride }); break;
  //     case 'driver_arrived':
  //       navigation.navigate('ReachedOnLocationMap', { ride, pickupData: null }); break;
  //     case 4:
  //       navigation.navigate('RideInProgress', { ride }); break;
  //     default:
  //       navigation.navigate('BookingDetails', { ride });
  //   }
  // };

  const parseBookingDateTime = (dateStr, timeStr) => {
  if (!dateStr || !timeStr) return null;

  const [day, month, year] = dateStr.split('-').map(Number);
  const [time, modifier] = timeStr.split(' ');
  let [hours, minutes] = time.split(':').map(Number);

  if (modifier === 'PM' && hours !== 12) hours += 12;
  if (modifier === 'AM' && hours === 12) hours = 0;

  return new Date(year, month - 1, day, hours, minutes, 0);
};

const handleRidePress = (ride) => {
  console.log('ride pressed --->', ride);

  if (activeTab === 'Scheduled') {
    if (ride?.booking_status_name === 'Accepted') {
      console.log("Ride Booking Date & Time ", ride?.booking_date, ride?.booking_time);

      const scheduledAt = parseBookingDateTime(ride.booking_date, ride.booking_time);
      const now = new Date();
      const minutesUntilScheduled = scheduledAt
        ? (scheduledAt.getTime() - now.getTime()) / 60000
        : 0;

      // More than 30 minutes before the scheduled pickup — too early.
      if (minutesUntilScheduled > 30) {
        setTooEarlyMessage(
          `This ride is scheduled for ${ride.booking_time}. You can view/start it starting 30 minutes before the scheduled time.`
        );
        setTooEarlyDate(ride.booking_date || '');
        setModalVisible(true);
        return;
      }

      // More than 30 minutes after the scheduled pickup — too late.
      if (minutesUntilScheduled < -30) {
        setTooEarlyMessage(
          `This ride was scheduled for ${ride.booking_time} and is now more than 30 minutes overdue. Please contact support if you still need to start this ride.`
        );
        setTooEarlyDate(ride.booking_date || '');
        setModalVisible(true);
        return;
      }

      // Within the ±30 minute window of scheduled time — proceed, no alert.
      navigation.navigate('MapScreen', { ride });
    }
    return;
  }

  if (activeTab === 'Past') {
    navigation.navigate('BookingDetails', { ride });
    return;
  }

  switch (ride.booking_status) {
    case 2:
      navigation.navigate('MapScreen', { ride }); break;
    case 'driver_arrived':
      navigation.navigate('ReachedOnLocationMap', { ride, pickupData: null }); break;
    case 4:
      navigation.navigate('RideInProgress', { ride }); break;
    default:
      navigation.navigate('BookingDetails', { ride });
  }
};

  const headerFS = isSmall ? 15 : isMedium ? 17 : 19;
  const tabFS    = isSmall ? 11 : isMedium ? 12 : 13;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation?.goBack?.()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: headerFS }]}>Ride History</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const active = tab === activeTab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabText, { fontSize: tabFS }, active && styles.tabTextActive]}>
                {tab}
              </Text>
              {active && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* FlatList */}
      <FlatList
        data={rides}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.scrollContent,
          rides.length === 0 && styles.emptyContent,
        ]}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={C.orange} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="car-off" size={56} color={C.textMuted} />
              <Text style={styles.emptyText}>No rides found</Text>
            </View>
          )
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color={C.orange} style={{ marginVertical: 16 }} />
          ) : null
        }
        renderItem={({ item: ride }) => (
          <RideCard
            ride={ride}
            onPress={() => handleRidePress(ride)}
          />
        )}
      />

      {/* Checking overlay */}
      {checkingRide && (
        <View style={styles.checkingOverlay}>
          <ActivityIndicator size="large" color={C.orange} />
        </View>
      )}

      <TooEarlyModal
        visible={modalVisible}
        message={tooEarlyMessage}
        bookingDate={tooEarlyDate}
        onClose={() => setModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea:          { flex: 1, backgroundColor: C.bg },
  header:            { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.bg },
  backBtn:           { width: 36, height: 36, borderRadius: 10, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border },
  headerTitle:       { color: C.textPrimary, fontWeight: '700', letterSpacing: 0.3 },
  tabBar:            { flexDirection: 'row', backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border, paddingHorizontal: 16 },
  tab:               { flex: 1, alignItems: 'center', paddingVertical: 12, position: 'relative' },
  tabActive:         {},
  tabText:           { color: C.textSecondary, fontWeight: '500' },
  tabTextActive:     { color: C.orange, fontWeight: '700' },
  tabUnderline:      { position: 'absolute', bottom: 0, left: '20%', right: '20%', height: 2.5, backgroundColor: C.orange, borderRadius: 2 },
  scrollContent:     { padding: 14, paddingBottom: 30, gap: 12 },
  emptyContent:      { flex: 1 },
  card:              { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5 },
  cardHeader:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 },
  rideId:            { color: C.textSecondary, fontWeight: '600', letterSpacing: 0.5, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
  statusBadge:       { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 20, borderWidth: 1,borderColor:'green' },
  statusText:        { fontWeight: '400', letterSpacing: 0.3,color:'white' },
  divider:           { height: 1, backgroundColor: C.divider, marginHorizontal: 14 },
  locationBlock:     { paddingHorizontal: 14, paddingVertical: 10, gap: 4 },
  locationRow:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot:               { width: 8, height: 8, borderRadius: 4 },
  locationText:      { color: C.textPrimary, flex: 1, fontWeight: '500' },
  locationConnector: { paddingLeft: 3.5, paddingVertical: 2 },
  connectorLine:     { width: 1, height: 12, backgroundColor: C.border, marginLeft: 3 },
  cardFooter:        { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' },
  footerCol:         { flex: 1, alignItems: 'center' },
  footerDivider:     { width: 1, height: 28, backgroundColor: C.border },
  footerLabel:       { color: C.textMuted, marginBottom: 3, fontWeight: '400' },
  footerValue:       { color: C.textSecondary, fontWeight: '600' },
  footerValueFare:   { color: C.orange, fontWeight: '700' },
  paymentRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderTopWidth: 1, borderTopColor: C.divider, backgroundColor: 'rgba(255,140,0,0.04)' },
  paymentText:       { fontWeight: '600' },
  emptyState:        { alignItems: 'center', justifyContent: 'center', paddingTop: height * 0.18, gap: 12 },
  emptyText:         { color: C.textMuted, fontSize: 15, fontWeight: '500' },
  modalOverlay:      { flex: 1, backgroundColor: C.modalBg, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  modalBox:          { backgroundColor: '#1C1C1C', borderRadius: 20, paddingTop: 28, paddingBottom: 20, paddingHorizontal: 24, width: '100%', maxWidth: 340, alignItems: 'center', borderWidth: 1, borderColor: C.border, shadowColor: C.orange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 10 },
  modalIconWrap:     { width: 72, height: 72, borderRadius: 36, backgroundColor: C.orangeDim, alignItems: 'center', justifyContent: 'center', marginBottom: 14, borderWidth: 1.5, borderColor: C.orange + '55' },
  modalTitle:        { color: C.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 10, letterSpacing: 0.3 },
  modalDivider:      { height: 1, backgroundColor: C.border, width: '100%', marginBottom: 14 },
  modalBody:         { color: C.textSecondary, fontSize: 13.5, textAlign: 'center', lineHeight: 21, marginBottom: 22 },
  modalActions:      { flexDirection: 'row', gap: 12, width: '100%' },
  modalCancelBtn:    { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, alignItems: 'center', backgroundColor: '#252525' },
  modalCancelText:   { color: C.textSecondary, fontWeight: '700', fontSize: 14 },
  modalGotItBtn:     { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: C.orange, alignItems: 'center', shadowColor: C.orange, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 6 },
  modalGotItText:    { color: C.white, fontWeight: '800', fontSize: 14, letterSpacing: 0.2 },
  modalDateRow:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.orangeDim, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 10, alignSelf: 'center' },
  modalDateText:     { color: C.orange, fontSize: 13, fontWeight: '600' },
  checkingOverlay:   { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', zIndex: 99 },
});