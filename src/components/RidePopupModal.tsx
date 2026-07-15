import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export interface RideData {
  id: number;
  ride_id: string | number;
  pickup_address: string;
  drop_address: string;
  distance_km: string;
  total_fare: string;
  created_at: string;
  isUpcoming?: boolean;
  user?: string;
}

interface RidePopupProps {
  ride: RideData | null;
  visible: boolean;
  onAccept: (id: number | string) => void;
  onDecline: (id: number | string) => void;
  acceptingId: number | null;
  timeLeft: number;
}

const RidePopupModal: React.FC<RidePopupProps> = ({
  ride,
  visible,
  onAccept,
  onDecline,
  acceptingId,
  timeLeft,
}) => {
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
    if (!distance || parseFloat(distance) === 0) {
      return '0 km';
    }

    return `${parseFloat(distance).toFixed(1)} km`;
  };

  const timerColor = timeLeft <= 10 ? '#f44336' : '#FF8C00';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Header */}

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.rideId}>#{ride.ride_id}</Text>

              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: ride.isUpcoming ? '#4CAF50' : '#FF8C00',
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={ride.isUpcoming ? 'clock-outline' : 'car'}
                  size={12}
                  color="#fff"
                />

                <Text style={styles.badgeText}>
                  {ride.isUpcoming ? 'Upcoming Booking' : 'New Ride'}
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.timerBadge,
                {
                  borderColor: timerColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.timerText,
                  {
                    color: timerColor,
                  },
                ]}
              >
                {timeLeft}s
              </Text>
            </View>
          </View>

          <Text style={styles.time}>{formatTime(ride.created_at)}</Text>

          {/* Pickup */}

          <View style={styles.routeContainer}>
            <View style={styles.routePoint}>
              <MaterialCommunityIcons
                name="map-marker"
                size={20}
                color="#FF8C00"
              />

              <View style={styles.routeText}>
                <Text style={styles.routeLabel}>Pickup</Text>

                <Text style={styles.routeAddress} numberOfLines={2}>
                  {ride.pickup_address || 'Location not available'}
                </Text>
              </View>
            </View>

            <View style={styles.routeLine} />

            <View style={styles.routePoint}>
              <MaterialCommunityIcons
                name="map-marker-check"
                size={20}
                color="#4CAF50"
              />

              <View style={styles.routeText}>
                <Text style={styles.routeLabel}>Dropoff</Text>

                <Text style={styles.routeAddress} numberOfLines={2}>
                  {ride.drop_address || 'Location not available'}
                </Text>
              </View>
            </View>
          </View>

          {/* Ride Details */}

          <View style={styles.detailsRow}>
            <View style={styles.detail}>
              <MaterialCommunityIcons
                name="road-variant"
                size={16}
                color="#aaa"
              />
              <Text style={styles.detailText}>
                {formatDistance(ride.distance_km)}
              </Text>
            </View>

            <View style={styles.detail}>
              <MaterialCommunityIcons
                name="cash"
                size={16}
                color="#aaa"
              />
              <Text style={styles.detailText}>
                R{ride.total_fare || '0'}
              </Text>
            </View>

            <View style={styles.detail}>
              <MaterialCommunityIcons
                name="account"
                size={16}
                color="#aaa"
              />
              <Text style={styles.detailText}>
                {ride.user || 'Passenger'}
              </Text>
            </View>
          </View>

          {/* Progress */}

          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(timeLeft / 30) * 100}%`,
                  backgroundColor: timerColor,
                },
              ]}
            />
          </View>

          {/* Buttons */}

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={() => onDecline(ride.ride_id)}
              disabled={acceptingId === ride.id}
            >
              <MaterialCommunityIcons
                name="close-circle"
                color="#fff"
                size={20}
              />

              <Text style={styles.buttonText}>Decline</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.acceptButton,
                acceptingId === ride.id && styles.buttonDisabled,
              ]}
              onPress={() => onAccept(ride.ride_id)}
              disabled={acceptingId !== null}
            >
              {acceptingId === ride.id ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <MaterialCommunityIcons
                    name="check-circle"
                    color="#fff"
                    size={20}
                  />

                  <Text style={styles.buttonText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default RidePopupModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    marginBottom: '10%',
    borderTopWidth: 2,
    borderColor: '#FFD580',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rideId: {
    color: '#FF8C00',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  badge: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '600',
  },
  timerBadge: {
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timerText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  time: {
    color: '#aaa',
    marginTop: 6,
    marginBottom: 15,
  },
  routeContainer: {
    marginBottom: 15,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  routeText: {
    flex: 1,
    marginLeft: 10,
  },
  routeLabel: {
    color: '#aaa',
    fontSize: 11,
  },
  routeAddress: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
  },
  routeLine: {
    width: 2,
    height: 18,
    backgroundColor: '#FFD580',
    marginLeft: 9,
    marginVertical: 2,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 15,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    color: '#ccc',
    marginLeft: 5,
    fontWeight: '500',
    fontSize: 12,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 15,
  },
  progressFill: {
    height: '100%',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    marginRight: 5,
  },
  acceptButton: {
    flex: 1.5,
    flexDirection: 'row',
    backgroundColor: '#FF8C00',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 12,
    marginLeft: 5,
  },
  buttonText: {
    color: '#fff',
    marginLeft: 5,
    fontWeight: '700',
    fontSize: 14,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});