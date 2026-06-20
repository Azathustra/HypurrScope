"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type AuthContextValue = {
  isLoggedIn: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const storageKey = "insider-crypto-member";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoggedIn(window.localStorage.getItem(storageKey) === "active");
    setIsLoading(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoggedIn,
      isLoading,
      login: () => {
        window.localStorage.setItem(storageKey, "active");
        setIsLoggedIn(true);
      },
      logout: () => {
        window.localStorage.removeItem(storageKey);
        setIsLoggedIn(false);
      }
    }),
    [isLoggedIn]
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
