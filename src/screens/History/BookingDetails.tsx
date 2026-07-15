import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
  Dimensions,
  ScrollView,
  Modal,
  Linking,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ridesAPI, bankAPI } from '../../services/api';

const { width } = Dimensions.get('window');
const isSmall = width < 375;
const isMedium = width >= 375 && width < 414;
const rs = (s: number, m: number, l: number) => (isSmall ? s : isMedium ? m : l);

const C = {
  bg: '#0F0F0F',
  orange: '#E59332',
  cardBg: '#1A1A1A',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  border: '#2A2A2A',
  green: '#00875A',
  red: '#DE350B',
  blue: '#1A6EC2',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type RideStatus =
  | 'pending'
  | 'driver_assigned'
  | 'driver_arrived'
  | 'in_progress'
  | 'completed'
  | 'cancelled_by_user'
  | 'cancelled_by_driver'
  | 'cancelled_by_admin';

interface TripData {
  payment_status: string;       // e.g. "pending", "completed"
  ride_date_time: string;
  ride_status: RideStatus;
  booking_id: number;
  rider: {
    name: string;
    mobile_number: string;
  };
  trip: {
    pickup_address: string;
    drop_address: string;
    distance_km: string;
    duration_minutes: string;
  };
  payment_type: string;         // "online" | "cash"
  payment_amount: number;
  driver_details: {
    full_name: string;
    mobile_number: string;
    profile_photo?: string;
  };
  vehicle: {
    name: string;
    vehicle_image?: string;
    category_name: string;
  };
  payment_details: Record<string, any>;
  user_rating: number | null;       // star value the driver gave the user
  driver_rating: string | null;     // star value the user gave the driver
  user_rating_status: number;       // 0 = driver hasn't rated user yet, 1 = rated
  driver_rating_status: number;     // 0 = user hasn't rated driver yet, 1 = rated
  collected_status: boolean;
  invoice_link: string;
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<RideStatus, { label: string; bgColor: string }> = {
  pending:              { label: 'Pending',             bgColor: '#5A3E1B' },
  driver_assigned:      { label: 'Driver Assigned',     bgColor: '#1B3A5A' },
  driver_arrived:       { label: 'Driver Arrived',      bgColor: '#3E1B5A' },
  in_progress:          { label: 'In Progress',         bgColor: '#1B4A3A' },
  completed:            { label: 'Completed',           bgColor: '#2B5B3C' },
  cancelled_by_user:    { label: 'Cancelled by You',    bgColor: '#5A1B1B' },
  cancelled_by_driver:  { label: 'Cancelled by Driver', bgColor: '#5A1B1B' },
  cancelled_by_admin:   { label: 'Cancelled by Admin',  bgColor: '#5A1B1B' },
};

const isCancelledStatus = (s: RideStatus) =>
  s === 'cancelled_by_user' || s === 'cancelled_by_driver' || s === 'cancelled_by_admin';

const isActiveStatus = (s: RideStatus) =>
  s === 'pending' || s === 'driver_assigned' || s === 'driver_arrived' || s === 'in_progress';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatAmount = (v: number) => `R${Number(v).toFixed(2)}`;

const formatDistance = (km: string) => {
  const v = parseFloat(km);
  return isNaN(v) || v === 0 ? '—' : `${v.toFixed(1)} Km`;
};

const formatDuration = (mins: string) => {
  const v = parseInt(mins, 10);
  if (isNaN(v) || v === 0) return '—';
  if (v < 60) return `${v} Min`;
  const h = Math.floor(v / 60);
  const m = v % 60;
  return m > 0 ? `${h}h ${m}m` : `${h} Hour${h > 1 ? 's' : ''}`;
};

const callPhone = (number: string) => {
  const url = `tel:${number}`;
  Linking.canOpenURL(url)
    .then(ok => {
      if (ok) Linking.openURL(url);
      else Alert.alert('Error', 'Phone calls are not supported on this device.');
    })
    .catch(() => Alert.alert('Error', 'Could not open phone dialer.'));
};

const ratingLabel = (r: number) =>
  ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][r] ?? '';

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionTitle = ({ title }: { title: string }) => (
  <Text style={styles.cardSectionTitle}>{title}</Text>
);

const StarRow = ({
  rating,
  size = 20,
  interactive = false,
  onRate,
}: {
  rating: number;
  size?: number;
  interactive?: boolean;
  onRate?: (r: number) => void;
}) => (
  <View style={styles.starsRow}>
    {[1, 2, 3, 4, 5].map(s =>
      interactive ? (
        <TouchableOpacity key={s} onPress={() => onRate?.(s)} activeOpacity={0.7}>
          <MaterialCommunityIcons
            name={s <= rating ? 'star' : 'star-outline'}
            size={size}
            color={s <= rating ? C.orange : C.textSecondary}
            style={{ marginHorizontal: 3 }}
          />
        </TouchableOpacity>
      ) : (
        <MaterialCommunityIcons
          key={s}
          name={s <= rating ? 'star' : 'star-outline'}
          size={size}
          color={s <= rating ? C.orange : C.textSecondary}
          style={{ marginHorizontal: 2 }}
        />
      ),
    )}
  </View>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const BookingDetails = ({ navigation, route }: any) => {
  const { ride } = route.params;
console.log("Booking Details Ride --->",ride);


  const [tripData, setTripData]           = useState<TripData | null>(null);
  const [loading, setLoading]             = useState(true);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedRating, setSelectedRating]         = useState(0);
  const [submittingRating, setSubmittingRating]     = useState(false);
  const [payingNow, setPayingNow]         = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchTripDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ridesAPI.getRideDetails({ booking_id: ride?.booking_id });
      if (response?.status === 1 && response?.data) {
        setTripData(response.data);
      } else {
        Alert.alert('Error', response?.message || 'Failed to load trip details.');
      }
    } catch (error) {
      console.log('getRideHistoryDetails error:', error);
      Alert.alert('Error', 'Failed to load trip details. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [ride?.id]);

  useEffect(() => { fetchTripDetails(); }, [fetchTripDetails]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleGiveRating = async () => {
    if (selectedRating === 0) {
      Alert.alert('Select Rating', 'Please select a star rating before submitting.');
      return;
    }
    try {
      setSubmittingRating(true);
      const response = await ridesAPI.ratePassenger({
        booking_id: tripData?.booking_id ?? ride?.id,
        rating: selectedRating,
      });
      if (response?.status === 1) {
        setRatingModalVisible(false);
        setSelectedRating(0);
        await fetchTripDetails();
        Alert.alert('Thank You!', 'Your rating has been submitted successfully.');
      } else {
        Alert.alert('Error', response?.message || 'Failed to submit rating.');
      }
    } catch (error) {
      console.log('rateRiderer error:', error);
      Alert.alert('Error', 'Could not submit rating. Please try again.');
    } finally {
      setSubmittingRating(false);
    }
  };

  const collectPayout = async () => {
    if (!tripData) return;
    try {
      setPayingNow(true);
      const response = await bankAPI.collectPayout({
        ride_id: tripData?.booking_id,
      });
      if (response?.status === 1) {
        await fetchTripDetails();
        Alert.alert('Success', 'Payment completed successfully.');
      } else {
        Alert.alert('Payment Failed', response?.message || 'Payment could not be processed.');
      }
    } catch (error) {
      console.log('payForRide error:', error);
      Alert.alert('Payment Error', 'Something went wrong. Please try again.');
    } finally {
      setPayingNow(false);
    }
  };

  const handleDownloadInvoice = () => {
    if (!tripData?.invoice_link) {
      Alert.alert('Unavailable', 'Invoice is not available yet.');
      return;
    }
    Linking.openURL(tripData?.invoice_link).catch(() =>
      Alert.alert('Error', 'Could not open invoice link.'),
    );
  };

  // ── Derived visibility flags ──────────────────────────────────────────────

  const rideStatus: RideStatus = (tripData?.ride_status as RideStatus) ?? 'pending';
  const statusCfg   = STATUS_CONFIG[rideStatus] ?? STATUS_CONFIG['pending'];
  const isActive    = isActiveStatus(rideStatus);
  const isCompleted = rideStatus === 'completed';
  const isCancelled = isCancelledStatus(rideStatus);

  // Collect Amount: show whenever ride is completed and driver hasn't collected yet
  const showPayNow =
    isCompleted &&
    tripData?.collected_status === false;

  // Invoice: only after completed or cancelled (never during active ride)
  const showInvoice = isCompleted || isCancelled;

  // Rate Rider button: show when driver hasn't rated the rider yet
  const showRateDriver = isCompleted && tripData?.user_rating_status === 0;

  // Already-rated display: driver has already rated the rider
  const showDriverRatingGiven =
    isCompleted &&
    tripData?.user_rating_status === 1 &&
    tripData?.user_rating !== null;

  // Driver's rating of the user: show if driver has rated the user
  const showUserRatingReceived =
    isCompleted &&
    tripData?.user_rating_status === 1 &&
    tripData?.user_rating !== null;

  // ── Loading / Error states ────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor={C.bg} barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={C.orange} />
          <Text style={styles.loadingText}>Loading trip details…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!tripData) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar backgroundColor={C.bg} barStyle="light-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trip Details</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.centerLoader}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={C.red} />
          <Text style={[styles.loadingText, { marginTop: 12 }]}>Failed to load trip data.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchTripDetails}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor={C.bg} barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip Details</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Status + Booking ID */}
        <View style={styles.statusRow}>
       
          <View style={styles.idBadge}>
            <Text style={styles.idText}>ID: #{tripData?.booking_id}</Text>
          </View>
        </View>


        {/* ── Rider Details Card ── */}
        <View style={styles.card}>
          <SectionTitle title="User Details" />
          <View style={styles.userRow}>
            <View style={styles.avatarPlaceholder}>
              <MaterialCommunityIcons name="account" size={24} color={C.orange} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{tripData?.user_name || '—'}</Text>
              <Text style={styles.userPhone}>
                {tripData?.mobile || 'No phone available'}
              </Text>
            </View>
            {!!tripData?.rider?.mobile_number && (
              <TouchableOpacity
                style={styles.callButton}

                onPress={() => {
                const phone = tripData?.rider?.mobile_number;
                if (phone) {
                    Linking.openURL(`tel:${phone}`);
                    } else {
                    Alert.alert('SOS', 'No phone number available.');
                    }
                  }}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="phone" size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Trip Route Card ── */}
        <View style={styles.card}>
          <SectionTitle title="Trip Route" />

          <View style={styles.routePointRow}>
            <MaterialCommunityIcons
              name="circle-slice-8"
              size={16}
              color={C.green}
              style={styles.routeIcon}
            />
            <View style={styles.routeDetails}>
              <Text style={styles.routeLabel}>Pickup Point</Text>
              <Text style={styles.routeAddress}>{tripData?.picup_location || '—'}</Text>
            </View>
          </View>

          <View style={styles.routeLine} />

          <View style={styles.routePointRow}>
            <MaterialCommunityIcons
              name="map-marker"
              size={18}
              color={C.red}
              style={styles.routeIcon}
            />
            <View style={styles.routeDetails}>
              <Text style={styles.routeLabel}>Drop Point</Text>
              <Text style={styles.routeAddress}>{tripData?.drop_location || '—'}</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Distance</Text>
              <Text style={styles.metricValue}>{formatDistance(tripData?.distance)}</Text>
            </View>
            <View style={styles.verticalDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Est. Duration</Text>
              <Text style={styles.metricValue}>{formatDuration(tripData?.time_duration)}</Text>
            </View>
          </View>
        </View>

        {/* ── Vehicle Details Card ── */}
        {/* <View style={styles.card}>
          <SectionTitle title="Vehicle Details" />
          <View style={styles.vehicleRow}>
            <View style={styles.carIconBox}>
              <MaterialCommunityIcons name="car" size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vehicleName}>{tripData?.vehicle?.name || '—'}</Text>
              <Text style={styles.vehicleCategory}>{tripData?.vehicle?.category_name}</Text>
            </View>
          </View>
        </View> */}

        {/* ── Payment Details Card ── */}
        <View style={styles.card}>
          <SectionTitle title="Payment Details" />
          <View style={styles.paymentDataRow}>
            <Text style={styles.paymentLabel}>Payment Mode</Text>
            <Text style={[styles.paymentValue, { textTransform: 'capitalize' }]}>
              {tripData?.payment_mode || '—'}
            </Text>
          </View>
          <View style={styles.paymentDataRow}>
            <Text style={styles.paymentLabel}>Payment Status</Text>
            <Text
              style={[
                styles.paymentValue,
                {
                  color:
                    tripData?.payment_status === '0'
                      ? C.orange
                      : tripData?.payment_status === '1'
                      ? C.green
                      : C.textPrimary,
                  textTransform: 'capitalize',
                },
              ]}
            >
              {tripData?.payment_status=='1'? 'Completed':'pending'}
            </Text>
          </View>
          <View style={styles.paymentDataRow}>
            <Text style={styles.paymentLabel}>Total Fare</Text>
            <Text style={[styles.paymentValue, { color: C.orange, fontWeight: '700' }]}>
              {formatAmount(tripData?.fare)}
            </Text>
          </View>
        </View>

        {/* ── Ratings Section (only after completed) ── */}

        {/* Your rating to the driver — already submitted */}
        {tripData?.driver_rating && (
          <View style={styles.card}>
            <SectionTitle title="My Rating" />
            <View style={styles.ratingDisplayRow}>
              <Text style={styles.ratingLabel}>
                You rated 
              </Text>
              <StarRow rating={tripData?.driver_rating?.rating} size={18} />
            </View>
          </View>
        )}

        {/* Driver's rating of the user */}
        {tripData?.user_rating &&(
          <View style={styles.card}>
            <SectionTitle title="User Rating to Driver" />
            <View style={styles.ratingDisplayRow}>
              <Text style={styles.ratingLabel}>
                {tripData?.user_name || 'User'} rated you
              </Text>
              <StarRow rating={tripData?.user_rating} size={18} />
            </View>
          </View>
        )}

        {/* ── Action Buttons ── */}
        {/* Nothing shown during active ride */}

          <View style={styles.actionContainer}>

            {/* Pay Now — collect Payout + online + payment pending */}
            {showPayNow && (
              <TouchableOpacity
                style={[styles.primaryActionButton, { backgroundColor: C.blue }]}
                onPress={collectPayout}
                disabled={payingNow}
                activeOpacity={0.85}
              >
                {payingNow ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name="credit-card-outline"
                      size={20}
                      color="#fff"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.actionButtonText}>Collect Amount</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Rate the Driver — completed + driver not yet rated */}
            {!tripData?.driver_rating && tripData?.booking_status_name=="Completed" &&(
              <TouchableOpacity
                style={[styles.primaryActionButton, { backgroundColor: C.orange }]}
                onPress={() => setRatingModalVisible(true)}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name="star-circle-outline"
                  size={20}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.actionButtonText}>Rate the {tripData?.user_name}</Text>
              </TouchableOpacity>
            )}

              {tripData?.booking_status_name=="Completed" &&
              <TouchableOpacity
                style={styles.downloadInvoiceBtn}
                onPress={handleDownloadInvoice}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons
                  name="download"
                  size={16}
                  color="#fff"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.downloadText}>Download Invoice / Receipt</Text>
              </TouchableOpacity>
}
          
          </View>
   
      </ScrollView>

      {/* ── Rating Modal ── */}
      <Modal visible={ratingModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <MaterialCommunityIcons
              name="star-circle"
              size={44}
              color={C.orange}
              style={{ marginBottom: 8 }}
            />
            <Text style={styles.modalTitle}>Rate the User</Text>
            <Text style={styles.modalSubtitle}>
              How was your experience with{' '}
              {tripData?.user_name || 'the user'}?
            </Text>

            <StarRow
              rating={selectedRating}
              size={38}
              interactive
              onRate={setSelectedRating}
            />

            {selectedRating > 0 && (
              <Text style={styles.ratingHint}>{ratingLabel(selectedRating)}</Text>
            )}

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => {
                  setRatingModalVisible(false);
                  setSelectedRating(0);
                }}
                disabled={submittingRating}
              >
                <Text style={styles.modalCancelText}>Dismiss</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, selectedRating === 0 && { opacity: 0.45 }]}
                onPress={handleGiveRating}
                disabled={submittingRating || selectedRating === 0}
              >
                {submittingRating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default BookingDetails;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },
  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: C.textSecondary, fontSize: 14, marginTop: 8 },
  retryBtn: {
    marginTop: 16,
    backgroundColor: C.orange,
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
    backgroundColor: C.bg,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#0E0E0E',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2C2C2C',
  },
  headerTitle: {
    color: C.textPrimary, fontWeight: '700',
    fontSize: rs(15, 16, 17), letterSpacing: 0.3,
  },
  icon:{height:38, width:38,borderRadius:19,resizeMode:'cover'},
  scrollContainer: { paddingHorizontal: 16, paddingVertical: 14, paddingBottom: 50 },
  statusRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  statusText: { color: '#FFF', fontSize: rs(11, 12, 12), fontWeight: '700' },
  idBadge: { backgroundColor: '#262626', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  idText: { color: C.textSecondary, fontSize: rs(11, 12, 12), fontWeight: '500' },
  infoBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#1E1600', borderRadius: 10,
    borderWidth: 0.5, borderColor: C.orange,
    padding: 12, marginBottom: 12,
  },
  infoBannerText: {
    color: '#E5B97A', fontSize: rs(11, 12, 12),
    fontWeight: '500', flex: 1, lineHeight: 17,
  },
  cancelledBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#1E0A0A', borderRadius: 10,
    borderWidth: 0.5, borderColor: C.red,
    padding: 12, marginBottom: 12,
  },
  cancelledText: {
    color: '#FF6B6B', fontSize: rs(11, 12, 12),
    fontWeight: '500', flex: 1, lineHeight: 17,
  },
  card: {
    backgroundColor: C.cardBg, borderRadius: 12,
    padding: 14, marginBottom: 12,
    borderWidth: 0.5, borderColor: C.border,
  },
  cardSectionTitle: {
    color: C.textSecondary, fontSize: rs(11, 12, 13),
    fontWeight: '600', marginBottom: 10,
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  userRow: { flexDirection: 'row', alignItems: 'center' },
  avatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  userInfo: { flex: 1 },
  userName: { color: C.textPrimary, fontSize: rs(13, 14, 15), fontWeight: '700' },
  userPhone: { color: C.textSecondary, fontSize: rs(11, 12, 12), marginTop: 2 },
  callButton: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: C.green, justifyContent: 'center', alignItems: 'center',
  },
  routePointRow: { flexDirection: 'row', alignItems: 'flex-start' },
  routeIcon: { marginTop: 2, marginRight: 10 },
  routeDetails: { flex: 1 },
  routeLabel: { color: C.textPrimary, fontSize: rs(12, 13, 13), fontWeight: '700' },
  routeAddress: {
    color: C.textSecondary, fontSize: rs(11, 12, 12), lineHeight: 17, marginTop: 2,
  },
  routeLine: {
    width: 1, height: 20, backgroundColor: '#444',
    marginLeft: 8, marginVertical: 4,
  },
  cardDivider: { height: 0.5, backgroundColor: C.border, marginVertical: 12 },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  metricItem: { alignItems: 'center', flex: 1 },
  metricLabel: { color: C.textSecondary, fontSize: rs(11, 11, 12), marginBottom: 4 },
  metricValue: { color: C.textPrimary, fontSize: rs(13, 14, 14), fontWeight: '700' },
  verticalDivider: { width: 1, height: 28, backgroundColor: C.border },
  vehicleRow: { flexDirection: 'row', alignItems: 'center' },
  carIconBox: {
    width: 44, height: 32, borderRadius: 6,
    backgroundColor: '#262626', justifyContent: 'center',
    alignItems: 'center', marginRight: 12,
  },
  vehicleName: { color: C.textPrimary, fontSize: rs(12, 13, 14), fontWeight: '600' },
  vehicleCategory: { color: C.textSecondary, fontSize: rs(11, 11, 12), marginTop: 2 },
  paymentDataRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginVertical: 5,
  },
  paymentLabel: { color: C.textSecondary, fontSize: rs(12, 12, 13) },
  paymentValue: { color: C.textPrimary, fontSize: rs(12, 12, 13), fontWeight: '500' },
  ratingDisplayRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  ratingLabel: { color: C.textSecondary, fontSize: rs(12, 13, 13), flex: 1 },
  starsRow: { flexDirection: 'row', alignItems: 'center' },
  actionContainer: { marginTop: 8, gap: 12 },
  primaryActionButton: {
    borderRadius: 10, height: 50,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
  },
  actionButtonText: { color: '#FFF', fontSize: rs(14, 14, 15), fontWeight: '700' },
  downloadInvoiceBtn: {
    backgroundColor: '#111111', borderRadius: 10, height: 46,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: C.border,
  },
  downloadText: { color: '#FFF', fontSize: rs(12, 13, 13), fontWeight: '600' },
  // Modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center', alignItems: 'center',
  },
  modalContent: {
    width: width * 0.85, backgroundColor: '#141414',
    borderRadius: 18, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: '#333',
  },
  modalTitle: { color: '#FFF', fontSize: rs(16, 18, 19), fontWeight: '700', marginBottom: 6 },
  modalSubtitle: {
    color: C.textSecondary, fontSize: rs(12, 13, 13),
    textAlign: 'center', marginBottom: 20,
    paddingHorizontal: 10, lineHeight: 18,
  },
  ratingHint: { color: C.orange, fontSize: rs(13, 14, 14), fontWeight: '600', marginTop: 10 },
  modalButtonsRow: { flexDirection: 'row', gap: 12, width: '100%', marginTop: 24 },
  modalCancelBtn: {
    flex: 1, height: 44, backgroundColor: '#2A2A2A',
    borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  modalCancelText: { color: '#FFF', fontWeight: '600', fontSize: rs(13, 14, 14) },
  modalSubmitBtn: {
    flex: 1, height: 44, backgroundColor: C.orange,
    borderRadius: 10, justifyContent: 'center', alignItems: 'center',
  },
  modalSubmitText: { color: '#FFF', fontWeight: '700', fontSize: rs(13, 14, 14) },
});