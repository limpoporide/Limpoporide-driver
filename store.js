import { configureStore } from '@reduxjs/toolkit';
import { combineReducers } from '@reduxjs/toolkit';
import { persistReducer, persistStore } from 'redux-persist';
import storage from '@react-native-async-storage/async-storage';
import authReducer from './features/authReducer'; // Correct path to your reducer
import rideReducer from './features/rideSlice'; // Correct path to your reducer


const persistConfig = {
  key: 'auth',
  storage,
  timeout: 10000,
};

const rootReducer = combineReducers({
  auth: persistReducer(persistConfig, authReducer),
  ride: rideReducer, // ✅ ADD THIS

});

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: {
      ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      ignoredPaths: ['auth.error'],
    },
  }),
});

const persistor = persistStore(store);

export { store, persistor };
