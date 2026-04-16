import { create } from "zustand";
import type { Role } from "../types";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  role: Role | null;
  setTokens: (access: string, refresh: string) => void;
  setRole: (role: Role) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: localStorage.getItem("flowberry_access"),
  refreshToken: localStorage.getItem("flowberry_refresh"),
  role: (localStorage.getItem("flowberry_role") as Role | null) ?? null,
  setTokens: (access, refresh) => {
    localStorage.setItem("flowberry_access", access);
    localStorage.setItem("flowberry_refresh", refresh);
    set({ accessToken: access, refreshToken: refresh });
  },
  setRole: (role) => {
    localStorage.setItem("flowberry_role", role);
    set({ role });
  },
  clear: () => {
    localStorage.removeItem("flowberry_access");
    localStorage.removeItem("flowberry_refresh");
    localStorage.removeItem("flowberry_role");
    set({ accessToken: null, refreshToken: null, role: null });
  },
}));
