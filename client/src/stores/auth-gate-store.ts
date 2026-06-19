import { create } from 'zustand';

interface AuthGateState {
  open: boolean;
  openGate: () => void;
  closeGate: () => void;
}

// Drives the soft login wall: any action that needs an account opens this gate
// instead of firing an authed request that would 401.
export const useAuthGateStore = create<AuthGateState>((set) => ({
  open: false,
  openGate: () => set({ open: true }),
  closeGate: () => set({ open: false }),
}));
