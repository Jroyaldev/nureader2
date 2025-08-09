'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast, ToastProps } from './Toast';

interface ToastContextType {
  toasts: (ToastProps & { id: string })[];
  addToast: (toast: Omit<ToastProps, 'id' | 'onClose'>) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export interface ToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export function ToastProvider({ 
  children, 
  maxToasts = 5,
  position = 'top-right'
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<(ToastProps & { id: string })[]>([]);

  const addToast = useCallback((toast: Omit<ToastProps, 'id' | 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    
    setToasts((prev) => {
      const newToasts = [
        ...prev,
        { ...toast, id, onClose: () => removeToast(id) }
      ];
      
      // Limit the number of toasts
      if (newToasts.length > maxToasts) {
        return newToasts.slice(-maxToasts);
      }
      
      return newToasts;
    });
    
    return id;
  }, [maxToasts]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, clearToasts }}>
      {children}
      
      {/* Toast Container */}
      <div
        className={`fixed z-50 flex flex-col space-y-2 pointer-events-none ${positionClasses[position]}`}
        style={{ maxWidth: '420px', width: '100%' }}
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast {...toast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  
  return context;
}

// Convenience hooks for different toast types
export function useToastActions() {
  const { addToast } = useToast();
  
  return {
    success: (title: string, description?: string, options?: Partial<ToastProps>) =>
      addToast({ title, description, variant: 'success', ...options }),
    
    error: (title: string, description?: string, options?: Partial<ToastProps>) =>
      addToast({ title, description, variant: 'error', ...options }),
    
    warning: (title: string, description?: string, options?: Partial<ToastProps>) =>
      addToast({ title, description, variant: 'warning', ...options }),
    
    info: (title: string, description?: string, options?: Partial<ToastProps>) =>
      addToast({ title, description, variant: 'info', ...options }),
    
    default: (title: string, description?: string, options?: Partial<ToastProps>) =>
      addToast({ title, description, variant: 'default', ...options })
  };
}