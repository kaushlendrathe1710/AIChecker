import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { apiRequest } from "./queryClient";

interface User {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  isVerified: boolean;
}

interface AuthContextType {
  user: User | null;
  sessionId: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsRegistration: boolean;
  login: (sessionId: string, user: User, needsReg: boolean) => void;
  completeRegistration: (user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(() => {
    return localStorage.getItem("sessionId");
  });
  const [isLoading, setIsLoading] = useState(true);
  const [needsRegistration, setNeedsRegistration] = useState(false);

  const fetchUser = useCallback(async () => {
    if (!sessionId) {
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/me", {
        headers: { "x-session-id": sessionId },
      });
      
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setNeedsRegistration(!data.user.fullName);
      } else {
        localStorage.removeItem("sessionId");
        setSessionId(null);
        setUser(null);
      }
    } catch {
      localStorage.removeItem("sessionId");
      setSessionId(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback((newSessionId: string, newUser: User, needsReg: boolean) => {
    localStorage.setItem("sessionId", newSessionId);
    setSessionId(newSessionId);
    setUser(newUser);
    setNeedsRegistration(needsReg);
  }, []);

  const completeRegistration = useCallback((updatedUser: User) => {
    setUser(updatedUser);
    setNeedsRegistration(false);
  }, []);

  const logout = useCallback(async () => {
    if (sessionId) {
      try {
        await apiRequest("POST", "/api/auth/logout", undefined);
      } catch {
      }
    }
    localStorage.removeItem("sessionId");
    setSessionId(null);
    setUser(null);
    setNeedsRegistration(false);
  }, [sessionId]);

  return (
    <AuthContext.Provider
      value={{
        user,
        sessionId,
        isLoading,
        isAuthenticated: !!user && !!sessionId,
        needsRegistration,
        login,
        completeRegistration,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function getSessionId(): string | null {
  return localStorage.getItem("sessionId");
}
