import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import { getSocket, updateSocketAuth, disconnectSocket } from '../services/socket';
import { UserSummary, UserRole } from '../types';

interface AuthContextType {
  user: UserSummary | null;
  token: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (token: string, user: UserSummary) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('rhb_auth_token');
    const savedUser = localStorage.getItem('rhb_user_profile');

    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
        updateSocketAuth(savedToken);

        // Verify session validity with backend
        api.get('/auth/me')
          .then((res) => {
            if (res.data?.user) {
              setUser(res.data.user);
              localStorage.setItem('rhb_user_profile', JSON.stringify(res.data.user));
            }
          })
          .catch(() => {
            // Handled by 401 interceptor
          })
          .finally(() => {
            setIsLoading(false);
          });
        return;
      } catch {
        localStorage.removeItem('rhb_auth_token');
        localStorage.removeItem('rhb_user_profile');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: UserSummary) => {
    localStorage.setItem('rhb_auth_token', newToken);
    localStorage.setItem('rhb_user_profile', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    updateSocketAuth(newToken);

    // Join room on socket
    const socket = getSocket();
    socket.emit('subscribe:user', { userId: newUser.id });
    if (newUser.role === UserRole.ADMIN) {
      socket.emit('subscribe:admin');
    }
  };

  const logout = () => {
    localStorage.removeItem('rhb_auth_token');
    localStorage.removeItem('rhb_user_profile');
    setToken(null);
    setUser(null);
    disconnectSocket();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isAdmin: user?.role === UserRole.ADMIN,
        login,
        logout,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
