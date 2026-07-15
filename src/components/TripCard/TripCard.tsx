import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

export interface TripCardRide {
  ride_id: string;
  user: {
    full_name: string;
    profile_photo?: string | null;
  };
  pickup_address: string;
  drop_address: string;
  distance_km: string;
  total_fare: string;
  status: string;
}

interface TripCardProps {
  ride: TripCardRide;
  onPress?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

const TripCard: React.FC<TripCardProps> = ({
  ride,
  onPress,
  actionLabel,
  onAction,
}) => {
  return (
    <TouchableOpacity
      style={styles.tripCard}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
    >
      <Text style={styles.sectionTitle}>Trip Start</Text>

      <View style={styles.tripRow}>
        {/* Avatar */}
        <View style={styles.tripAvatar}>
          <MaterialCommunityIcons name="account" size={30} color="#FF8C00" />
        </View>

        {/* Info */}
        <View style={styles.tripInfo}>
          <Text style={styles.tripDriverName} numberOfLines={1}>
            {ride?.customer?.name}
          </Text>

          {/* Pickup */}
          <View style={styles.tripAddressRow}>
            <MaterialCommunityIcons name="map-marker" size={13} color="#FF8C00" />
            <Text style={styles.tripAddress} numberOfLines={2}>
              {ride.pickup_address}
            </Text>
          </View>

          {/* Drop */}
          <View style={styles.tripAddressRow}>
            <MaterialCommunityIcons name="map-marker-outline" size={13} color="#aaa" />
            <Text style={styles.tripSubAddress} numberOfLines={2}>
              {ride.drop_address}
            </Text>
          </View>
        </View>
      </View>

      {/* Distance + Fare */}
      <View style={styles.tripFooter}>
        <View style={styles.tripMeta}>
          <MaterialCommunityIcons name="road-variant" size={14} color="#aaa" />
          <Text style={styles.tripDistance}>
            {parseFloat(ride.distance_km).toFixed(2)} km
          </Text>
        </View>

        <View style={styles.tripMetaRight}>
          <Text style={styles.rideIdText}>#{ride.ride_id}</Text>
          <Text style={styles.tripFare}>
            R{parseFloat(ride.total_fare).toLocaleString('en', {
              minimumFractionDigits: 2,
            })}
          </Text>
        </View>
      </View>

      {/* Optional Action Button */}
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.actionButton} onPress={onAction}>
          <Text style={styles.actionButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

export default TripCard;

const styles = StyleSheet.create({
  tripCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fff',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 10,
  },
  tripRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tripAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A3A',
  },
  tripInfo: {
    flex: 1,
    gap: 4,
  },
  tripDriverName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  tripAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
    marginBottom: 2,
  },
  tripAddress: {
    fontSize: 12,
    color: '#fff',
    flex: 1,
    lineHeight: 16,
  },
  tripSubAddress: {
    fontSize: 12,
    color: '#fff',
    flex: 1,
    lineHeight: 16,
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  tripMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tripMetaRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  tripDistance: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  rideIdText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: '500',
  },
  tripFare: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF8C00',
  },
  actionButton: {
    marginTop: 12,
    backgroundColor: '#FF8C00',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
});