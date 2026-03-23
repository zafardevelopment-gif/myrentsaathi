"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

export type MockRole = "admin" | "board" | "landlord" | "tenant";

interface MockUser {
  role: MockRole;
  name: string;
  email: string;
}

interface AuthContextType {
  user: MockUser | null;
  login: (role: MockRole) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
});

const ROLE_NAMES: Record<MockRole, string> = {
  admin: "Society Admin",
  board: "Suresh Kumar",
  landlord: "Vikram Malhotra",
  tenant: "Rajesh Sharma",
};

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);

  // Restore from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("mrs_role");
    if (stored && ["admin", "board", "landlord", "tenant"].includes(stored)) {
      const role = stored as MockRole;
      setUser({
        role,
        name: ROLE_NAMES[role],
        email: "demo@myrentsaathi.com",
      });
    }
  }, []);

  const login = (role: MockRole) => {
    const newUser = {
      role,
      name: ROLE_NAMES[role],
      email: "demo@myrentsaathi.com",
    };
    setUser(newUser);
    localStorage.setItem("mrs_role", role);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("mrs_role");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
