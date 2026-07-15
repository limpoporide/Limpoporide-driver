// import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
// import NewRideRequestModal, { NewRideRequest } from '../components/NewRideRequestModal/NewRideRequestModal';
// import { ridesAPI } from '../services/api';
// import { mapApiRideToNewRideRequest } from '../Utility/rideMapper';

// interface RideRequestContextType {
//   showRideRequest: (ride: NewRideRequest) => void;
//   dismissRideRequest: () => void;
//   setNavigateOnAccept: (fn: (ride: NewRideRequest) => void) => void; // ← new
// }

// const RideRequestContext = createContext<RideRequestContextType>({
//   showRideRequest: () => {},
//   dismissRideRequest: () => {},
//   setNavigateOnAccept: () => {},
// });

// export const useRideRequest = () => useContext(RideRequestContext);

// export const RideRequestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
//   const [visible, setVisible] = useState(false);
//   const [ride, setRide] = useState<NewRideRequest | null>(null);
//   const isModalVisible = useRef(false);
//   const navigateOnAcceptRef = useRef<((ride: NewRideRequest) => void) | null>(null);
//   const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

//   // Called once from a screen inside the navigator to register navigation
//   const setNavigateOnAccept = (fn: (ride: NewRideRequest) => void) => {
//     navigateOnAcceptRef.current = fn;
//   };

//   const showRideRequest = (newRide: NewRideRequest) => {
//     setRide(newRide);
//     setVisible(true);
//     isModalVisible.current = true;
//   };

//   const dismissRideRequest = () => {
//     setVisible(false);
//     setRide(null);
//     isModalVisible.current = false;
//   };

//   useEffect(() => {
//     const poll = async () => {
//       if (isModalVisible.current) return;
//       try {
//         const response = await ridesAPI.getAvailableRides();
//         if (response?.data && !Array.isArray(response.data)) {
//           showRideRequest(mapApiRideToNewRideRequest(response.data));
//         }
//       } catch {
//         // silently ignore
//       }
//     };

//     pollingRef.current = setInterval(poll, 5000);
//     return () => {
//       if (pollingRef.current) clearInterval(pollingRef.current);
//     };
//   }, []);

//   const handleAccept = async (r: NewRideRequest) => {
//     try {
//       await ridesAPI.acceptAndRejectRide({ ride_id: r.ride_id, status: '1' });
//       dismissRideRequest();
//       navigateOnAcceptRef.current?.(r); // ← navigate using registered fn
//     } catch (error) {
//       console.log('Accept error:', error);
//       dismissRideRequest();
//     }
//   };

//   const handleReject = async (r: NewRideRequest) => {
//     try {
//       await ridesAPI.acceptAndRejectRide({ ride_id: r.ride_id, status: '0' });
//     } catch (error) {
//       console.log('Reject error:', error);
//     } finally {
//       dismissRideRequest();
//     }
//   };

//   const handleTimeout = async (r: NewRideRequest) => {
//     try {
//       await ridesAPI.acceptAndRejectRide({ ride_id: r.ride_id, status: 0 });
//     } catch (error) {
//       console.log('Timeout error:', error);
//     } finally {
//       dismissRideRequest();
//     }
//   };

//   return (
//     <RideRequestContext.Provider value={{ showRideRequest, dismissRideRequest, setNavigateOnAccept }}>
//       {children}
//       <NewRideRequestModal
//         visible={visible}
//         ride={ride}
//         onAccept={handleAccept}
//         onReject={handleReject}
//         onTimeout={handleTimeout}
//       />
//     </RideRequestContext.Provider>
//   );
// };



import React, { createContext, useContext, useRef, useState } from 'react';
import NewRideRequestModal, { NewRideRequest } from '../components/NewRideRequestModal/NewRideRequestModal';
import { ridesAPI } from '../services/api';

interface RideRequestContextType {
  showRideRequest: (ride: NewRideRequest) => void;
  dismissRideRequest: () => void;
  setNavigateOnAccept: (fn: (ride: NewRideRequest) => void) => void;
}

const RideRequestContext = createContext<RideRequestContextType>({
  showRideRequest: () => {},
  dismissRideRequest: () => {},
  setNavigateOnAccept: () => {},
});

export const useRideRequest = () => useContext(RideRequestContext);

export const RideRequestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [ride, setRide] = useState<NewRideRequest | null>(null);
  const navigateOnAcceptRef = useRef<((ride: NewRideRequest) => void) | null>(null);

  // ✅ Removed: isModalVisible ref (only needed for polling)
  // ✅ Removed: pollingRef
  // ✅ Removed: useEffect with setInterval polling

  const setNavigateOnAccept = (fn: (ride: NewRideRequest) => void) => {
    navigateOnAcceptRef.current = fn;
  };

  const showRideRequest = (newRide: NewRideRequest) => {
    setRide(newRide);
    setVisible(true);
  };

  const dismissRideRequest = () => {
    setVisible(false);
    setRide(null);
  };

  const handleAccept = async (r: NewRideRequest) => {
    try {
      await ridesAPI.acceptAndRejectRide({ ride_id: r.ride_id, status: '1' });
      dismissRideRequest();
      navigateOnAcceptRef.current?.(r);
    } catch (error) {
      console.log('Accept error:', error);
      dismissRideRequest();
    }
  };

  const handleReject = async (r: NewRideRequest) => {
    try {
      await ridesAPI.acceptAndRejectRide({ ride_id: r.ride_id, status: '0' });
    } catch (error) {
      console.log('Reject error:', error);
    } finally {
      dismissRideRequest();
    }
  };

  const handleTimeout = async (r: NewRideRequest) => {
    try {
      await ridesAPI.acceptAndRejectRide({ ride_id: r.ride_id, status: 0 });
    } catch (error) {
      console.log('Timeout error:', error);
    } finally {
      dismissRideRequest();
    }
  };

  return (
    <RideRequestContext.Provider value={{ showRideRequest, dismissRideRequest, setNavigateOnAccept }}>
      {children}
      <NewRideRequestModal
        visible={visible}
        ride={ride}
        onAccept={handleAccept}
        onReject={handleReject}
        onTimeout={handleTimeout}
      />
    </RideRequestContext.Provider>
  );
};