"use client";

import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";

export type MockRole = "admin" | "board" | "landlord" | "tenant" | "superadmin";

interface MockUser {
  role: MockRole;
  name: string;
  email: string;
}

interface AuthContextType {
  user: MockUser | null;
  hydrated: boolean;
  login: (email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
}

// Demo credentials — matches the SQL script
export const DEMO_CREDENTIALS: {
  email: string;
  password: string;
  role: MockRole;
  name: string;
}[] = [
  { email: "admin@greenvalley.com",        password: "Admin@123",    role: "admin",      name: "Society Admin"    },
  { email: "suresh@greenvalley.com",       password: "Board@123",    role: "board",      name: "Suresh Kumar"     },
  { email: "vikram@gmail.com",             password: "Landlord@123", role: "landlord",   name: "Vikram Malhotra"  },
  { email: "rajesh@gmail.com",             password: "Tenant@123",   role: "tenant",     name: "Rajesh Sharma"    },
  { email: "superadmin@myrentsaathi.com",  password: "Super@123",    role: "superadmin", name: "Platform Owner"   },
];

const AuthContext = createContext<AuthContextType>({
  user: null,
  hydrated: false,
  login: () => ({ success: false }),
  logout: () => {},
});

export function MockAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Read localStorage once on mount — sets hydrated=true when done
  useEffect(() => {
    try {
      const stored = localStorage.getItem("mrs_user");
      if (stored) {
        const parsed = JSON.parse(stored) as MockUser;
        if (["admin", "board", "landlord", "tenant", "superadmin"].includes(parsed.role)) {
          setUser(parsed);
        }
      }
    } catch {
      localStorage.removeItem("mrs_user");
    } finally {
      setHydrated(true);
    }
  }, []);

  const login = (email: string, password: string) => {
    const match = DEMO_CREDENTIALS.find(
      (c) =>
        c.email.toLowerCase() === email.trim().toLowerCase() &&
        c.password === password
    );
    if (!match) {
      return { success: false, error: "Invalid email or password." };
    }
    const newUser: MockUser = { role: match.role as MockRole, name: match.name, email: match.email };
    setUser(newUser);
    localStorage.setItem("mrs_user", JSON.stringify(newUser));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("mrs_user");
  };

  return (
    <AuthContext.Provider value={{ user, hydrated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
