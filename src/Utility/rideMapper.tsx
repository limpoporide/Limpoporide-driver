import { AvailableRide } from '../types/api';
import { NewRideRequest } from '../components/NewRideRequestModal/NewRideRequestModal';

export function mapApiRideToNewRideRequest(data: AvailableRide): NewRideRequest {
  return {
    ride_id: data.ride_id,
    user: {
      full_name: data.customer?.name ?? 'Unknown',
      profile_photo: data.customer?.image ?? null,
    },
    pickup_address: data.pickup_address,
    drop_address: data.drop_address,
    distance_km: data.distance_km,
    total_fare: data.estimated_fare,
    booked_at: data.booking_time,
    time_remaining: data.time_remaining,   // ← new
    ride_type: data.ride_type,             // ← new
  };
}