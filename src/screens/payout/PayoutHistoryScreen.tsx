import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bankAPI } from '../../services/api';

const { width, height } = Dimensions.get('window');
const isSmall = width < 375;
const isMedium = width >= 375 && width < 414;

const rs = (s: number, m: number, l: number) => (isSmall ? s : isMedium ? m : l);

const C = {
  bg: '#0E0E0E',
  card: '#1C1C1C',
  cardBorder: '#2A2A2A',
  orange: '#FF8C00',
  orangeLight: '#FFB347',
  orangeDim: 'rgba(255,140,0,0.12)',
  green: '#22C55E',
  greenDim: 'rgba(34,197,94,0.15)',
  red: '#EF4444',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0A0',
  textMuted: '#555555',
  divider: '#242424',
  headerBg: '#FF8C00',
  rowBg: '#181818',
  rowBorder: '#252525',
  white: '#FFFFFF',
};

interface PayoutItem {
  id: string;
  bookingId: string;
  payoutId: string;
  date: string;
  time: string;
  amount: string;
  status: 'pending' | 'settled';
}

// ─── Summary Card ───────────────────────────────────────────────────────────────
function SummaryCard({
  icon, label, value, iconBg,
}: { icon: string; label: string; value: string; iconBg: string }) {
  return (
    <View style={summaryStyles.card}>
      <View style={[summaryStyles.iconWrap, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={rs(22, 26, 28)} color={C.orange} />
      </View>
      <Text style={summaryStyles.label}>{label}</Text>
      <Text style={summaryStyles.value}>{value}</Text>
    </View>
  );
}

const summaryStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: rs(12, 14, 16),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.cardBorder,
    marginHorizontal: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  iconWrap: {
    width: rs(44, 50, 54),
    height: rs(44, 50, 54),
    borderRadius: rs(22, 25, 27),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  label: {
    color: C.textPrimary,
    fontSize: rs(10, 11, 12),
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  value: {
    color: C.orange,
    fontSize: rs(15, 17, 19),
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});

// ─── Payout Row ─────────────────────────────────────────────────────────────────
function PayoutRow({ item }: { item: PayoutItem }) {
  const isPending = item.status === 'pending';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor: isPending
                ? 'rgba(255,140,0,0.15)'
                : 'rgba(34,197,94,0.15)',
            },
          ]}>
          <MaterialCommunityIcons
            name={isPending ? 'clock-outline' : 'check-circle'}
            size={24}
            color={isPending ? '#FF8C00' : '#22C55E'}
          />
        </View>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.payoutId}>{item.payoutId}</Text>
          <Text style={styles.date}>{item.date}</Text>
        </View>

        <Text style={styles.amount}>{item.amount}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomRow}>
        <View
          style={[
            styles.statusChip,
            {
              backgroundColor: isPending
                ? 'rgba(255,140,0,0.15)'
                : 'rgba(34,197,94,0.15)',
            },
          ]}>
          <Text
            style={{
              color: isPending ? '#FF8C00' : '#22C55E',
              fontWeight: '700',
            }}>
            {isPending ? 'Pending' : 'Settled'}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ────────────────────────────────────────────────────────────────
type Tab = 'Pending' | 'Settled';

interface PayoutHistoryScreenProps {
  navigation?: any;
}

export default function PayoutHistoryScreen({ navigation }: PayoutHistoryScreenProps) {
  const [activeTab, setActiveTab] = useState<Tab>('Pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalEarning, setTotalEarning] = useState('R0.00');
  const [settledAmount, setSettledAmount] = useState('R0.00');
  const [pendingPayouts, setPendingPayouts] = useState<PayoutItem[]>([]);
  const [completedPayouts, setCompletedPayouts] = useState<PayoutItem[]>([]);

  // Derived from activeTab — always in sync, no separate "payouts" state to drift
  const payouts = activeTab === 'Pending' ? pendingPayouts : completedPayouts;

  const headerFS = rs(16, 18, 20);

  // Fetch once on mount. Both lists come back in a single call, so tab
  // switches don't need to hit the network again — see setActiveTab below.
  useEffect(() => {
    getPayout();
  }, []);

  const mapItem = (item: any, status: 'pending' | 'settled'): PayoutItem => ({
    id: String(item.id),
    bookingId: item.booking_id ?? '--',
    payoutId: item.payout_token,
    date: item.created_at,
    time: '',
    amount: `R${Number(item.amount).toFixed(2)}`,
    status,
  });

  const getPayout = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await bankAPI.getAllPayout();

      if (response?.status) {
        const data = response.data;

        setTotalEarning(`R${Number(data.pending_payout_amount ?? 0).toFixed(2)}`);
        setSettledAmount(`R${Number(data.completed_payout_amount ?? 0).toFixed(2)}`);

        setPendingPayouts(
          (data.pending_payout || []).map((item: any) => mapItem(item, 'pending'))
        );
        setCompletedPayouts(
          (data.completed_payout || []).map((item: any) => mapItem(item, 'settled'))
        );
      } else {
        setError(response?.message || 'Could not load payouts.');
      }
    } catch (e) {
      console.log(e);
      setError('Something went wrong while loading payouts.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation?.goBack?.()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={22} color={C.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { fontSize: headerFS }]}>Payout History</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* ── Summary Cards ── */}
      <View style={styles.summaryRow}>
        <SummaryCard
          icon="currency-ngn"
          label="Total Earning"
          value={totalEarning}
          iconBg={C.orangeDim}
        />
        <SummaryCard
          icon="bank-transfer"
          label="Settled Amount"
          value={settledAmount}
          iconBg={C.orangeDim}
        />
      </View>

      {/* ── Tab Bar ── */}
      <View style={styles.tabBar}>
        {(['Pending', 'Settled'] as Tab[]).map((tab) => {
          const active = tab === activeTab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab}</Text>
              {active && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── List ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={C.orange} />
          </View>
        ) : error ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="alert-circle-outline" size={52} color={C.textMuted} />
            <Text style={styles.emptyText}>{error}</Text>
            <TouchableOpacity onPress={getPayout} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : payouts.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="cash-off" size={52} color={C.textMuted} />
            <Text style={styles.emptyText}>
              No {activeTab.toLowerCase()} payouts found
            </Text>
          </View>
        ) : (
          payouts.map((item) => <PayoutRow key={item.id} item={item} />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },

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
    backgroundColor: C.card, alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: '#2C2C2C',
  },
  headerTitle: { color: C.textPrimary, fontWeight: '700', letterSpacing: 0.3 },

  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: rs(12, 14, 16),
    paddingTop: rs(14, 16, 18),
    paddingBottom: rs(6, 8, 10),
  },

  tabBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: rs(14, 16, 18),
    paddingTop: rs(8, 10, 12),
    borderBottomWidth: 1,
    borderBottomColor: C.divider,
  },
  tab: {
    paddingVertical: rs(8, 10, 11),
    paddingHorizontal: rs(14, 18, 22),
    position: 'relative',
    alignItems: 'center',
  },
  tabActive: {},
  tabText: { color: C.textPrimary, fontSize: rs(12, 13, 14), fontWeight: '600' },
  tabTextActive: { color: C.orange, fontWeight: '800' },
  tabUnderline: {
    position: 'absolute', bottom: 0, left: 10, right: 10,
    height: 2.5, backgroundColor: C.orange, borderRadius: 2,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: rs(14, 16, 18),
    paddingTop: 12,
    paddingBottom: 30,
  },

  emptyState: {
    alignItems: 'center', justifyContent: 'center',
    paddingTop: height * 0.15, gap: 12,
  },
  emptyText: { color: C.textMuted, fontSize: 15, fontWeight: '500', textAlign: 'center' },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.orangeDim,
    borderWidth: 1,
    borderColor: C.orange + '40',
  },
  retryText: { color: C.orange, fontWeight: '700', fontSize: 13 },

  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  payoutId: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
  },
  date: {
    color: '#8E8E8E',
    marginTop: 4,
    fontSize: 12,
  },
  amount: {
    color: '#FF8C00',
    fontSize: 20,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 14,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
});