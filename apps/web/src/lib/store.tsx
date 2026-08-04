"use client";

import { configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { Provider } from "react-redux";
import { useRef } from "react";
import { agentmeshApi } from "@/lib/api";
import { sessionReducer, type SessionState } from "@/lib/sessionSlice";

const SESSION_KEY = "agentmesh.session";

function readPersistedSession(): SessionState | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return undefined;
    return JSON.parse(raw) as SessionState;
  } catch {
    return undefined;
  }
}

function persistSession(session: SessionState) {
  if (typeof window === "undefined") return;
  if (session.accessToken) {
    window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    window.sessionStorage.removeItem(SESSION_KEY);
  }
}

export function makeStore() {
  const persisted = readPersistedSession();
  const store = configureStore({
    reducer: {
      session: sessionReducer,
      [agentmeshApi.reducerPath]: agentmeshApi.reducer,
    },
    preloadedState: persisted ? { session: persisted } : undefined,
    middleware: (getDefault) => getDefault().concat(agentmeshApi.middleware),
  });
  store.subscribe(() => {
    persistSession(store.getState().session);
  });
  return store;
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    storeRef.current = makeStore();
    setupListeners(storeRef.current.dispatch);
  }
  return <Provider store={storeRef.current}>{children}</Provider>;
}
