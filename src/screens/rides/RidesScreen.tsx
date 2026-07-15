import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
  ListRenderItem,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { MainTabScreenProps } from '../../types/navigation';
import { ridesAPI } from '../../services/api';
import { Ride, ApiError } from '../../types/api';
import {SafeAreaView} from 'react-native-safe-area-context';

type RidesScreenProps = MainTabScreenProps<'Rides'>;

export default function RidesScreen({}: RidesScreenProps): React.ReactElement {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

  useEffect(() => {
    loadRides();

    // Auto-refresh rides every 5 seconds
    // const interval = setInterval(loadRides, 5000);

    // return () => clearInterval(interval);
  }, []);

  const loadRides = async (): Promise<void> => {
    try {
      const response = await ridesAPI.getAvailableRides();
      console.log("Umcoping --->",response);
      
      
      setRides([response.data] || []);
    } catch (error) {
      if (!loading && !refreshing) {
        const apiError = error as ApiError;
        const errorMessage = apiError.message || 'Failed to load rides';
        Alert.alert('Error', errorMessage);
      }
      console.error('Load rides error:', error);
    }
  };

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadRides();
    setRefreshing(false);
  };

  const handleAcceptRide = async (rideId: number): Promise<void> => {
    setAcceptingId(rideId);
    try {
       const response = await ridesAPI.acceptRide(rideId);
       console.log('handleAcceptRide response:::::',response);
       
      // Alert.alert('Success', 'Ride accepted! Proceed to pickup location');
      loadRides();
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.message || 'Failed to accept ride';
      Alert.alert('Error', errorMessage);
    } finally {
      setAcceptingId(null);
    }
  };
console.log('rides:::::',rides);

  const handleRejectRide = async (rideId: number): Promise<void> => {
    try {
      const response = await ridesAPI.rejectRide(rideId);
      console.log('handleRejectRide:::::::', response);
      
      // Alert.alert('Success', 'Ride declined');
      loadRides();
    } catch (error) {
      const apiError = error as ApiError;
      const errorMessage = apiError.message || 'Failed to decline ride';
      Alert.alert('Error', errorMessage);
    }
  };

  const formatTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateString;
    }
  };

  const formatDistance = (distance: string): string => {
  if (!distance || parseFloat(distance) === 0) return '0 km';
  return `${parseFloat(distance).toFixed(1)} km`;  // already in km from API
};

const renderRideCard: ListRenderItem<Ride> = ({ item }) => (
  <View style={styles.rideCard}>
    <View style={styles.rideHeader}>
      <View style={styles.rideIdContainer}>
        <Text style={styles.rideId}>#{item.ride_id}</Text>
        {/* passenger_rating not in API - remove or show N/A */}
        <View style={styles.ratingBadge}>
          <MaterialCommunityIcons name="star" size={14} color="#FFD580" />
          <Text style={styles.ratingText}>N/A</Text>
        </View>
      </View>
      <Text style={styles.pickupTime}>{formatTime(item.created_at)}</Text>
    </View>

    <View style={styles.routeContainer}>
      <View style={styles.routePoint}>
        <MaterialCommunityIcons name="map-marker" size={20} color="#FF8C00" />
        <View style={styles.routeText}>
          <Text style={styles.routeLabel}>Pickup</Text>
          <Text style={styles.routeAddress} numberOfLines={2}>
            {item.pickup_address || 'Location not specified'}  {/* ✅ fixed */}
          </Text>
        </View>
      </View>

      <View style={styles.routeLine} />

      <View style={styles.routePoint}>
        <MaterialCommunityIcons name="map-marker-check" size={20} color="#4CAF50" />
        <View style={styles.routeText}>
          <Text style={styles.routeLabel}>Dropoff</Text>
          <Text style={styles.routeAddress} numberOfLines={2}>
            {item.drop_address || 'Location not specified'}  {/* ✅ fixed */}
          </Text>
        </View>
      </View>
    </View>

    <View style={styles.detailsContainer}>
      <View style={styles.detail}>
        <MaterialCommunityIcons name="road-variant" size={16} color="#666" />
        <Text style={styles.detailText}>{formatDistance(item.distance_km)}</Text>  {/* ✅ fixed */}
      </View>

      <View style={styles.detail}>
        <MaterialCommunityIcons name="cash" size={16} color="#666" />
        <Text style={styles.detailText}>R{item.total_fare || '0'}</Text>  {/* ✅ fixed */}
      </View>

      <View style={styles.detail}>
        <MaterialCommunityIcons name="account" size={16} color="#666" />
        <Text style={styles.detailText}>{item.user?.full_name || 'Passenger'}</Text>  {/* ✅ fixed */}
      </View>
    </View>

    {/* action buttons stay the same */}
    <View style={styles.actionButtons}>
      <TouchableOpacity
        style={styles.rejectButton}
        onPress={() => handleRejectRide(item.id)}
        disabled={acceptingId === item.id}
      >
        <MaterialCommunityIcons name="close-circle" size={20} color="#fff" />
        <Text style={styles.buttonText}>Decline</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.acceptButton, acceptingId === item.id && styles.buttonDisabled]}
        onPress={() => handleAcceptRide(item.id)}
        disabled={acceptingId !== null}
      >
        {acceptingId === item.id ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
            <Text style={styles.buttonText}>Accept</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  </View>
);

  const renderEmptyState = (): React.ReactElement => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="inbox-outline" size={64} color="#FFD580" />
      <Text style={styles.emptyText}>No available rides</Text>
      <Text style={styles.emptySubtext}>Check back soon or refresh the list</Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={onRefresh}
        disabled={refreshing}
      >
        <Text style={styles.emptyButtonText}>Refresh Now</Text>
      </TouchableOpacity>
    </View>
  );

  return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Available Rides</Text>
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{rides.length}</Text>
              </View>
            </View>

            <FlatList
            data={rides}
              renderItem={renderRideCard}
              keyExtractor={(item) => item?.id?.toString()}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              ListEmptyComponent={renderEmptyState}
              contentContainerStyle={
                rides.length === 0 ? styles.emptyListContent : styles.listContent
              }
            />
          </View>
        </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#101010',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#101010',
    borderBottomWidth: 1,
    borderBottomColor: '#FFD580',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF8C00',
  },
  headerBadge: {
    backgroundColor: '#FF8C00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  headerBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  rideCard: {
    backgroundColor: '#282828',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#FFD580',
    shadowColor: '#FF8C00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FFD580',
  },
  rideIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rideId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF8C00',
    marginRight: 10,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    fontSize: 12,
    color: '#FF8C00',
    fontWeight: '600',
    marginLeft: 4,
  },
  pickupTime: {
    fontSize: 12,
    color: '#fff',
  },
  routeContainer: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#FFD580',
    marginLeft: 9,
    marginVertical: 2,
  },
  routeText: {
    flex: 1,
    marginLeft: 10,
  },
  routeLabel: {
    fontSize: 12,
    color: '#fff',
    marginBottom: 2,
  },
  routeAddress: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '500',
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 5,
    backgroundColor: '#FFF8F0',
    borderRadius: 8,
    marginBottom: 12,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginLeft: 5,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f44336',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptButton: {
    flex: 1.5,
    flexDirection: 'row',
    backgroundColor: '#FF8C00',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 15,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  emptyButton: {
    marginTop: 20,
    backgroundColor: '#FF8C00',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});
