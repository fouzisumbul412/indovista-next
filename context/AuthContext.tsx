"use client";

import React, { createContext, useState, useContext, useEffect, useCallback } from "react";

interface User {
  id: number;
  name: string;
  role: string;
  email: string | null;
  loginId?: string | null;
}

interface AuthContextType {
  user: User | null;
  login: (identifier: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

interface AuthProviderProps {
  children?: React.ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // ✅ Always include cookies (token) for Hostinger/Vercel
  const fetchWithCreds = useCallback((input: RequestInfo | URL, init?: RequestInit) => {
    return fetch(input, {
      ...init,
      credentials: "include",
    });
  }, []);

  // ✅ Load user on app start
  useEffect(() => {
    const loadUser = async () => {
      try {
        const res = await fetchWithCreds("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user ?? null);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [fetchWithCreds]);

  // ✅ LOGIN (IMPORTANT FIX)
  const login = useCallback(
    async (identifier: string, pass: string) => {
      try {
        // ✅ correct endpoint (your backend file: app/api/login/route.ts)
        const res = await fetchWithCreds("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },

          // ✅ send identifier (loginId OR email)
          body: JSON.stringify({ identifier, password: pass }),
        });

        if (!res.ok) return false;

        // Optional: set from response
        const data = await res.json().catch(() => null);
        if (data?.user) setUser(data.user);

        // ✅ confirm cookie is saved & session is valid
        const me = await fetchWithCreds("/api/auth/me");
        if (!me.ok) return false;

        const meData = await me.json().catch(() => null);
        setUser(meData?.user ?? null);

        return !!meData?.user;
      } catch (e) {
        console.error("LOGIN ERROR:", e);
        return false;
      }
    },
    [fetchWithCreds]
  );

  // ✅ LOGOUT (uses your existing /api/logout)
  const logout = useCallback(async () => {
    try {
      await fetchWithCreds("/api/logout", { method: "POST" });
    } catch (e) {
      console.error("LOGOUT ERROR:", e);
    } finally {
      setUser(null);
    }
  }, [fetchWithCreds]);

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
