import React, { useState, useRef, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { Alert, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';

import { useSocket } from './webSocket/SocketContext';
import useSocketListener from './webSocket/useSocketListener';
import { SOCKET_EVENTS } from './webSocket/socketEvents';
import { ridesAPI } from './services/api';
import { navigationRef } from '../App'; // keep navigationRef in App.tsx
import RidePopupModal from './components/RidePopupModal'; // extract if you want
// ... all your screen imports

export default function AppContent({ userToken }: { userToken: string | null }) {
  const { isConnected, connectSocket } = useSocket();
  const user = useSelector((state: any) => state.auth.userData);

  const [popupRide, setPopupRide] = useState(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [acceptingId, setAcceptingId] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [rideData, setRideData] = useState(null);

  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const shownRideIds = useRef(new Set());

  // ✅ Now works — we're inside SocketProvider
  useSocketListener(SOCKET_EVENTS.UPCOMING_RIDE, (data) => {
    console.log('[SOCKET] upcoming_ride:', data);
    if (data?.id && !shownRideIds.current.has(data.id)) {
      shownRideIds.current.add(data.id);
      showRidePopup({
        id: data.id,
        ride_id: data.booking_id,
        pickup_address: data.picup_location,
        drop_address: data.drop_location,
        distance_km: data.distance_km,
        total_fare: data.fare,
        created_at: data.booking_date,
        isUpcoming: true,
        user: data.user_name,
      });
    }
  });

  // ✅ Connect socket when user is available
  useEffect(() => {
    if (user?.id && !isConnected) {
      connectSocket(user.id);
    }
  }, [user?.id, isConnected]);

  // ✅ Load available rides on login
  useEffect(() => {
    if (userToken) loadAvailableRides();
  }, [userToken]);

  const showRidePopup = (ride) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setPopupRide(ride);
    setPopupVisible(true);
    setTimeLeft(30);
    countdownRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(countdownRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    timerRef.current = setTimeout(dismissPopup, 30000);
  };

  const dismissPopup = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setPopupVisible(false);
    setPopupRide(null);
    setTimeLeft(30);
  };

  const loadAvailableRides = async () => {
    try {
      const response = await ridesAPI.getAvailableRides();
      const ride = response?.data;
      setRideData(ride);
      if (ride?.id && !shownRideIds.current.has(ride.id)) {
        shownRideIds.current.add(ride.id);
        showRidePopup({ /* same mapping as before */ });
      }
    } catch (e) { console.log('Poll error:', e); }
  };

  const handleAcceptRide = async (rideId) => { /* same as before */ };
  const handleDeclineRide = async (rideId) => { /* same as before */ };

  return (
    <>
      <NavigationContainer ref={navigationRef}>
        {/* your existing Stack.Navigator with all screens */}
      </NavigationContainer>

      <RidePopupModal
        ride={popupRide}
        visible={popupVisible}
        onAccept={handleAcceptRide}
        onDecline={handleDeclineRide}
        acceptingId={acceptingId}
        timeLeft={timeLeft}
      />
    </>
  );
}