import * as Sentry from '@sentry/react-native';
import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { API_BASE_URL } from '@/lib/env';
import { useAuthStore } from '@/stores/auth-store';

/** Errors and close events are not plain objects; pull out what is loggable. */
function safeDescribe(event: unknown): string {
  if (!event || typeof event !== 'object') return String(event);
  const e = event as Record<string, unknown>;
  return JSON.stringify({ type: e.type, message: e.message, code: e.code }) ?? 'unknown';
}

const WS_URL = `${API_BASE_URL.replace(/^http/, 'ws')}/ws-native`;

interface WebSocketContextValue {
  isConnected: boolean;
  subscribe: (destination: string, callback: (message: IMessage) => void) => StompSubscription | null;
  publish: (destination: string, body: unknown) => boolean;
}

const WebSocketContext = createContext<WebSocketContextValue>({
  isConnected: false,
  subscribe: () => null,
  publish: () => false,
});

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const clientRef = useRef<Client | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const client = new Client({
      brokerURL: WS_URL,
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      // stomp-js documented React Native workarounds
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
      onConnect: () => setIsConnected(true),
      onDisconnect: () => setIsConnected(false),
      // Report the reason. A silent failure here strands DMs, which are only
      // ever sent over STOMP — there is no REST path to fall back to.
      onStompError: (frame) => {
        setIsConnected(false);
        Sentry.captureException(new Error(`STOMP error: ${frame.headers.message ?? 'unknown'}`), {
          extra: { body: frame.body },
        });
      },
      onWebSocketError: (event) => {
        setIsConnected(false);
        Sentry.captureException(new Error('WebSocket connection error'), {
          extra: { url: WS_URL, event: safeDescribe(event) },
        });
      },
      // The close frame is where the actual reason lives: 1006 means the socket
      // died before a close handshake (proxy, TLS, DNS), while a policy code
      // points at the server or something in front of it. Without this the error
      // above says only that *something* failed.
      onWebSocketClose: (event) => {
        setIsConnected(false);
        if (event && event.code !== 1000 && event.code !== 1001) {
          Sentry.captureException(new Error(`WebSocket closed: ${event.code}`), {
            extra: {
              url: WS_URL,
              code: event.code,
              reason: event.reason || '(none)',
              wasClean: event.wasClean,
            },
          });
        }
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      void client.deactivate();
      clientRef.current = null;
      setIsConnected(false);
    };
  }, [token]);

  const subscribe = useCallback((destination: string, callback: (message: IMessage) => void) => {
    const client = clientRef.current;
    if (!client?.connected) return null;
    return client.subscribe(destination, callback);
  }, []);

  // Reports whether the frame actually went out. Callers optimistically render
  // what they send, so a dropped publish has to be visible to them — otherwise
  // the message sits on screen looking delivered and never arrives.
  const publish = useCallback((destination: string, body: unknown): boolean => {
    const client = clientRef.current;
    if (!client?.connected) return false;
    client.publish({ destination, body: JSON.stringify(body) });
    return true;
  }, []);

  const value = useMemo(
    () => ({ isConnected, subscribe, publish }),
    [isConnected, subscribe, publish]
  );

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}
