import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { attachDebuggers } from "./utils/websocket-debug";

// Type for WebSocket events
type WebSocketEvent = {
  type: string;
  data: any;
};

// Typing status tracking
interface TypingStatus {
  userId: number;
  conversationId: number;
  timestamp: number;
  displayName: string;
}

// Message delivery status
export enum MessageDeliveryStatus {
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read"
}

// User presence status
export enum PresenceStatus {
  ONLINE = "online",
  AWAY = "away",
  OFFLINE = "offline"
}

// Extended WebSocket with custom properties
interface ExtendedWebSocket extends WebSocket {
  userId?: number;
  userInfo?: {
    name: string;
    status: PresenceStatus;
    lastActivity: number;
  };
}

// User ID to WebSocket connection mapping
const userConnections = new Map<number, ExtendedWebSocket[]>();

// Active typing status tracking
const activeTypingUsers = new Map<number, Map<number, TypingStatus>>();  // conversationId -> Map of userId -> TypingStatus

// Message delivery status tracking
const messageDeliveryStatus = new Map<number, {
  status: MessageDeliveryStatus,
  updatedAt: number,
  receivedBy: Set<number>,
  readBy: Set<number>
}>();

// User presence tracking
const userPresenceStatus = new Map<number, {
  status: PresenceStatus,
  lastActivity: number,
  displayName: string
}>();

// Cleanup typing indicators after 5s of inactivity
const TYPING_EXPIRY_MS = 5000;

export function setupWebsocketServer(httpServer: HttpServer) {
  // Create WebSocket server with a specific path to avoid
  // conflicts with Vite's HMR WebSocket
  const wss = new WebSocketServer<ExtendedWebSocket>({ 
    server: httpServer, 
    path: '/ws' 
  });
  
  // Setup presence tracking monitor
  setupPresenceMonitor();
  
  // Setup typing indicator cleanup
  setupTypingCleanup();
  
  wss.on('connection', (ws, req) => {
    console.log('WebSocket connection established');
    let userId: number | null = null;
    
    // Attach debuggers for better logging
    attachDebuggers(ws as any);
    
    // Parse URL to extract user ID from query string
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const userIdParam = url.searchParams.get('userId');
    const userName = url.searchParams.get('userName') || 'Anônimo';
    
    if (userIdParam) {
      userId = parseInt(userIdParam);
      // Register this connection for the user
      const userWs = userConnections.get(userId) || [];
      
      // Add user info to the websocket connection
      (ws as ExtendedWebSocket).userId = userId;
      (ws as ExtendedWebSocket).userInfo = {
        name: userName,
        status: PresenceStatus.ONLINE,
        lastActivity: Date.now()
      };
      
      userWs.push(ws as ExtendedWebSocket);
      userConnections.set(userId, userWs);
      
      // Update user presence status
      updateUserPresence(userId, PresenceStatus.ONLINE, userName);
      
      console.log(`User ${userId} (${userName}) connected`);
      
      // Broadcast user presence update to all clients
      broadcastPresenceUpdate(userId);
    }
    
    // Handle messages received from client
    ws.on('message', (message) => {
      try {
        const event = JSON.parse(message.toString()) as WebSocketEvent;
        console.log(`Received message from client:`, event);
        
        // Update last activity timestamp
        if (userId && (ws as ExtendedWebSocket).userInfo) {
          (ws as ExtendedWebSocket).userInfo.lastActivity = Date.now();
          updateUserPresence(userId, PresenceStatus.ONLINE);
        }
        
        // Handle specific event types
        handleClientEvent(event, userId, ws);
        
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    // Handle connection close
    ws.on('close', () => {
      console.log('WebSocket connection closed');
      
      if (userId) {
        const userWs = userConnections.get(userId) || [];
        const index = userWs.indexOf(ws as ExtendedWebSocket);
        
        if (index !== -1) {
          userWs.splice(index, 1);
          
          // If user has no more connections, mark as offline
          if (userWs.length === 0) {
            userConnections.delete(userId);
            updateUserPresence(userId, PresenceStatus.OFFLINE);
            broadcastPresenceUpdate(userId);
          } else {
            userConnections.set(userId, userWs);
          }
        }
        
        console.log(`User ${userId} disconnected`);
        
        // Remove typing indicators for this user from all conversations
        cleanupUserTypingStatus(userId);
      }
    });
    
    // Send a welcome message with initial state
    ws.send(JSON.stringify({
      type: 'connected',
      data: { 
        message: 'Connected to EduChat WebSocket server',
        userId: userId,
        // Send initial presence information for all online users
        presence: Array.from(userPresenceStatus.entries()).map(([uid, data]) => ({
          userId: uid,
          status: data.status,
          displayName: data.displayName,
          lastActivity: data.lastActivity
        }))
      }
    }));
  });
  
  // Function to send event to a specific user
  const sendEventToUser = (userId: number, event: WebSocketEvent) => {
    const connections = userConnections.get(userId);
    
    if (connections) {
      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(event));
        }
      });
    }
  };
  
  // Function to send event to all connected users
  const sendEventToAll = (event: WebSocketEvent) => {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(event));
      }
    });
  };
  
  /**
   * Limpa status de digitação de um usuário em todas as conversas
   */
  function cleanupUserTypingStatus(userId: number) {
    for (const [conversationId, typingUsers] of activeTypingUsers.entries()) {
      if (typingUsers.has(userId)) {
        typingUsers.delete(userId);
        // Broadcast typing status update for this conversation
        broadcastTypingStatus(conversationId);
      }
    }
  }

  /**
   * Monitora status de presença dos usuários e marca como ausente após inatividade
   */
  function setupPresenceMonitor() {
    // Check every 30 seconds for inactive users
    const INACTIVE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes of inactivity = AWAY
    const OFFLINE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes of inactivity = OFFLINE
    
    setInterval(() => {
      const now = Date.now();
      const usersToUpdate: number[] = [];
      
      // Check all presence statuses
      for (const [userId, presence] of userPresenceStatus.entries()) {
        const inactiveTime = now - presence.lastActivity;
        
        // If user is online but inactive for > 5 minutes, set to AWAY
        if (
          presence.status === PresenceStatus.ONLINE && 
          inactiveTime > INACTIVE_THRESHOLD_MS
        ) {
          updateUserPresence(userId, PresenceStatus.AWAY);
          usersToUpdate.push(userId);
        }
        // If user is away but inactive for > 15 minutes, set to OFFLINE
        else if (
          presence.status === PresenceStatus.AWAY && 
          inactiveTime > OFFLINE_THRESHOLD_MS
        ) {
          updateUserPresence(userId, PresenceStatus.OFFLINE);
          usersToUpdate.push(userId);
        }
      }
      
      // Broadcast updates
      usersToUpdate.forEach(userId => {
        broadcastPresenceUpdate(userId);
      });
    }, 30000);
  }
  
  /**
   * Limpa indicadores de digitação expirados
   */
  function setupTypingCleanup() {
    setInterval(() => {
      const now = Date.now();
      const conversationsToUpdate = new Set<number>();
      
      // Check all typing statuses
      for (const [conversationId, typingUsers] of activeTypingUsers.entries()) {
        let updated = false;
        
        for (const [userId, status] of typingUsers.entries()) {
          if (now - status.timestamp > TYPING_EXPIRY_MS) {
            typingUsers.delete(userId);
            updated = true;
          }
        }
        
        if (updated) {
          conversationsToUpdate.add(conversationId);
        }
        
        // Remove empty maps
        if (typingUsers.size === 0) {
          activeTypingUsers.delete(conversationId);
        }
      }
      
      // Broadcast typing updates for affected conversations
      conversationsToUpdate.forEach(conversationId => {
        broadcastTypingStatus(conversationId);
      });
    }, 1000);
  }
  
  /**
   * Atualiza o status de presença de um usuário
   */
  function updateUserPresence(
    userId: number, 
    status: PresenceStatus, 
    displayName?: string
  ) {
    const existing = userPresenceStatus.get(userId) || {
      status: PresenceStatus.OFFLINE,
      lastActivity: Date.now(),
      displayName: 'Usuário'
    };
    
    userPresenceStatus.set(userId, {
      status,
      lastActivity: Date.now(),
      displayName: displayName || existing.displayName
    });
  }
  
  /**
   * Transmite atualização de presença para todos os clientes
   */
  function broadcastPresenceUpdate(userId: number) {
    const presence = userPresenceStatus.get(userId);
    if (!presence) return;
    
    sendEventToAll({
      type: 'presence_update',
      data: {
        userId,
        status: presence.status,
        displayName: presence.displayName,
        lastActivity: presence.lastActivity
      }
    });
  }
  
  /**
   * Transmite status de digitação para todos os clientes sobre uma conversa
   */
  function broadcastTypingStatus(conversationId: number) {
    const typingUsers = activeTypingUsers.get(conversationId);
    const typingList = typingUsers 
      ? Array.from(typingUsers.values())
      : [];
    
    sendEventToAll({
      type: 'typing_status',
      data: {
        conversationId,
        typingUsers: typingList
      }
    });
  }
  
  /**
   * Transmite atualização de status de entrega de mensagens
   */
  function broadcastMessageStatus(messageId: number) {
    const status = messageDeliveryStatus.get(messageId);
    if (!status) return;
    
    sendEventToAll({
      type: 'message_status',
      data: {
        messageId,
        status: status.status,
        updatedAt: status.updatedAt,
        receivedBy: Array.from(status.receivedBy),
        readBy: Array.from(status.readBy)
      }
    });
  }
  
  /**
   * Manipula eventos enviados pelo cliente
   */
  function handleClientEvent(event: WebSocketEvent, userId: number | null, ws: WebSocket) {
    if (!userId) return;
    
    switch (event.type) {
      case 'typing_start':
        // Cliente começou a digitar em uma conversa
        handleTypingStart(userId, event.data?.conversationId, event.data?.displayName);
        break;
        
      case 'typing_stop':
        // Cliente parou de digitar em uma conversa
        handleTypingStop(userId, event.data?.conversationId);
        break;
        
      case 'message_delivered':
        // Cliente recebeu uma mensagem
        handleMessageDelivered(userId, event.data?.messageId);
        break;
        
      case 'message_read':
        // Cliente leu uma mensagem
        handleMessageRead(userId, event.data?.messageId);
        break;
        
      case 'presence_update':
        // Cliente atualiza seu status de presença
        handlePresenceUpdate(userId, event.data?.status, event.data?.displayName);
        break;
        
      default:
        // Para outros tipos de evento, apenas responder com eco
        ws.send(JSON.stringify({
          type: 'echo',
          data: event.data
        }));
    }
  }
  
  /**
   * Manipula evento de início de digitação
   */
  function handleTypingStart(userId: number, conversationId?: number, displayName?: string) {
    if (!conversationId || !userId) return;
    
    // Obtém ou cria mapa de usuários digitando para esta conversa
    const typingUsers = activeTypingUsers.get(conversationId) || new Map<number, TypingStatus>();
    
    // Adiciona ou atualiza status de digitação
    typingUsers.set(userId, {
      userId,
      conversationId,
      timestamp: Date.now(),
      displayName: displayName || `Usuário ${userId}`
    });
    
    // Atualiza mapa global
    activeTypingUsers.set(conversationId, typingUsers);
    
    // Transmite status atualizado
    broadcastTypingStatus(conversationId);
  }
  
  /**
   * Manipula evento de parada de digitação
   */
  function handleTypingStop(userId: number, conversationId?: number) {
    if (!conversationId || !userId) return;
    
    const typingUsers = activeTypingUsers.get(conversationId);
    if (!typingUsers) return;
    
    // Remove este usuário da lista de digitação
    typingUsers.delete(userId);
    
    if (typingUsers.size === 0) {
      // Se não há mais usuários digitando nesta conversa, remover do mapa global
      activeTypingUsers.delete(conversationId);
    } else {
      // Caso contrário, atualizar o mapa global
      activeTypingUsers.set(conversationId, typingUsers);
    }
    
    // Transmite status atualizado
    broadcastTypingStatus(conversationId);
  }
  
  /**
   * Manipula evento de mensagem entregue
   */
  function handleMessageDelivered(userId: number, messageId?: number) {
    if (!messageId || !userId) return;
    
    // Obtém ou cria status de entrega para esta mensagem
    const status = messageDeliveryStatus.get(messageId) || {
      status: MessageDeliveryStatus.SENT,
      updatedAt: Date.now(),
      receivedBy: new Set<number>(),
      readBy: new Set<number>()
    };
    
    // Marca como entregue para este usuário
    status.receivedBy.add(userId);
    
    // Atualiza status global se necessário
    if (status.status === MessageDeliveryStatus.SENT) {
      status.status = MessageDeliveryStatus.DELIVERED;
      status.updatedAt = Date.now();
    }
    
    // Atualiza mapa global
    messageDeliveryStatus.set(messageId, status);
    
    // Transmite status atualizado
    broadcastMessageStatus(messageId);
  }
  
  /**
   * Manipula evento de mensagem lida
   */
  function handleMessageRead(userId: number, messageId?: number) {
    if (!messageId || !userId) return;
    
    // Obtém ou cria status de entrega para esta mensagem
    const status = messageDeliveryStatus.get(messageId) || {
      status: MessageDeliveryStatus.SENT,
      updatedAt: Date.now(),
      receivedBy: new Set<number>(),
      readBy: new Set<number>()
    };
    
    // Marca como lida para este usuário
    status.readBy.add(userId);
    status.receivedBy.add(userId); // Se foi lida, também foi entregue
    
    // Atualiza status global
    status.status = MessageDeliveryStatus.READ;
    status.updatedAt = Date.now();
    
    // Atualiza mapa global
    messageDeliveryStatus.set(messageId, status);
    
    // Transmite status atualizado
    broadcastMessageStatus(messageId);
  }
  
  /**
   * Manipula atualização de presença
   */
  function handlePresenceUpdate(userId: number, status?: PresenceStatus, displayName?: string) {
    if (!userId || !status) return;
    
    // Atualiza status de presença
    updateUserPresence(userId, status, displayName);
    
    // Transmite atualização
    broadcastPresenceUpdate(userId);
  }

  return { wss, sendEventToUser, sendEventToAll };
}
