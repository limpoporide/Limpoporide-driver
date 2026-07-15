import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LoginRequest,
  LoginResponse,
  SignupRequest,
  SignupResponse,
  Driver,
  DriverStats,
  UpdateProfileRequest,
  LocationData,
  Ride,
  Notification,
  ApiError,
  ApiResponse,
  UpdateProfileImageRequest,
  BankDetails,
  UpdateBankRequest,
  VehicleDetails,
  UserProfile,
} from '../types/api';

// ⚠️ UPDATE THIS WITH YOUR ACTUAL API URL
const API_BASE_URL = 'http://103.154.2.117/~limpoporide/limpopo_new/api/';
const API_TIMEOUT = 10000;

// Create axios instance with modern config
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      console.log('token::::::',token);
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.warn('Error retrieving token:', error);
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and token expiration
api.interceptors.response.use(
  (response) => {
    // Return response data directly if in expected format
    return response.data || response;
  },
  async (error: any) => {
    if (error.response?.status === 401) {
      // Token expired or unauthorized
      try {
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userEmail');
      } catch (e) {
        console.error('Error clearing auth:', e);
      }
    }

    // Return error with meaningful message
    const errorMessage = error.response?.data?.message ||
                        error.message ||
                        'An error occurred';

    const apiError: ApiError = {
      status: error.response?.status || 0,
      message: errorMessage,
      data: error.response?.data,
      response: error.response,
    };

    return Promise.reject(apiError);
  }
);

export default api;

// ==================== DRIVER AUTH API ====================
export const driverAuthAPI = {
  // Driver Authentication
  login: (data: LoginRequest): Promise<LoginResponse> =>
    api.post('driver_login', data),

  signup: (data: SignupRequest): Promise<SignupResponse> =>
    api.post('/driver/register', data),

  logout: (): Promise<any> =>
    api.post('/driver/logout'),

   changePassword: (mobile_number, oldPassword, newPassword): Promise<any> =>
    api.post('update_password', mobile_number, oldPassword, newPassword ),

   forget: (mobile_number): Promise<any> =>
    api.post('/user/forgot-password',  mobile_number ),
  
  verifyOtp: (data: any): Promise<any> =>
  api.post('user_verify_otp', data),

  reSend: (mobile_number): Promise<any> =>
    api.post('reset_otp_send',  mobile_number ),


    getEarnings: () => api.get('/driver_earning'),


  // toggleOnline: (status: boolean): Promise<any> =>
  //   api.post('driver_online_offline', { status }),

  toggleOnline: (data: { status: number; latitude: string; longitude: string }): Promise<any> =>
  api.post('driver_online_offline', data),  // ✅ pass data directly, not { status: data }
  
  updateLocation: (latitude: number, langitude: number): Promise<LocationData> =>
    api.post('driver_change_location', { latitude, langitude }),
}; 

export const driverAPI = {
  // Driver Profile
  getProfile: (): Promise<ApiResponse<UserProfile[]>> =>
    api.get('user_profile'),

  updateProfile: (data: UpdateProfileRequest): Promise<Driver> =>
    api.post('update_profile', data),

  updateProfileImage: (data: UpdateProfileImageRequest ): Promise<Driver> =>
    api.post('update_profile_picture', data,{
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  }),

  // Face Verification
  verifyFace: (imageData: string): Promise<any> =>
    api.post('/driver/face-verify', { image: imageData }),

  getFaceVerificationStatus: (): Promise<any> =>
    api.get('/driver/face-verify/status'),

  // Driver Stats (from rides history)
  getStats: async (): Promise<DriverStats> => {
    try {
      const rides = await ridesAPI.getRideHistory();
      const completedRides = rides.filter((r: Ride) => r.status === 'completed');
      const totalEarnings = completedRides.reduce(
        (sum: number, r: Ride) => sum + (r.estimated_fare || 0),
        0
      );
      const avgRating = completedRides.length > 0
        ? completedRides.reduce(
          (sum: number, r: Ride) => sum + (r.passenger_rating || 0),
          0
        ) / completedRides.length
        : 5.0;

      return {
        completed_rides: completedRides.length,
        total_trips: completedRides.length,
        total_earnings: totalEarnings,
        rating: avgRating,
      };
    } catch (error) {
      return Promise.reject(error);
    }
  },
};

// ==================== DRIVER RIDES API ====================
export const ridesAPI = {
  // Get available rides for driver
  getAvailableRides: (): Promise<ApiResponse<Ride[] | null>> =>
  api.get('upcoming_booking'),

  // Accept a ride
  acceptAndRejectRide: (data: any): Promise<any> =>
    api.post(`booking_status_accepted`,data),

  arriveAtPickup:  (data: any): Promise<any> =>
    api.post(`/driver/get/navigation-data`,data),

  updateRideStatus:  (data: any): Promise<any> =>
    api.post(`driver_complete_ride`,data),

  getOTPRideScreen:  (data: any): Promise<any> =>
    api.post(`/driver/get/otp-verification-screen`,data),

  verifyOtp:  (data: any): Promise<any> =>
    api.post(`ride_start_verfiy_otp`,data),

  // Ride history and details
  getRideHistory: (data:any): Promise<any> =>
    api.post(`driver_all_rides`,  data),

  getRideDetails: (data: any): Promise<any> =>
    api.post(`booking_details`,data),


  // Chat with passenger
  getChatHistory: (data: any): Promise<any> =>
    api.post(`chat_with_user`,data),

  sendMessage: (data: any): Promise<any> =>
    api.post(`add_chats`,data),


  // cancel ride with reason
  getCancelRiderReason:(): Promise<ApiResponse<any>> =>
  api.get('get_driver_reason_cancel_list'),

  cancelRide:(data: any): Promise<ApiResponse<any>> =>
  api.post('driver_cancel_ride', data),

    // Give rider ratings 
  ratePassenger: (data: any): Promise<any> =>
    api.post('add_booking_rating', data),

  checkRideStatus: ( data: any): Promise<any> =>
    api.post(`/driver/rides/check-schedule`, data),

  checkStatus: ( data: any): Promise<any> =>
    api.post(`driver/ride-status`, data),

  getHomeOngoingRide: ( ): Promise<any> =>
    api.get(`driver_dashboard`),

  //Old API
  startRide: (rideId: number): Promise<any> =>
    api.post(`/driver/rides/${rideId}/start`),



  // Ride communication

};

// ==================== NOTIFICATIONS API ====================
export const notificationsAPI = {
  getNotifications: (): Promise<{ data: Notification[] }> =>
    api.get('notification_list'),

  markAsRead: (notificationId: number): Promise<any> =>
    api.post(`/driver/notifications/${notificationId}/mark-read`),

  markAllAsRead: (): Promise<any> =>
    api.post('/driver/mark-notification'),
};

// ==================== BANK API ====================
export const bankAPI = {
  getBank: (): Promise<ApiResponse<BankDetails>> =>
    api.get('/driver/get/bank-details'),

  updateBank: (data: UpdateBankRequest): Promise<ApiResponse<BankDetails>> =>
    api.post('/driver/bank-details/update', data),

     getAllPayout: (): Promise<ApiResponse<any>> =>
    api.get('get_payout_data'),

  collectPayout: (data: any): Promise<any> =>
    api.post('/driver/collect-ride-money',data),
  

};


// ==================== VEHICLE INFORMATION API ====================
export const vehicleInformation = {
 getVehicle: (): Promise<ApiResponse<any>> =>
  api.get('/driver/get/vehicle-details'),

getDocDetails: (): Promise<ApiResponse<any>> =>
  api.get('/driver/get/doc-details'),

getVehicleCat: (): Promise<ApiResponse<any>> =>
  api.get('/driver/get/vehicle-category'),
};


// ==================== CMS API ====================
export const CMSInformation = {
 getPrivacy: (): Promise<ApiResponse<any>> =>
  api.get('privacy_policy_driver'),

getTerms: (): Promise<ApiResponse<any>> =>
  api.get('terms_conditions_driver'),

getAboutUs: (): Promise<ApiResponse<any>> =>
  api.get('about_us'),

// getFaqs: (): Promise<ApiResponse<any>> =>
//   api.get('/driver/get-faqs'),


  getFaqs: (data: any): Promise<any> =>
    api.post('faq',data),

};