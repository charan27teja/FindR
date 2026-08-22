'use client';

import React, { createContext, useContext, useState, useEffect, useTransition } from 'react';
import { LoadingScreen } from './LoadingScreen';

interface LoadingContextType {
  setIsLoading: (loading: boolean) => void;
  startTransition: (fn: () => Promise<void> | void) => void;
  isPending: boolean;
}

const LoadingContext = createContext<LoadingContextType | null>(null);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startReactTransition] = useTransition();

  useEffect(() => {
    // Initial mount: ~1s wordmark, then the icon reel gets two turns.
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2900);
    return () => clearTimeout(timer);
  }, []);

  const startTransition = (fn: () => Promise<void> | void) => {
    setIsLoading(true);
    startReactTransition(async () => {
      try {
        await fn();
      } finally {
        setIsLoading(false);
      }
    });
  };

  return (
    <LoadingContext.Provider value={{ setIsLoading, startTransition, isPending }}>
      {children}
      <LoadingScreen isLoading={isLoading || isPending} />
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}
