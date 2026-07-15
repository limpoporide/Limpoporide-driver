import React, {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
} from 'react';
import { useSelector } from 'react-redux';
import socketService from './socket';

const SocketContext = createContext(null);

// ── KEY FIX: keep a module-level buffer of undelivered notifications ──────────
// When a screen mounts and registers a listener, it immediately drains any
// buffered notifications that arrived before it was ready.
const pendingNotifications = [];

export const SocketProvider = ({ children, bootstrapped }) => {
  const [lastNotification, setLastNotification] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const listenersRef = useRef({});

  const userData = useSelector(state => state.auth.userData);

  useEffect(() => {
    if (bootstrapped && userData?.id) {
      console.log('[Socket] Auto-connect on restart, userId:', userData.id);
      connectSocket(userData.id);
    }
  }, [bootstrapped, userData?.id]);

  // ── Dispatch a notification to all registered listeners ──────────────────
  const dispatchNotification = useCallback(data => {
    const type = data?.data?.notification_type;
    console.log('[Socket] notification_type:', type);

    setLastNotification(data);

    let delivered = false;

    if (type && listenersRef.current[type]?.length > 0) {
      listenersRef.current[type].forEach(cb => cb(data));
      delivered = true;
    }

    if (listenersRef.current['*']?.length > 0) {
      listenersRef.current['*'].forEach(cb => cb(data));
      delivered = true;
    }

    // Buffer it so late-mounting screens can consume it
    if (!delivered) {
      console.log('[Socket] No listeners yet — buffering notification:', type);
      pendingNotifications.push(data);
    }
  }, []);

  // ── Listener registry ─────────────────────────────────────────────────────
  const addListener = useCallback((type, callback) => {
    if (!listenersRef.current[type]) {
      listenersRef.current[type] = [];
    }
    listenersRef.current[type].push(callback);

    // ── KEY FIX: drain buffered notifications for this type immediately ──
    const remaining = [];
    pendingNotifications.forEach(data => {
      const notifType = data?.data?.notification_type;
      if (notifType === type) {
        console.log('[Socket] Delivering buffered notification:', notifType);
        callback(data);
      } else {
        remaining.push(data);
      }
    });
    pendingNotifications.length = 0;
    pendingNotifications.push(...remaining);
  }, []);

  const removeListener = useCallback((type, callback) => {
    if (listenersRef.current[type]) {
      listenersRef.current[type] = listenersRef.current[type].filter(
        cb => cb !== callback,
      );
    }
  }, []);

  // ── Connect ───────────────────────────────────────────────────────────────
  const connectSocket = useCallback(userId => {
    if (!userId) {
      console.warn('[Socket] connectSocket — no userId');
      return;
    }

    console.log('[Socket] Connecting userId:', userId);

    socketService.connect(
      userId,
      dispatchNotification,          // onNotification
      () => {
        console.log('[Socket] isConnected → true');
        setIsConnected(true);
      },
      () => {
        console.log('[Socket] isConnected → false');
        setIsConnected(false);
      },
    );
  }, [dispatchNotification]);

  const disconnectSocket = useCallback(() => {
    socketService.disconnect();
    setIsConnected(false);
    setLastNotification(null);
  }, []);

  const emitEvent = useCallback((event, data) => {
    socketService.emit(event, data);
  }, []);

  return (
    <SocketContext.Provider
      value={{
        connectSocket,
        disconnectSocket,
        addListener,
        removeListener,
        emitEvent,
        lastNotification,
        isConnected,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be inside <SocketProvider>');
  return ctx;
};