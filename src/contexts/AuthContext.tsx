import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import api, { isApiConfigured, setSessionExpiredHandler } from "@/lib/api";

export interface User {
  id?: string;
  email: string;
  name?: string;
  [key: string]: unknown;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const refreshUser = useCallback(async () => {
    if (!isApiConfigured) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      // 401 here is an expected "signed out" state — never surfaced as an error toast.
      const { data } = await api.get<User>("/auth/me");
      setUser(data ?? null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  // Session expired (refresh failed): clear user + private queries.
  useEffect(() => {
    setSessionExpiredHandler(() => {
      setUser(null);
      queryClient.clear();
    });
    return () => setSessionExpiredHandler(null);
  }, [queryClient]);

  const login = useCallback(
    async (email: string, password: string) => {
      await api.post("/auth/login", { email, password }, { skipAuthRefresh: true } as never);
      await refreshUser();
    },
    [refreshUser],
  );

  const register = useCallback(
    async ({ name, email, password }: { name: string; email: string; password: string }) => {
      await api.post("/auth/register", { email, password, name }, { skipAuthRefresh: true } as never);
      await refreshUser();
    },
    [refreshUser],
  );

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout", undefined, { skipAuthRefresh: true } as never);
    } catch {
      // ignore — we sign out locally regardless
    } finally {
      setUser(null);
      queryClient.clear();
    }
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
