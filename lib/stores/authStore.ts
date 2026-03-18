import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserRole } from '@/types';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  updateUser: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setHasHydrated: (v) => set({ _hasHydrated: v }),
      setAuth: (user, token) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('kg_token', token);
          // Also set cookie so middleware can read it
          document.cookie = `kg_token=${encodeURIComponent(token)}; path=/; SameSite=Strict`;
        }
        set({ user, token, isAuthenticated: true });
      },

      clearAuth: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('kg_token');
          document.cookie = 'kg_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        }
        set({ user: null, token: null, isAuthenticated: false });
      },

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),
    }),
    {
      name: 'kg-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// Permission helper based on role
export function getPermissions(role: UserRole | undefined) {
  const isAdmin     = role === 'Administrator';
  const isAccountant = role === 'Accountant';
  const isTeacher   = role === 'Teacher';
  const isAdmission = role === 'AdmissionStaff';

  return {
    // ── Uşaqlar ──────────────────────────────────────────────
    children: {
      view:             !isAccountant,
      create:           isAdmin || isAdmission,
      edit:             isAdmin || isAdmission,
      delete:           isAdmin,
      changeStatus:     isAdmin || isAdmission,   // aktiv / passiv
      changeGroup:      isAdmin || isAdmission,   // qrup köçürmə
    },

    // ── Davamiyyət ────────────────────────────────────────────
    attendance: {
      view:             isAdmin || isTeacher,
      create:           isAdmin || isTeacher,     // yalnız öz qrupu (backend tərəfindən məhdudlaşdırılır)
      edit:             isAdmin || isTeacher,
    },

    // ── Ödənişlər ─────────────────────────────────────────────
    payments: {
      view:             isAdmin || isAccountant,
      create:           isAdmin || isAccountant,
      edit:             isAdmin || isAccountant,
      applyDiscount:    isAdmin || isAccountant,
      viewDebts:        isAdmin || isAccountant,
    },

    // ── Qruplar ───────────────────────────────────────────────
    groups: {
      view:             !isAccountant,
      create:           isAdmin || isAdmission,
      edit:             isAdmin || isAdmission,
      delete:           isAdmin || isAdmission,
      assignTeacher:    isAdmin,
      changeCapacity:   isAdmin,
      changeLanguage:   isAdmin,
    },

    // ── Qrafik ────────────────────────────────────────────────
    schedule: {
      view:             isAdmin || isTeacher || isAdmission,
      edit:             isAdmin,
    },

    // ── Hesabatlar ────────────────────────────────────────────
    reports: {
      view:             isAdmin || isAccountant,
      viewFinancial:    isAdmin || isAccountant,
      viewAttendance:   isAdmin || isTeacher,
      viewAll:          isAdmin,
    },

    // ── FaceID ────────────────────────────────────────────────
    faceId: {
      view:             isAdmin || isTeacher || isAdmission,
      create:           isAdmin || isAdmission,
      edit:             isAdmin,
    },

    // ── İstifadəçilər & Sistem ────────────────────────────────
    users: {
      view:             isAdmin,
      create:           isAdmin,
      edit:             isAdmin,
      delete:           isAdmin,
      changeRole:       isAdmin,
    },
    settings: {
      view:             true,
      edit:             isAdmin,
    },
  };
}
