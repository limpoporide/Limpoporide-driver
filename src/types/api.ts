// Auth Types
export interface LoginRequest {
  driver_id: string;
  password: string;
  fcm_token?: string;
}

export interface LoginResponse {
  token: string;
  data?: {
    token: string;
    user?: Driver;
  };
}

export interface SignupRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
}

export interface SignupResponse {
  token: string;
  data?: {
    token: string;
    user?: Driver;
  };
}

export interface UpdateProfileImageRequest {
  uri: string;
  type: string;
  name: string;
}
export interface UserProfile {
  id: number;
  user_id: number;
  original: 'user' | 'duplicate' | string;
  name: string;
  email: string;
  phone: string;
  created_at?: string;
  updated_at?: string;
}

// Driver/Profile Types
export interface Driver {
  id: number;
  full_name: string;
  email: string;
  mobile_number: string;
  gender: string;
  profile_photo: string | null;
  is_live: number | boolean;   // API sends 1 or 0
  total_earnings: number;
  today_earnings: number;
  total_trips: number;
  today_trips: number;
  today_hours: number;
  average_rating: number;
  // Not returned by API — optional for manual/future use
  driver_id?: string;
  number_plate?: string;
  vehicle_number?: string;
  rating?: number;
  is_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DriverStats {
  total_trips: number;
  total_earnings: number;
  rating: number;
  completed_trips?: number;
  cancelled_trips?: number;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  phone?: string;
  vehicle_number?: string;
}

// Location Types
export interface LocationData {
  latitude: number;
  longitude: number;
}

export interface UpdateLocationRequest {
  latitude: number;
  longitude: number;
}

export interface BankDetails {
  bank_name: string;
  account_name: string;
  account_number: string;
  branch_code?: string;
}

export interface UpdateBankRequest {
  bank_name: string;
  account_name: string;
  account_number: string;
  branch_code?: string;
}

// Rides Types
export interface Ride {
  id: number;
  ride_id: string;
  user_id: number;
  driver_id: number | null;
  vehicle_category_id: number;
  pickup_address: string;
  pickup_latitude: string;
  pickup_longitude: string;
  drop_address: string;
  drop_latitude: string;
  drop_longitude: string;
  ride_note: string | null;
  ride_type: string;
  is_shared: boolean;
  status: string;
  base_fare: string;
  total_fare: string;
  distance_km: string;
  duration_minutes: number;
  created_at: string;
  updated_at: string;
  user: {
    id: number;
    full_name: string;
    mobile_number: string;
    email: string;
    gender: string;
    profile_photo: string | null;
    status: string;
  };
  vehicle: null | object;
}

// Available Ride (from getAvailableRides API response)
// export interface AvailableRide {
//   time: number;
//   ride_id: number;
//   pickup_address: string;
//   pickup_latitude: string;
//   pickup_longitude: string;
//   drop_address: string;
//   drop_latitude: string;
//   drop_longitude: string;
//   distance_km: number;
//   estimated_fare: number;
//   ride_type: string;
//   scheduled_at: string | null;
//   schedule_time: string | null;
//   booking_time: string;
//   time_remaining: number;
//   customer: {
//     name: string;
//     mobile: string;
//     image: string | null;
//   };
// }
export interface AvailableRide {
  ride_id: number;
  pickup_address: string;
  drop_address: string;
  distance_km: number;
  estimated_fare: number;
  booking_time: string;
  time_remaining: number;  // ← add this
  ride_type: 'instant' | 'scheduled';  // ← add this
  scheduled_at: string | null;
  customer: {
    name: string;
    mobile: string;
    image: string | null;
  };
}

export interface AcceptRideRequest {
  ride_id: number;
}

export interface RejectRideRequest {
  ride_id: number;
}

export interface CompleteRideRequest {
  ride_id: number;
  amount?: number;
  rating?: number;
}

export interface RatingRequest {
  ride_id: number;
  rating: number;
  review?: string;
}

// Notification Types
export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

// API Error Types
export interface ApiError {
  message: string;
  code?: string;
  data?: any;
  response?: {
    data?: {
      message?: string;
    };
  };
}

// Generic API Response
export interface ApiResponse<T> {
    status?: number;
  success: boolean;
  data?: T;
  message?: string;
  token?: string;

}