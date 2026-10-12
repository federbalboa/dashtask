import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { AuthModel, session } from '../models/api.js';
import { getRole } from '../config/roles.js';

/** CONTROLADOR: sesión / autenticación */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(session.getUser());
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function bootstrap() {
      if (session.getToken()) {
        try {
          const { user: me } = await AuthModel.me();
          if (mounted) {
            setUser(me);
            session.save(session.getToken(), me);
          }
        } catch {
          session.clear();
          if (mounted) setUser(null);
        }
      }
      if (mounted) setReady(true);
    }
    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      const { token, user: u } = await AuthModel.login(email, password);
      session.save(token, u);
      setUser(u);
      return u;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    session.clear();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      role: user?.role,
      roleMeta: user ? getRole(user.role) : null,
      isAuthenticated: Boolean(user),
      ready,
      loading,
      login,
      logout,
    }),
    [user, ready, loading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
