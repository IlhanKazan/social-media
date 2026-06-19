import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthGate } from './use-auth-gate';
import { useAuthStore } from '@/stores/auth-store';
import { useAuthGateStore } from '@/stores/auth-gate-store';
import type { AccountSummary } from '@/types/api';

describe('useAuthGate', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null, account: null });
    useAuthGateStore.setState({ open: false });
  });

  it('opens the gate and skips the action when logged out', () => {
    const action = vi.fn();
    const { result } = renderHook(() => useAuthGate());

    act(() => result.current.requireAuth(action));

    expect(action).not.toHaveBeenCalled();
    expect(useAuthGateStore.getState().open).toBe(true);
  });

  it('runs the action and leaves the gate closed when logged in', () => {
    useAuthStore.setState({ token: 'tok', account: { id: 1, username: 'neo' } as AccountSummary });
    const action = vi.fn();
    const { result } = renderHook(() => useAuthGate());

    act(() => result.current.requireAuth(action));

    expect(action).toHaveBeenCalledOnce();
    expect(useAuthGateStore.getState().open).toBe(false);
  });
});
