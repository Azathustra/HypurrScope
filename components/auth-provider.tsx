"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type AuthContextValue = {
  hasSubscription: boolean;
  isLoggedIn: boolean;
  subscribe: () => void;
  login: () => boolean;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const subscriptionKey = "insider-crypto-subscription";
const sessionKey = "insider-crypto-member";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [hasSubscription, setHasSubscription] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const subscribed = window.localStorage.getItem(subscriptionKey) === "active";
    setHasSubscription(subscribed);
    setIsLoggedIn(subscribed && window.localStorage.getItem(sessionKey) === "active");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      hasSubscription,
      isLoggedIn,
      subscribe: () => {
        window.localStorage.setItem(subscriptionKey, "active");
        setHasSubscription(true);
      },
      login: () => {
        if (!hasSubscription) {
          return false;
        }

        window.localStorage.setItem(sessionKey, "active");
        setIsLoggedIn(true);
        return true;
      },
      logout: () => {
        window.localStorage.removeItem(sessionKey);
        setIsLoggedIn(false);
      }
    }),
    [hasSubscription, isLoggedIn]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
