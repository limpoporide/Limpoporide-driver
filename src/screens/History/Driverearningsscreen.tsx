import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { driverAuthAPI } from '../../services/api';

const C = {
  bg: '#0B0B0B',
  card: '#141414',
  border: '#252525',
  orange: '#E59332',
  green: '#22c55e',
  textPrimary: '#FFFFFF',
  textMuted: '#888888',
};

type Period = 'today' | 'weekly' | 'monthly';

// Raw ride/trip record as returned inside today_earning / weekly_earning / monthly_earning
interface EarningTrip {
  id: number;
  booking_id: string;
  fare: string;
  distance?: string;
  time_duration?: string;
  picup_location?: string;
  drop_location?: string;
  booking_date?: string;
  booking_time?: string;
  booking_status?: number;
}

interface EarningsData {
  walletBalance: number;
  today: EarningTrip[];
  weekly: EarningTrip[];
  monthly: EarningTrip[];
}

const EMPTY_DATA: EarningsData = {
  walletBalance: 0,
  today: [],
  weekly: [],
  monthly: [],
};

// Maps the real /driver_earning response into the shape this screen uses.
function normalizeEarnings(raw: any): EarningsData {
  const d = raw?.data ?? {};
  return {
    walletBalance: Number(d.wallet_amount ?? 0),
    today: Array.isArray(d.today_earning) ? d.today_earning : [],
    weekly: Array.isArray(d.weekly_earning) ? d.weekly_earning : [],
    monthly: Array.isArray(d.monthly_earning) ? d.monthly_earning : [],
  };
}

const sumFare = (trips: EarningTrip[]) =>
  trips.reduce((sum, t) => sum + (parseFloat(t.fare) || 0), 0);

const PERIOD_LABEL: Record<Period, string> = {
  today: 'Today',
  weekly: 'This Week',
  monthly: 'This Month',
};

export default function DriverEarningsScreen({ navigation }: any): React.ReactElement {
  const [data, setData] = useState<EarningsData>(EMPTY_DATA);
  const [period, setPeriod] = useState<Period>('weekly'); // weekly has sample data, so default here
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEarnings = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError(null);
      const res = await driverAuthAPI.getEarnings();
      setData(normalizeEarnings(res));
    } catch (e: any) {
      console.log('driver_earning fetch error:', e);
      setError('Unable to load earnings. Pull down to retry.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchEarnings(true);
    }, [fetchEarnings])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEarnings(false);
    setRefreshing(false);
  };

  if (loading) {
    return (
      <View style={styles.fullLoader}>
        <ActivityIndicator size="large" color={C.orange} />
      </View>
    );
  }

  const trips = data[period];
  const periodTotal = sumFare(trips);
  const overallTotal = sumFare(data.today) + sumFare(data.weekly) + sumFare(data.monthly);
  const overallTrips = data.today.length + data.weekly.length + data.monthly.length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <MaterialCommunityIcons name="arrow-left" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Earnings</Text>
        <View style={styles.iconBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.orange} />}
      >
        {error && (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EA2A2A" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Wallet balance hero card */}
        {/* <View style={styles.walletCard}>
          <Text style={styles.walletLabel}>Wallet Balance</Text>
          <Text style={styles.walletValue}>R{data.walletBalance.toFixed(2)}</Text>
        </View> */}

        {/* Overall summary row */}
        <View style={styles.overallRow}>
          <View style={styles.overallItem}>
            <Text style={styles.overallValue}>R{overallTotal.toFixed(2)}</Text>
            <Text style={styles.overallLabel}>Total Earned</Text>
          </View>
          <View style={styles.overallDivider} />
          <View style={styles.overallItem}>
            <Text style={styles.overallValue}>{overallTrips}</Text>
            <Text style={styles.overallLabel}>Total Trips</Text>
          </View>
        </View>

        {/* Period tabs */}
        <View style={styles.tabRow}>
          {(['today', 'weekly', 'monthly'] as Period[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.tab, period === p && styles.tabActive]}
              onPress={() => setPeriod(p)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, period === p && styles.tabTextActive]}>
                {PERIOD_LABEL[p]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Selected period summary */}
        <View style={styles.periodSummaryCard}>
          <View>
            <Text style={styles.periodSummaryLabel}>{PERIOD_LABEL[period]} Earnings</Text>
            <Text style={styles.periodSummaryValue}>R{periodTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.tripCountPill}>
            <MaterialCommunityIcons name="car" size={14} color={C.orange} />
            <Text style={styles.tripCountText}>{trips.length} trips</Text>
          </View>
        </View>

        {/* Trip list for selected period */}
        <View style={styles.sectionHeader}>
          <MaterialCommunityIcons name="receipt" size={16} color={C.orange} />
          <Text style={styles.sectionHeaderText}>Trip Details</Text>
        </View>

        {trips.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="wallet-outline" size={32} color="#444" />
            <Text style={styles.emptyStateText}>No earnings for {PERIOD_LABEL[period].toLowerCase()}</Text>
          </View>
        ) : (
          trips.map((trip) => (
            <View key={trip.id} style={styles.tripCard}>
              <View style={styles.tripCardTop}>
                <Text style={styles.tripBookingId}>{trip.booking_id}</Text>
                <Text style={styles.tripFare}>R{(parseFloat(trip.fare) || 0).toFixed(2)}</Text>
              </View>

              <View style={styles.tripRouteRow}>
                <View style={styles.routeDots}>
                  <View style={styles.dotPickup} />
                  <View style={styles.dotLine} />
                  <View style={styles.dotDrop} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.tripLocationText} numberOfLines={1}>
                    {trip.picup_location ?? '—'}
                  </Text>
                  <Text style={[styles.tripLocationText, { marginTop: 10 }]} numberOfLines={1}>
                    {trip.drop_location ?? '—'}
                  </Text>
                </View>
              </View>

              <View style={styles.tripMetaRow}>
                <View style={styles.tripMetaItem}>
                  <MaterialCommunityIcons name="calendar" size={12} color={C.textMuted} />
                  <Text style={styles.tripMetaText}>{trip.booking_date ?? '—'} • {trip.booking_time ?? '—'}</Text>
                </View>
                {trip.distance ? (
                  <View style={styles.tripMetaItem}>
                    <MaterialCommunityIcons name="map-marker-distance" size={12} color={C.textMuted} />
                    <Text style={styles.tripMetaText}>{trip.distance} km</Text>
                  </View>
                ) : null}
                {trip.time_duration ? (
                  <View style={styles.tripMetaItem}>
                    <MaterialCommunityIcons name="clock-outline" size={12} color={C.textMuted} />
                    <Text style={styles.tripMetaText}>{trip.time_duration}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  fullLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2C2C2C',
  },
  iconBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#0E0E0E',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#2C2C2C',
  },
  headerTitle: { color: '#fff', fontWeight: '700', fontSize: 16, letterSpacing: 0.3 },

  scrollContent: { padding: 16, paddingBottom: 40 },

  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(234,42,42,0.1)',
    borderWidth: 1, borderColor: 'rgba(234,42,42,0.3)',
    borderRadius: 10, padding: 10, marginBottom: 14,
  },
  errorText: { color: '#EA2A2A', fontSize: 12, flex: 1 },

  walletCard: {
    backgroundColor: C.orange,
    borderRadius: 16,
    padding: 20,
    marginBottom: 14,
  },
  walletLabel: { color: 'rgba(0,0,0,0.6)', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  walletValue: { color: '#000', fontSize: 30, fontWeight: '800', marginTop: 6 },

  overallRow: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  overallItem: { flex: 1, alignItems: 'center' },
  overallDivider: { width: 1, backgroundColor: C.border },
  overallValue: { color: '#fff', fontSize: 17, fontWeight: '800' },
  overallLabel: { color: C.textMuted, fontSize: 11, marginTop: 3 },

  tabRow: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  tab: { flex: 1, paddingVertical: 9, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: C.orange },
  tabText: { color: C.textMuted, fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: '#000' },

  periodSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  periodSummaryLabel: { color: C.textMuted, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  periodSummaryValue: { color: C.orange, fontSize: 22, fontWeight: '800', marginTop: 4 },
  tripCountPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(229,147,50,0.12)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6,
  },
  tripCountText: { color: C.orange, fontSize: 11, fontWeight: '700' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionHeaderText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyStateText: { color: '#555', fontSize: 13 },

  tripCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  tripCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tripBookingId: { color: '#fff', fontSize: 13, fontWeight: '700' },
  tripFare: { color: C.orange, fontSize: 16, fontWeight: '800' },

  tripRouteRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  routeDots: { alignItems: 'center', paddingTop: 4 },
  dotPickup: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.green },
  dotLine: { width: 1, height: 18, backgroundColor: '#333', marginVertical: 2 },
  dotDrop: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  tripLocationText: { color: '#ccc', fontSize: 12, lineHeight: 16 },

  tripMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: '#1E1E1E',
    paddingTop: 10,
  },
  tripMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tripMetaText: { color: C.textMuted, fontSize: 11 },
});