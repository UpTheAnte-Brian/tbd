// app/hooks/useUser.ts
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Profile } from "@/app/lib/types/types";

type UserContextValue = {
  user: Profile | null;
  loading: boolean;
  error: Error | null;
  refreshUser: () => Promise<void>;
  logout: () => void;
};

export const UserContext = createContext<UserContextValue | undefined>(
  undefined
);

type UserProviderProps = {
  children: ReactNode;
  initialUser?: Profile | null;
};

export function UserProvider({ children, initialUser }: UserProviderProps) {
  const [user, setUser] = useState<Profile | null>(initialUser ?? null);
  const [loading, setLoading] = useState(!initialUser);
  const [error, setError] = useState<Error | null>(null);

  const refreshUser = async () => {
    // if we already have an initial user, don't block UI while refreshing
    if (!initialUser) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/users/me");
      if (!res.ok) {
        setUser(null);
        throw new Error(`Failed to load user: ${res.status}`);
      }
      const data = await res.json();
      setUser(data);
    } catch (err) {
      setUser(null);
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      if (!initialUser) setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
  };

  useEffect(() => {
    // if no initial user provided, fetch on mount
    if (initialUser) {
      setLoading(false);
      return;
    }
    let ignore = false;
    const run = async () => {
      await refreshUser();
      if (ignore) return;
    };
    run();
    return () => {
      ignore = true;
    };
  }, [initialUser]);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
        error,
        refreshUser,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
