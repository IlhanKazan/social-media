import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from '@/stores/auth-store';

interface WebSocketContextType {
  isConnected: boolean;
  subscribe: (destination: string, callback: (message: IMessage) => void) => StompSubscription | null;
  publish: (destination: string, body: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!token) return;

    const client = new Client({
      webSocketFactory: () => {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';
        const wsUrl = baseUrl.replace('/api/v1', '/ws');
        return new SockJS(wsUrl);
      },
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      debug: (str) => {
        if (import.meta.env.DEV) console.log('[STOMP]', str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => setIsConnected(true),
      onDisconnect: () => setIsConnected(false),
      onStompError: (frame) => console.error('Broker reported error: ' + frame.headers['message']),
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
      setIsConnected(false);
    };
  }, [token]);

  const subscribe = (destination: string, callback: (message: IMessage) => void) => {
    if (!clientRef.current || !clientRef.current.connected) return null;
    return clientRef.current.subscribe(destination, callback);
  };

  const publish = (destination: string, body: any) => {
    if (!clientRef.current || !clientRef.current.connected) return;
    clientRef.current.publish({ destination, body: JSON.stringify(body) });
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, subscribe, publish }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}
