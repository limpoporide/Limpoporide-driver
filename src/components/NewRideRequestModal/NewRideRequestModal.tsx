import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export interface NewRideRequest {
  ride_id: number;
  user: {
    full_name: string;
    profile_photo?: string | null;
  };
  pickup_address: string;
  drop_address: string;
  distance_km: number;
  total_fare: number;
  booked_at: string;
  time_remaining?: number;  
  ride_type?: string;    
}

interface NewRideRequestModalProps {
  visible: boolean;
  ride: NewRideRequest | null;
  timerSeconds?: number;
  onAccept: (ride: NewRideRequest) => void;
  onReject: (ride: NewRideRequest) => void;
  onTimeout?: (ride: NewRideRequest) => void;
  title?: string;
}

const NewRideRequestModal: React.FC<NewRideRequestModalProps> = ({
  visible,
  ride,
  timerSeconds = 20,
  onAccept,
  onReject,
  onTimeout,
  title = 'New Ride Request',
}) => {
    const effectiveTimer = ride?.time_remaining ?? timerSeconds;
 const rideTitle =
    ride?.ride_type === 'scheduled'
      ? 'Scheduled Ride Request'
      : ride?.ride_type === 'instant'
      ? 'New Ride Request'
      : (ride?.title ?? title);

  const [timeLeft, setTimeLeft] = useState<number>(effectiveTimer);
  const progressAnim = useRef(new Animated.Value(1)).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible && ride) {
      setTimeLeft(effectiveTimer);
      progressAnim.setValue(1);

      animRef.current = Animated.timing(progressAnim, {
        toValue: 0,
        duration: effectiveTimer * 1000,
        easing: Easing.linear,
        useNativeDriver: false,
      });
      animRef.current.start();

      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            if (ride && onTimeout) onTimeout(ride);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (animRef.current) animRef.current.stop();
    };
  }, [visible, ride]);

  const stopTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (animRef.current) animRef.current.stop();
  };

  const handleAccept = () => {
    stopTimer();
    if (ride) onAccept(ride);
  };

  const handleReject = () => {
    stopTimer();
    if (ride) onReject(ride);
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const timerColor =
    timeLeft > 10 ? '#22c55e' : timeLeft > 5 ? '#FF8C00' : '#ef4444';

  if (!ride) return null;

  const formatBookedAt = (iso: string): string => {
    try {
      const d = new Date(iso);
      const date = d.toISOString().split('T')[0];
      const time = d.toTimeString().slice(0, 8);
      return `${date} at ${time}`;
    } catch {
      return iso;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Timer Progress Bar */}
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBar,
                { width: progressWidth, backgroundColor: timerColor },
              ]}
            />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{rideTitle}</Text> 
           <View style={[styles.timerBadge, { borderColor: timerColor }]}>
              <Text style={[styles.timerText, { color: timerColor }]}>
                {timeLeft}
              </Text>
              <Text style={[styles.timerSec, { color: timerColor }]}>sec</Text>
            </View>
          </View>

          {/* Booked At */}
          <View style={styles.bookedAtRow}>
            <MaterialCommunityIcons name="clock-outline" size={13} color="#aaa" />
            <Text style={styles.bookedAtText}>
              Booked At {formatBookedAt(ride.booked_at)}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* Pickup Distance + Fare */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Pickup Distance</Text>
              <Text style={styles.metaValue}>
                {ride?.distance_km?.toFixed(1)} km
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Fare</Text>
              <Text style={[styles.metaValue, styles.fareValue]}>
                R{ride?.total_fare?.toLocaleString('en', {
                  minimumFractionDigits: 2,
                })}
              </Text>
            </View>
          </View>

          {/* Customer Row */}
          <View style={styles.customerRow}>
            <View style={styles.customerAvatar}>
              <MaterialCommunityIcons name="account" size={22} color="#FF8C00" />
            </View>
            <View>
              <Text style={styles.customerLabel}>Customer</Text>
              <Text style={styles.customerName}>{ride.user.full_name}</Text>
            </View>
          </View>

          {/* Pickup */}
          <View style={styles.addressRow}>
            <View style={styles.dotPickup} />
            <View style={styles.addressTextWrap}>
              <Text style={styles.addressLabel}>PICK-UP</Text>
              <Text style={styles.addressText}>{ride.pickup_address}</Text>
            </View>
          </View>

          {/* Drop */}
          <View style={styles.addressRow}>
            <View style={styles.dotDrop} />
            <View style={styles.addressTextWrap}>
              <Text style={styles.addressLabel}>DROP-OFF</Text>
              <Text style={styles.addressText}>{ride.drop_address}</Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={handleReject}
              activeOpacity={0.85}
            >
              <Text style={styles.rejectText}>Reject</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.acceptBtn}
              onPress={handleAccept}
              activeOpacity={0.85}
            >
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default NewRideRequestModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 18,
    paddingBottom: 60,
    paddingTop: 0,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#333',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  timerBadge: {
    borderWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignItems: 'center',
    minWidth: 46,
  },
  timerText: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 20,
  },
  timerSec: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 1,
  },
  bookedAtRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 12,
  },
  bookedAtText: {
    fontSize: 12,
    color: '#aaa',
  },
  divider: {
    height: 1,
    backgroundColor: '#2E2E2E',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  metaItem: {
    gap: 3,
  },
  metaLabel: {
    fontSize: 11,
    color: '#888',
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
  },
  fareValue: {
    color: '#FF8C00',
    textAlign: 'right',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2A2A2A',
    borderWidth: 1,
    borderColor: '#3A3A3A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerLabel: {
    fontSize: 10,
    color: '#888',
    fontWeight: '500',
  },
  customerName: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '700',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  dotPickup: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF8C00',
    marginTop: 14,
  },
  dotDrop: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
    marginTop: 14,
  },
  addressTextWrap: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 10,
    color: '#888',
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  addressText: {
    fontSize: 12,
    color: '#ccc',
    lineHeight: 17,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  rejectText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#22c55e',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  acceptText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
});