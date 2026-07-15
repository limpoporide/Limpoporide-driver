/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

import { setFCMBackgroundHandler } from './src/firebase/FCMService';
import notifee, { EventType } from '@notifee/react-native';


setFCMBackgroundHandler()

// Handle notifee background press events (background + killed)
notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type === EventType.PRESS) {
        console.log('Notifee background press:', detail.notification);
        // Navigation here is not possible; handle on next app open if needed
    }
    if (type === EventType.DISMISSED) {
        console.log('Notification dismissed:', detail.notification?.id);
    }
});
AppRegistry.registerComponent(appName, () => App);
