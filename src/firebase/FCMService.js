

import {
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  getInitialNotification,
  setBackgroundMessageHandler,
  requestPermission,
  registerDeviceForRemoteMessages,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import notifee, { AndroidImportance, EventType } from '@notifee/react-native';

const messaging = getMessaging();

/* ================= REGISTER & PERMISSIONS ================= */
export const registerAppWithFCM = async () => {
  if (Platform.OS === 'ios') {
    await registerDeviceForRemoteMessages(messaging);
  }

  const authStatus = await requestPermission(messaging);
  const enabled =
    authStatus === AuthorizationStatus.AUTHORIZED ||
    authStatus === AuthorizationStatus.PROVISIONAL;

  if (!enabled) {
    console.log('FCM permission denied');
  }

  await notifee.requestPermission();
};

/* ================= GET TOKEN ================= */
export const getFCMToken = async () => {
  try {
    const token = await getToken(messaging);
    console.log('FCM Token:', token);
    return token;
  } catch (error) {
    console.log('FCM getToken error:', error);
  }
};

/* ================= CREATE NOTIFICATION CHANNEL (Android) ================= */
const createChannel = async () => {
  const channelId = await notifee.createChannel({
    id: 'orders',
    name: 'Order Notifications',
    importance: AndroidImportance.HIGH,
    sound: 'default',
    vibration: true,
  });
  return channelId;
};

/* ================= DISPLAY LOCAL NOTIFICATION ================= */
export const displayNotification = async (remoteMessage) => {
  const channelId = await createChannel();

  // ✅ Always read from data — backend must send data-only payload
  const title =
    remoteMessage?.data?.title ||
    remoteMessage?.notification?.title ||
    'Order Update';

  const body =
    remoteMessage?.data?.body ||
    remoteMessage?.notification?.body ||
    'You have a new order update.';

  await notifee.displayNotification({
    title: `<b>${title}</b>`,
    body,
    data: remoteMessage?.data || {},
    android: {
      channelId,
      importance: AndroidImportance.HIGH,
      pressAction: { id: 'default' },
      sound: 'default',
      smallIcon: 'ic_launcher',
    },
    ios: {
      sound: 'default',
      foregroundPresentationOptions: {
        badge: true,
        sound: true,
        banner: true,
        list: true,
      },
    },
  });
};

/* ================= HANDLE NAVIGATION ON TAP ================= */
const handleNotificationNavigation = (data, navigationRef) => {
  if (!data || !navigationRef?.isReady()) return;

  const { order_id, screen } = data;

  if (screen === 'OrderSummaryScreen' && order_id) {
    navigationRef.navigate('OrderSummaryScreen', { orderId: order_id });
  } else if (order_id) {
    navigationRef.navigate('OrderHistoryScreen');
  }
};

/* ================= SETUP ALL LISTENERS ================= */
export const setupNotificationListeners = (navigationRef) => {

  // ─── 1. FOREGROUND: FCM receives → display via notifee ───
  // ✅ This is the ONLY place we show notifications in foreground
  const unsubscribeFCM = onMessage(messaging, async (remoteMessage) => {
    console.log('Foreground Message:', remoteMessage);
    await displayNotification(remoteMessage);
  });

  // ─── 2. FOREGROUND: Notifee tap event ───
  const unsubscribeNotifee = notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) {
      handleNotificationNavigation(detail.notification?.data, navigationRef);
    }
  });

  // ─── 3. BACKGROUND TAP ───
  onNotificationOpenedApp(messaging, (remoteMessage) => {
    console.log('Notification tapped (background):', remoteMessage);
    handleNotificationNavigation(remoteMessage?.data, navigationRef);
  });

  // ─── 4. KILLED STATE TAP ───
  getInitialNotification(messaging).then((remoteMessage) => {
    if (remoteMessage) {
      console.log('Notification tapped (killed):', remoteMessage);
      setTimeout(() => {
        handleNotificationNavigation(remoteMessage?.data, navigationRef);
      }, 1000);
    }
  });

  return () => {
    unsubscribeFCM();
    unsubscribeNotifee();
  };
};

/* ================= BACKGROUND HANDLER ================= */
export const setFCMBackgroundHandler = () => {
  setBackgroundMessageHandler(messaging, async (remoteMessage) => {
    console.log('Background Message received:', remoteMessage);
    // ✅ Always display via notifee
    // Backend sends data-only → FCM won't auto-display → notifee handles it
    await displayNotification(remoteMessage);
  });
};