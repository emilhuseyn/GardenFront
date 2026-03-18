'use client';
import { useEffect, useState } from 'react';
import { useAuthStore, getPermissions } from '@/lib/stores/authStore';

export function useAuth() {
  const { user, token, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const permissions = getPermissions(user?.role);

  return {
    user,
    token,
    isAuthenticated,
    permissions,
    setAuth,
    logout: clearAuth,
  };
}
