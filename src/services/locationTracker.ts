import Geolocation from 'react-native-geolocation-service';
import { Platform } from 'react-native';
import { driverAuthAPI } from './api';

export type LocationUpdate = {
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
};

type LocationListener = (location: LocationUpdate) => void;

// react-native-geolocation-service error codes:
// 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
const GEO_ERROR_TIMEOUT = 3;

class LocationTracker {
  private watchId: number | null = null;
  private listeners = new Set<LocationListener>();
  private _isOnline = false;

  // Tracks consecutive timeouts so we can back off / relax accuracy
  // instead of hammering the GPS with the same options forever.
  private consecutiveTimeouts = 0;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;

  get isOnline(): boolean {
    return this._isOnline;
  }

  setOnline(online: boolean): void {
    this._isOnline = online;
    if (online) {
      this._start();
    } else {
      this._stop();
    }
  }

  private _start(): void {
    if (this.watchId !== null) return; // guard: only one watcher at a time

    // After repeated timeouts, relax high-accuracy so we can at least get
    // a network/fused fix instead of waiting on GPS indoors.
    const useHighAccuracy = this.consecutiveTimeouts < 3;

    this.watchId = Geolocation.watchPosition(
      async (position) => {
        this.consecutiveTimeouts = 0; // got a fix, reset backoff
        const { latitude, longitude, heading, speed } = position.coords;
        const loc: LocationUpdate = {
          latitude,
          longitude,
          heading: heading ?? 0,
          speed: speed ?? 0,
        };
        this.listeners.forEach(cb => {
          try { cb(loc); } catch {}
        });
        try {
          const response = await driverAuthAPI.updateLocation(latitude, longitude);
          console.log('updateLocation response::::', response);
        } catch (e) {
          console.error('LocationTracker: server update error:', e);
        }
      },
      (error) => {
        console.error('LocationTracker: watch error:', error.code, error.message);

        if (error.code === GEO_ERROR_TIMEOUT) {
          this.consecutiveTimeouts += 1;
          // Restart the watcher with relaxed options after a short delay.
          // watchPosition doesn't recover on its own from a TIMEOUT on
          // some Android devices, so we tear it down and re-arm it.
          this._stop();
          if (this._isOnline) {
            this.restartTimer = setTimeout(() => this._start(), 3000);
          }
        }
      },
      {
        enableHighAccuracy: useHighAccuracy,
        distanceFilter: 5,
        interval: 2000,
        fastestInterval: 1000,
        // Give the GPS/fused provider real time to get a fix instead of
        // failing almost immediately (this was previously unset).
        timeout: 20000,
        // Accept a cached fix up to 10s old so a slow first lock doesn't
        // block updates.
        maximumAge: 10000,
        ...(Platform.OS === 'android'
          ? {
              // Use Android's fused location provider (GPS + network +
              // wifi) rather than forcing GPS-only, which times out far
              // more easily indoors or with a weak signal.
              forceRequestLocation: true,
              forceLocationManager: !useHighAccuracy,
              showLocationDialog: true,
            }
          : {}),
      }
    );
  }

  private _stop(): void {
    if (this.restartTimer !== null) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.watchId !== null) {
      Geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  /** Subscribe to position updates. Returns an unsubscribe function. */
  addListener(cb: LocationListener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  isTracking(): boolean {
    return this.watchId !== null;
  }
}

export const locationTracker = new LocationTracker();