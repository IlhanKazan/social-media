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

const WS_URL = `${API_BASE_URL.replace(/^http/, 'ws')}/ws-native`;

interface WebSocketContextValue {
  isConnected: boolean;
  subscribe: (destination: string, callback: (message: IMessage) => void) => StompSubscription | null;
  publish: (destination: string, body: unknown) => void;
}

const WebSocketContext = createContext<WebSocketContextValue>({
  isConnected: false,
  subscribe: () => null,
  publish: () => {},
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
      onStompError: () => setIsConnected(false),
      onWebSocketClose: () => setIsConnected(false),
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

  const publish = useCallback((destination: string, body: unknown) => {
    const client = clientRef.current;
    if (!client?.connected) return;
    client.publish({ destination, body: JSON.stringify(body) });
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
