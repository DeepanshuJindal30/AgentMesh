import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type SessionState = {
  accessToken: string | null;
  userId: string | null;
  email: string | null;
  displayName: string | null;
  organizationId: string | null;
  organizationName: string | null;
  role: string | null;
};

const initialState: SessionState = {
  accessToken: null,
  userId: null,
  email: null,
  displayName: null,
  organizationId: null,
  organizationName: null,
  role: null,
};

const sessionSlice = createSlice({
  name: "session",
  initialState,
  reducers: {
    setSession(_state, action: PayloadAction<SessionState>) {
      return action.payload;
    },
    clearSession() {
      return initialState;
    },
  },
});

export const { setSession, clearSession } = sessionSlice.actions;
export const sessionReducer = sessionSlice.reducer;
