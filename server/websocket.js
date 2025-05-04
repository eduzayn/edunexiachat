import { createServer as createHttpServer } from "http";
import { Server } from "socket.io";
import { log } from "./vite.js";

/**
 * Status de entrega de mensagens
 */
export const MessageDeliveryStatus = {
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read"
};

/**
 * Status de presença do usuário
 */
export const PresenceStatus = {
  ONLINE: "online",
  AWAY: "away",
  OFFLINE: "offline"
};

// Mapeamentos para rastrear conexões e estado
const userConnections = new Map(); // userId -> array de socket ids
const activeTypingUsers = new Map(); // conversationId -> Map de userId -> TypingStatus
const messageDeliveryStatus = new Map(); // messageId -> status object
const userPresenceStatus = new Map(); // userId -> status object

// Timeout para considerar que um usuário parou de digitar
const TYPING_EXPIRY_MS = 5000;

export function setupWebsocketServer(httpServer) {
  // Cria o servidor Socket.IO na rota /ws
  const io = new Server(httpServer, {
    cors: {
      origin: "*",  // Em produção, restrinja para domínios específicos
      methods: ["GET", "POST"]
    },
    path: '/ws' // Mantém o mesmo path para compatibilidade
  });
  
  // Configura monitoramento de presença
  setupPresenceMonitor();
  
  // Configura limpeza de indicadores de digitação
  setupTypingCleanup();
  
  // Manipula conexão ao servidor
  io.on('connection', (socket) => {
    log('Socket.IO connection established', 'socketio');
    let userId = null;
    
    // Autenticação do usuário
    socket.on('authenticate', (data) => {
      if (data && data.userId) {
        userId = data.userId;
        const userName = data.userName || 'Anônimo';
        
        // Registra esta conexão para o usuário
        const userSockets = userConnections.get(userId) || [];
        userSockets.push(socket.id);
        userConnections.set(userId, userSockets);
        
        // Adiciona informações do usuário ao socket
        socket.userId = userId;
        socket.userInfo = {
          name: userName,
          status: PresenceStatus.ONLINE,
          lastActivity: Date.now()
        };
        
        // Atualiza status de presença
        updateUserPresence(userId, PresenceStatus.ONLINE, userName);
        
        log(`User ${userId} (${userName}) authenticated`, 'socketio');
        
        // Transmite atualização de presença para todos
        broadcastPresenceUpdate(userId);
        
        // Envia estado inicial ao cliente recém-conectado
        socket.emit('connected', { 
          message: 'Connected to OmniConnect Socket.IO server',
          userId: userId,
          // Envia informações de presença inicial
          presence: Array.from(userPresenceStatus.entries()).map(([uid, data]) => ({
            userId: uid,
            status: data.status,
            displayName: data.displayName,
            lastActivity: data.lastActivity
          }))
        });
      }
    });
    
    // Eventos enviados pelo cliente
    socket.on('event', (event) => {
      try {
        log(`Received event from client: ${event.type}`, 'socketio');
        
        // Atualiza timestamp de última atividade
        if (userId && socket.userInfo) {
          socket.userInfo.lastActivity = Date.now();
          updateUserPresence(userId, PresenceStatus.ONLINE);
        }
        
        // Processa evento específico
        handleClientEvent(event, userId, socket);
        
      } catch (error) {
        log(`Error handling Socket.IO event: ${error}`, 'socketio');
      }
    });
    
    // Eventos específicos de digitação
    socket.on('typing_start', (data) => {
      if (!userId) return;
      handleTypingStart(userId, data.conversationId, data.displayName);
    });
    
    socket.on('typing_stop', (data) => {
      if (!userId) return;
      handleTypingStop(userId, data.conversationId);
    });
    
    // Eventos de status de mensagem
    socket.on('message_delivered', (data) => {
      if (!userId) return;
      handleMessageDelivered(userId, data.messageId);
    });
    
    socket.on('message_read', (data) => {
      if (!userId) return;
      handleMessageRead(userId, data.messageId);
    });
    
    // Atualização de presença
    socket.on('presence_update', (data) => {
      if (!userId) return;
      handlePresenceUpdate(userId, data.status, data.displayName);
    });
    
    // Trata desconexão
    socket.on('disconnect', () => {
      log('Socket.IO connection closed', 'socketio');
      
      if (userId) {
        const userSockets = userConnections.get(userId) || [];
        const index = userSockets.indexOf(socket.id);
        
        if (index !== -1) {
          userSockets.splice(index, 1);
          
          // Se não há mais conexões para este usuário, marca como offline
          if (userSockets.length === 0) {
            userConnections.delete(userId);
            updateUserPresence(userId, PresenceStatus.OFFLINE);
            broadcastPresenceUpdate(userId);
          } else {
            userConnections.set(userId, userSockets);
          }
        }
        
        log(`User ${userId} disconnected`, 'socketio');
        
        // Remove indicadores de digitação para este usuário
        cleanupUserTypingStatus(userId);
      }
    });
  });
  
  // Funções auxiliares
  
  // Envia evento para um usuário específico
  const sendEventToUser = (userId, eventType, data) => {
    const socketIds = userConnections.get(userId);
    
    if (socketIds && socketIds.length > 0) {
      socketIds.forEach(socketId => {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit(eventType, data);
        }
      });
    }
  };
  
  // Envia evento para todos os usuários conectados
  const sendEventToAll = (eventType, data) => {
    io.emit(eventType, data);
  };
  
  /**
   * Limpa status de digitação de um usuário em todas as conversas
   */
  function cleanupUserTypingStatus(userId) {
    for (const [conversationId, typingUsers] of activeTypingUsers.entries()) {
      if (typingUsers.has(userId)) {
        typingUsers.delete(userId);
        // Transmite atualização de status de digitação
        broadcastTypingStatus(conversationId);
      }
    }
  }

  /**
   * Monitora status de presença dos usuários e marca como ausente após inatividade
   */
  function setupPresenceMonitor() {
    // Verifica a cada 30 segundos por usuários inativos
    const INACTIVE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutos = AWAY
    const OFFLINE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutos = OFFLINE
    
    setInterval(() => {
      const now = Date.now();
      const usersToUpdate = [];
      
      // Verifica todos os status de presença
      for (const [userId, presence] of userPresenceStatus.entries()) {
        const inactiveTime = now - presence.lastActivity;
        
        // Se online mas inativo por mais de 5 min, marca como AWAY
        if (
          presence.status === PresenceStatus.ONLINE && 
          inactiveTime > INACTIVE_THRESHOLD_MS
        ) {
          updateUserPresence(userId, PresenceStatus.AWAY);
          usersToUpdate.push(userId);
        }
        // Se away mas inativo por mais de 15 min, marca como OFFLINE
        else if (
          presence.status === PresenceStatus.AWAY && 
          inactiveTime > OFFLINE_THRESHOLD_MS
        ) {
          updateUserPresence(userId, PresenceStatus.OFFLINE);
          usersToUpdate.push(userId);
        }
      }
      
      // Transmite atualizações
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
      const conversationsToUpdate = new Set();
      
      // Verifica todos os status de digitação
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
        
        // Remove mapas vazios
        if (typingUsers.size === 0) {
          activeTypingUsers.delete(conversationId);
        }
      }
      
      // Transmite atualizações de digitação para conversas afetadas
      conversationsToUpdate.forEach(conversationId => {
        broadcastTypingStatus(conversationId);
      });
    }, 1000);
  }
  
  /**
   * Atualiza o status de presença de um usuário
   */
  function updateUserPresence(userId, status, displayName) {
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
  function broadcastPresenceUpdate(userId) {
    const presence = userPresenceStatus.get(userId);
    if (!presence) return;
    
    sendEventToAll('presence_update', {
      userId,
      status: presence.status,
      displayName: presence.displayName,
      lastActivity: presence.lastActivity
    });
  }
  
  /**
   * Transmite status de digitação para todos os clientes sobre uma conversa
   */
  function broadcastTypingStatus(conversationId) {
    const typingUsers = activeTypingUsers.get(conversationId);
    const typingList = typingUsers 
      ? Array.from(typingUsers.values())
      : [];
    
    sendEventToAll('typing_status', {
      conversationId,
      typingUsers: typingList
    });
  }
  
  /**
   * Transmite atualização de status de entrega de mensagens
   */
  function broadcastMessageStatus(messageId) {
    const status = messageDeliveryStatus.get(messageId);
    if (!status) return;
    
    sendEventToAll('message_status', {
      messageId,
      status: status.status,
      updatedAt: status.updatedAt,
      receivedBy: Array.from(status.receivedBy),
      readBy: Array.from(status.readBy)
    });
  }
  
  /**
   * Manipula eventos enviados pelo cliente
   */
  function handleClientEvent(event, userId, socket) {
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
        socket.emit('echo', event.data);
    }
  }
  
  /**
   * Manipula evento de início de digitação
   */
  function handleTypingStart(userId, conversationId, displayName) {
    if (!conversationId || !userId) return;
    
    // Obtém ou cria mapa de usuários digitando para esta conversa
    const typingUsers = activeTypingUsers.get(conversationId) || new Map();
    
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
  function handleTypingStop(userId, conversationId) {
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
  function handleMessageDelivered(userId, messageId) {
    if (!messageId || !userId) return;
    
    // Obtém ou cria status de entrega para esta mensagem
    const status = messageDeliveryStatus.get(messageId) || {
      status: MessageDeliveryStatus.SENT,
      updatedAt: Date.now(),
      receivedBy: new Set(),
      readBy: new Set()
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
  function handleMessageRead(userId, messageId) {
    if (!messageId || !userId) return;
    
    // Obtém ou cria status de entrega para esta mensagem
    const status = messageDeliveryStatus.get(messageId) || {
      status: MessageDeliveryStatus.SENT,
      updatedAt: Date.now(),
      receivedBy: new Set(),
      readBy: new Set()
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
  function handlePresenceUpdate(userId, status, displayName) {
    if (!userId || !status) return;
    
    // Atualiza status de presença
    updateUserPresence(userId, status, displayName);
    
    // Transmite atualização
    broadcastPresenceUpdate(userId);
  }

  // Exporta API do socket para uso por outros módulos
  return {
    io,
    emitEvent: (userId, event) => sendEventToUser(userId, event.type, event.data),
    broadcastEvent: (event) => sendEventToAll(event.type, event.data)
  };
}