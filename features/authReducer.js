import { createSlice } from "@reduxjs/toolkit";
const initialState = {
    isAuth: false,
    userData: {},
    tickets: []
}
export const authReducer = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        updateAuth: (state, action) => {
            state.isAuth = action.payload
        },
        updateUserData: (state, action) => {
            state.userData = action.payload
        },
        updateTickets: (state, action) => {
            state.tickets = action.payload
        },
        
    }
})

export const { updateAuth ,updateUserData,updateTickets} = authReducer.actions

export default authReducer.reducer;