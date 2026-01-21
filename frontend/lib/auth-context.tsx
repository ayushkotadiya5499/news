'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { newsApi } from '@/lib/api';

interface User {
  id: number;
  username: string;
  full_name: string | null;
}

interface AuthContextType {
  user: User | null;
  login: (username: string) => Promise<void>;
  register: (username: string, fullName?: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for stored user on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('ai_news_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('ai_news_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string) => {
    try {
      // Fetch user from backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/users/${username}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('User not found. Please check your username.');
        }
        throw new Error('Failed to login');
      }

      const userData = await response.json();
      setUser(userData);
      localStorage.setItem('ai_news_user', JSON.stringify(userData));
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (username: string, fullName?: string) => {
    try {
      // Create new user
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/auth/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          full_name: fullName || null,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400) {
          throw new Error(errorData.detail || 'Username already exists');
        }
        throw new Error('Failed to create account');
      }

      const userData = await response.json();
      setUser(userData);
      localStorage.setItem('ai_news_user', JSON.stringify(userData));
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('ai_news_user');
  };

  const isAdmin = user?.username === 'admin';

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAdmin, isLoading }}>
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
