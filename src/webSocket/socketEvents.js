export const SOCKET_EVENTS = {
  // Ride events
  DRIVER_SEARCH_RIDE: 'driver_searchride',
  DRIVER_CANCEL_RIDE: 'driver_cancel_ride',
  RIDE_ACCEPTED: 'booking_status_accept',
  RIDE_REJECTED: 'ride_rejected',

  DRIVER_UPDATE_LOCATION: 'driver_update_location',
  RIDE_START_OTP_VERIFY: 'ride_start_otp_verify',

  // Track ride events
  DRIVER_COMPLETE_RIDE: 'driver_complete_ride',
  SEND_MESSAGE:'send_message',
  NEW_RIDE_REQUEST:'search_user_ride',
  USER_CANCELLED:'user_cancel_ride'
  
};
