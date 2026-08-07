import { createContext, useContext } from "react";
import { useAuth } from "./useAuth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const value = useAuth();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return ctx;
}
