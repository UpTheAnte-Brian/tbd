// app/hooks/useUser.ts
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Business, Profile } from "@/app/lib/types";
import { useClaimedBusinesses } from "@/app/hooks/useClaimedBusinesses";

type UserContextValue = {
  user: Profile | null;
  loading: boolean;
  error: Error | null;
  claimedBusinesses: Business[] | undefined;
  claimedLoading: boolean;
  refreshUser: () => Promise<void>;
  logout: () => void;
};

export const UserContext = createContext<UserContextValue | undefined>(
  undefined
);

type UserProviderProps = {
  children: ReactNode;
};

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { data: claimedBusinesses, isLoading: claimedLoading } =
    useClaimedBusinesses(user?.id);

  const refreshUser = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
  };

  useEffect(() => {
    let ignore = false;
    const run = async () => {
      await refreshUser();
      if (ignore) return;
    };
    run();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,
      error,
      claimedBusinesses,
      claimedLoading,
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
