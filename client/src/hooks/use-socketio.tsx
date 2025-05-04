import { useAuth } from '@/hooks/use-auth';
import { 
  SocketIOClient, 
  PresenceStatus, 
  TypingStatus,
  MessageStatus,
  PresenceInfo,
  SocketEvent,
  Notification
} from '@/lib/socketio';
import { 
  createContext, 
  ReactNode, 
  useContext, 
  useEffect, 
  useMemo, 
  useState, 
  useCallback 
} from 'react';
import { useNotificationSound } from '@/hooks/use-notification-sound';
import { useLocation } from 'wouter';

type SocketIOContextType = {
  connected: boolean;
  sendMessage: (message: any) => void;
  lastEvent: any | null;
  startTyping: (conversationId: number, displayName?: string) => void;
  stopTyping: (conversationId: number) => void;
  markMessageAsDelivered: (messageId: number) => void;
  markMessageAsRead: (messageId: number) => void;
  updatePresence: (status: PresenceStatus) => void;
  typingUsers: Map<number, TypingStatus[]>; // conversationId -> list of typing users
  messageStatuses: Map<number, MessageStatus>; // messageId -> message status
  userPresence: Map<number, PresenceInfo>; // userId -> presence info
};

const SocketIOContext = createContext<SocketIOContextType | null>(null);

export function SocketIOProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<any | null>(null);
  const [location] = useLocation();
  
  // Estado para acompanhamento de digitação, entrega e presença
  const [typingUsers, setTypingUsers] = useState<Map<number, TypingStatus[]>>(new Map());
  const [messageStatuses, setMessageStatuses] = useState<Map<number, MessageStatus>>(new Map());
  const [userPresence, setUserPresence] = useState<Map<number, PresenceInfo>>(new Map());
  
  // Controle de conexão baseado na rota atual
  const [shouldConnect, setShouldConnect] = useState(true);
  
  // Hook para gerenciar sons de notificação de forma segura
  const { playNotificationSound } = useNotificationSound();
  
  // Verificar se estamos na página de CRM para evitar conexões websocket na página
  // que está causando problemas
  useEffect(() => {
    const isCrmPage = location.startsWith('/crm');
    setShouldConnect(!isCrmPage);
  }, [location]);
  
  // Callbacks para eventos específicos
  const handleTypingStatus = useCallback((conversationId: number, users: TypingStatus[]) => {
    setTypingUsers(prev => {
      const newMap = new Map(prev);
      if (users.length === 0) {
        newMap.delete(conversationId);
      } else {
        newMap.set(conversationId, users);
      }
      return newMap;
    });
  }, []);
  
  const handleMessageStatus = useCallback((status: MessageStatus) => {
    setMessageStatuses(prev => {
      const newMap = new Map(prev);
      newMap.set(status.messageId, status);
      return newMap;
    });
  }, []);
  
  const handlePresenceUpdate = useCallback((info: PresenceInfo) => {
    setUserPresence(prev => {
      const newMap = new Map(prev);
      newMap.set(info.userId, info);
      return newMap;
    });
  }, []);
  
  const socketIOClient = useMemo(() => {
    return new SocketIOClient({
      userId: user?.id || null,
      userName: user?.name || undefined,
      onOpen: () => setConnected(true),
      onClose: () => setConnected(false),
      onMessage: (event) => {
        setLastEvent(event);
        
        // Tocar som de notificação apenas para eventos específicos
        // e não para cada evento recebido
        if (event.type === 'new_message' || 
            event.type === 'conversation_created' ||
            event.type === 'mention') {
          // Usar o hook seguro para reproduzir sons
          playNotificationSound();
        }
      },
      onTypingStatus: handleTypingStatus,
      onMessageStatus: handleMessageStatus,
      onPresenceUpdate: handlePresenceUpdate
    });
  }, [
    user?.id, 
    user?.name, 
    handleTypingStatus, 
    handleMessageStatus, 
    handlePresenceUpdate,
    playNotificationSound
  ]);
  
  useEffect(() => {
    // Connect when component mounts or user changes
    // mas apenas se não estivermos na página CRM
    if (shouldConnect) {
      socketIOClient.connect();
    } else {
      // Se estamos na página CRM, desconectar para evitar erros
      socketIOClient.disconnect();
    }
    
    // Cleanup when component unmounts
    return () => {
      socketIOClient.disconnect();
    };
  }, [socketIOClient, shouldConnect]);
  
  // Update userId and userName when user changes
  useEffect(() => {
    socketIOClient.updateOptions({ 
      userId: user?.id || null,
      userName: user?.name 
    });
  }, [user?.id, user?.name, socketIOClient]);
  
  // Funções expostas no contexto
  const sendMessage = useCallback((message: any) => {
    socketIOClient.send(message);
  }, [socketIOClient]);
  
  const startTyping = useCallback((conversationId: number, displayName?: string) => {
    socketIOClient.startTyping(conversationId, displayName || user?.name);
  }, [socketIOClient, user?.name]);
  
  const stopTyping = useCallback((conversationId: number) => {
    socketIOClient.stopTyping(conversationId);
  }, [socketIOClient]);
  
  const markMessageAsDelivered = useCallback((messageId: number) => {
    socketIOClient.markMessageAsDelivered(messageId);
  }, [socketIOClient]);
  
  const markMessageAsRead = useCallback((messageId: number) => {
    socketIOClient.markMessageAsRead(messageId);
  }, [socketIOClient]);
  
  const updatePresence = useCallback((status: PresenceStatus) => {
    socketIOClient.updatePresence(status, user?.name);
  }, [socketIOClient, user?.name]);
  
  return (
    <SocketIOContext.Provider
      value={{
        connected,
        sendMessage,
        lastEvent,
        startTyping,
        stopTyping,
        markMessageAsDelivered,
        markMessageAsRead,
        updatePresence,
        typingUsers,
        messageStatuses,
        userPresence
      }}
    >
      {children}
    </SocketIOContext.Provider>
  );
}

export function useSocketIO() {
  const context = useContext(SocketIOContext);
  if (!context) {
    throw new Error('useSocketIO must be used within a SocketIOProvider');
  }
  return context;
}