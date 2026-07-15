import { Platform, PermissionsAndroid } from 'react-native';
import Geolocation from 'react-native-geolocation-service';

export const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS === 'ios') {
    const auth = await Geolocation.requestAuthorization('whenInUse');
    return auth === 'granted';
  }

  if (Platform.OS === 'android') {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'This app needs access to your location to find your current address.',
        buttonNeutral: 'Ask Me Later',
        buttonNegative: 'Cancel',
        buttonPositive: 'OK',
      }
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  }
  return false;
};

export const getCurrentCoordinates = async (): Promise<{ latitude: number; longitude: number }> => {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) {
    throw new Error('Location permission denied');
  }

  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(new Error(error.message));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  });
};


export const fetchReverseGeocode = async (lat: number, lon: number): Promise<string> => {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'LimpoDriverApp/1.0',  // required by Nominatim ToS
        'Accept-Language': 'en',
      },
    });
    const data = await response.json();

    if (!data || data.error) {
      console.warn('OSM error:', data?.error);
      return 'Address not found';
    }

    // Build a clean short address from components
    const { road, suburb, city, town, village, state, country } = data.address || {};
    const locality = city || town || village || suburb;
    const parts = [road, locality, state, country].filter(Boolean);
console.log('road, suburb, city, town, village, state, country', road, suburb, city, town, village, state, country);

    return parts.length > 0 ? parts.join(', ') : data.display_name;
  } catch (error) {
    console.error('Geocoding error:', error);
    throw new Error('Failed to resolve address');
  }
};

/**
 * Converts latitude and longitude coordinates into a readable physical address string
 */
// export const fetchReverseGeocode = async (lat: number, lon: number): Promise<string> => {
//   try {
//     const GOOGLE_API_KEY = 'AIzaSyCv3DWb7F89BHPKgZofuzGJP6eovbMW-To';
//     const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${GOOGLE_API_KEY}`;
//     const response = await fetch(url);
//     const data = await response.json();

//     // ADD THIS — tells you exactly what's wrong
//     console.log('Geocode status:', data.status);
//     console.log('Geocode error_message:', data.error_message);
//     console.log('Geocode results count:', data.results?.length);

//     if (data.status === 'OK' && data.results.length > 0) {
//       return data.results[0].formatted_address;
//     }
//     return 'Address not found';
//   } catch (error) {
//     console.error('Geocoding system error:', error);
//     throw new Error('Failed to resolve address string');
//   }
// };