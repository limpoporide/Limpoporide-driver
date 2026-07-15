import { createSlice } from "@reduxjs/toolkit";

const initialState = {
    currentRide: null,
    loading: false,
};

const rideSlice = createSlice({
    name: "ride",
    initialState,
    reducers: {
        setCurrentRide: (state, action) => {
            state.currentRide = action.payload;
        },
        clearCurrentRide: (state) => {
            state.currentRide = null;
        },
        setRideLoading: (state, action) => {
            state.loading = action.payload;
        },
    },
});

export const {
    setCurrentRide,
    clearCurrentRide,
    setRideLoading,
} = rideSlice.actions;

export default rideSlice.reducer;