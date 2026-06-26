import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi, setAccessToken, type UserData } from '../api';

interface AuthContextType {
  user: UserData | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // on mount: try to restore session from refresh cookie
  useEffect(() => {
    (async () => {
      try {
        const refreshed = await authApi.refresh();
        if (refreshed) {
          const me = await authApi.me();
          setUser(me);
        }
      } catch {
        // no valid session: user needs to log in
      } finally {
        setLoading(false);
      }
    })();
  }, []);


  const login = useCallback(async (username: string, password: string) => {
    setError(null);
    setLoading(true);
    try {
      const tokenData = await authApi.login({ username, password });
      setAccessToken(tokenData.access_token);
      const me = await authApi.me();
      setUser(me);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);


  const register = useCallback(async (
    username: string,
    email: string,
    password: string,
    displayName?: string,
  ) => {
    setError(null);
    setLoading(true);
    try {
      const tokenData = await authApi.register({
        username,
        email,
        password,
        display_name: displayName,
      });
      setAccessToken(tokenData.access_token);
      const me = await authApi.me();
      setUser(me);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);


  const logout = useCallback(async () => {
    await authApi.logout();
    setAccessToken(null);
    setUser(null);
  }, []);


  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, clearError }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
