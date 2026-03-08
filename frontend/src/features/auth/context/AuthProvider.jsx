import { useEffect, useMemo, useState } from "react";
import { storageKeys } from "../../../shared/constants/storageKeys.js";
import { AuthContext } from "./AuthContext.js";

const readStoredState = () => {
  if (typeof window === "undefined") {
    return { token: null, admin: null };
  }

  const token = window.localStorage.getItem(storageKeys.adminToken);
  const adminRaw = window.localStorage.getItem(storageKeys.adminProfile);
  let admin = null;
  if (adminRaw) {
    try {
      admin = JSON.parse(adminRaw);
    } catch {
      admin = null;
    }
  }

  return { token, admin };
};

export const AuthProvider = ({ children }) => {
  const [state, setState] = useState(readStoredState);

  const login = ({ token, admin }) => {
    setState({ token, admin });

    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKeys.adminToken, token);
      window.localStorage.setItem(storageKeys.adminProfile, JSON.stringify(admin));
    }
  };

  const logout = () => {
    setState({ token: null, admin: null });

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(storageKeys.adminToken);
      window.localStorage.removeItem(storageKeys.adminProfile);
    }
  };

  const value = useMemo(
    () => ({
      token: state.token,
      admin: state.admin,
      isAuthenticated: Boolean(state.token),
      login,
      logout,
    }),
    [state],
  );

  useEffect(() => {
    const handleAuthExpired = () => {
      setState({ token: null, admin: null });
    };

    window.addEventListener("amma-auth-expired", handleAuthExpired);

    return () => {
      window.removeEventListener("amma-auth-expired", handleAuthExpired);
    };
  }, []);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
