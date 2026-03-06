import React, { createContext, useContext, useState, useEffect } from 'react';

interface User {
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, rememberMe: boolean) => void;
  logout: () => void;
  register: (email: string, name: string, rememberMe: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check local storage and session storage
    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user from storage");
      }
    }
  }, []);

  const login = (email: string, rememberMe: boolean) => {
    // In a real app, you'd verify credentials here
    const users = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
    const name = users[email]?.name || email.split('@')[0];
    
    const userData = { email, name };
    setUser(userData);
    
    if (rememberMe) {
      localStorage.setItem('user', JSON.stringify(userData));
    } else {
      sessionStorage.setItem('user', JSON.stringify(userData));
    }
  };

  const register = (email: string, name: string, rememberMe: boolean) => {
    const users = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
    users[email] = { email, name };
    localStorage.setItem('registeredUsers', JSON.stringify(users));
    
    login(email, rememberMe);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
