"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { dbLogin } from "@/lib/auth-db";
import { trackLogin } from "@/lib/analytics";

export type MockRole = "admin" | "board" | "landlord" | "tenant" | "superadmin" | "guard";

// Map DB role values to app role keys
const ROLE_MAP: Record<string, MockRole> = {
  society_admin: "admin",
  board_member:  "board",
  landlord:      "landlord",
  tenant:        "tenant",
  superadmin:    "superadmin",
  guard:         "guard",
};

interface MockUser {
  id: string;
  role: MockRole;
  name: string;
  email: string;
  phone?: string;
}

interface AuthContextType {
  user: MockUser | null;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  updateProfile: (patch: { name?: string; phone?: string }) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  hydrated: false,
  login: async () => ({ success: false }),
  logout: () => {},
  updateProfile: () => {},
});

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("mrs_user");
      if (stored) {
        const parsed = JSON.parse(stored) as MockUser;
        const validRoles: MockRole[] = ["admin", "board", "landlord", "tenant", "superadmin", "guard"];
        if (validRoles.includes(parsed.role)) {
          setUser(parsed);
        }
      }
    } catch {
      localStorage.removeItem("mrs_user");
    } finally {
      setHydrated(true);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const result = await dbLogin(email, password);
    if (!result.success || !result.user) {
      return { success: false, error: result.error ?? "Invalid credentials." };
    }

    const mappedRole = ROLE_MAP[result.user.role];
    if (!mappedRole) {
      return { success: false, error: "Unsupported role." };
    }

    const newUser: MockUser = {
      id: result.user.id,
      role: mappedRole,
      name: result.user.full_name,
      email: result.user.email,
      phone: result.user.phone ?? undefined,
    };
    setUser(newUser);
    localStorage.setItem("mrs_user", JSON.stringify(newUser));
    trackLogin(result.user.id, result.user.role);
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("mrs_user");
  };

  const updateProfile = (patch: { name?: string; phone?: string }) => {
    setUser(prev => {
      if (!prev) return prev;
      const next = { ...prev, ...(patch.name !== undefined ? { name: patch.name } : {}), ...(patch.phone !== undefined ? { phone: patch.phone } : {}) };
      localStorage.setItem("mrs_user", JSON.stringify(next));
      return next;
    });
  };

  return (
    <AuthContext.Provider value={{ user, hydrated, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
