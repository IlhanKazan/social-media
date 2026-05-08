import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { useNotificationStore } from '@/stores/notification-store';
import type { NotificationResponse } from '@/types/api';

interface WebSocketContextType {
  isConnected: boolean;
  subscribe: (destination: string, callback: (message: IMessage) => void) => StompSubscription | null;
  publish: (destination: string, body: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

const getToastMessage = (notif: NotificationResponse) => {
  const name = notif.actor ? (notif.actor.displayName || notif.actor.username) : "Sistem Bildirimi";

  switch (notif.type) {
    case 'LIKE': return `${name} gönderini beğendi.`;
    case 'REPLY': return `${name} sana bir yanıt verdi.`;
    case 'REPOST': return `${name} gönderini yeniden paylaştı.`;
    case 'QUOTE_REPOST': return `${name} gönderini alıntıladı.`;
    case 'FOLLOW': return `${name} seni takip etmeye başladı.`;
    case 'MODERATION_ALERT': return `Gönderin topluluk kuralları sebebiyle gizlendi.`;
    default: return `${name} yeni bir etkileşimde bulundu.`;
  }
};

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (!token) return;

    const client = new Client({
      webSocketFactory: () => {
        const origin = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';
        return new SockJS(`${origin}/ws`);
      },
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        setIsConnected(true);

        client.subscribe('/user/queue/notifications', (message) => {
          if (message.body) {
            const notification = JSON.parse(message.body) as NotificationResponse;
            useNotificationStore.getState().incrementUnread();

            toast(notification.type === 'MODERATION_ALERT' ? 'Uyarı' : 'Yeni Bildirim', {
              description: getToastMessage(notification),
            });
          }
        });
      },
      onDisconnect: () => setIsConnected(false),
      onStompError: () => setIsConnected(false),
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
