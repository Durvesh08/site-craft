import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  logout: () => void;
  login: () => void; // Redirect to OIDC login
  localLogin: (data: any) => Promise<void>;
  localRegister: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ["auth", "user"],
    queryFn: async () => {
      const res = await fetch("/api/auth/user");
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) return null;
        throw new Error("Failed to fetch user");
      }
      const data = await res.json();
      return data.user as User | null;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const logout = async () => {
    window.location.href = "/api/logout?returnTo=/login";
  };

  const login = () => {
    window.location.href = "/api/login?returnTo=/dashboard";
  };

  const localLogin = async (data: any) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    await queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
  };

  const localRegister = async (data: any) => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error(await res.text());
    await queryClient.invalidateQueries({ queryKey: ["auth", "user"] });
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        isLoading,
        isAuthenticated: !!user && !isError,
        logout,
        login,
        localLogin,
        localRegister,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
