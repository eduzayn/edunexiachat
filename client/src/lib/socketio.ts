import { io, Socket } from "socket.io-client";

// Enums para status de entrega de mensagens
export enum MessageDeliveryStatus {
  SENT = "sent",
  DELIVERED = "delivered",
  READ = "read"
}

// Enums para status de presença
export enum PresenceStatus {
  ONLINE = "online",
  AWAY = "away",
  OFFLINE = "offline"
}

// Interface para status de digitação
export interface TypingStatus {
  userId: number;
  conversationId: number;
  timestamp: number;
  displayName: string;
}

// Interface para status de presença
export interface PresenceInfo {
  userId: number;
  status: PresenceStatus;
  displayName: string;
  lastActivity: number;
}

// Interface para status de entrega de mensagens
export interface MessageStatus {
  messageId: number;
  status: MessageDeliveryStatus;
  updatedAt: number;
  receivedBy: number[];
  readBy: number[];
}

// Interface para notificações
export interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  priority: string;
  category: string;
  requiresAction: boolean;
  actionUrl?: string;
  userId?: number;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  metadata?: any;
  unreadCount?: number;
}

type SocketIOOptions = {
  userId: number | null;
  userName?: string;
  onMessage?: (event: any) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: any) => void;
  onTypingStatus?: (conversationId: number, typingUsers: TypingStatus[]) => void;
  onPresenceUpdate?: (presenceInfo: PresenceInfo) => void;
  onMessageStatus?: (status: MessageStatus) => void;
  onNotification?: (notification: Notification) => void;
};

// Tipo de evento para socket.io
export type SocketEvent = {
  type: string;
  data: any;
};

export class SocketIOClient {
  private socket: Socket | null = null;
  private options: SocketIOOptions;
  private autoReconnect: boolean = true;
  
  constructor(options: SocketIOOptions) {
    this.options = options;
  }
  
  connect(): void {
    if (this.socket?.connected) {
      console.log("Socket.IO already connected");
      return;
    }
    
    // Configurar o URL do Socket.IO (mesmo caminho do WebSocket anterior)
    const socketUrl = window.location.origin;
    
    // Opções de conexão
    const socketOptions = {
      path: '/ws',
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: Infinity,
      transports: ['websocket', 'polling'],
      autoConnect: true
    };
    
    // Criar conexão Socket.IO
    this.socket = io(socketUrl, socketOptions);
    
    // Configurar callbacks de eventos
    
    // Conectado
    this.socket.on('connect', () => {
      console.log("Socket.IO connected");
      
      // Autenticar a conexão com o ID do usuário
      if (this.options.userId) {
        this.socket!.emit('authenticate', {
          userId: this.options.userId,
          userName: this.options.userName || 'Anônimo'
        });
        
        // Enviar status de presença ao conectar
        this.updatePresence(PresenceStatus.ONLINE);
      }
      
      if (this.options.onOpen) {
        this.options.onOpen();
      }
    });
    
    // Desconectado
    this.socket.on('disconnect', () => {
      console.log("Socket.IO disconnected");
      
      if (this.options.onClose) {
        this.options.onClose();
      }
    });
    
    // Erro
    this.socket.on('connect_error', (error) => {
      console.error("Socket.IO connection error:", error);
      
      if (this.options.onError) {
        this.options.onError(error);
      }
    });
    
    // Handshake inicial
    this.socket.on('connected', (data) => {
      console.log("Socket.IO authenticated:", data);
      
      // Processar dados de presença iniciais
      if (data.presence && Array.isArray(data.presence)) {
        data.presence.forEach((presence: PresenceInfo) => {
          if (this.options.onPresenceUpdate) {
            this.options.onPresenceUpdate(presence);
          }
        });
      }
    });
    
    // Eventos específicos
    
    // Status de digitação
    this.socket.on('typing_status', (data) => {
      if (this.options.onTypingStatus && data.conversationId && Array.isArray(data.typingUsers)) {
        this.options.onTypingStatus(data.conversationId, data.typingUsers);
      }
    });
    
    // Atualizações de presença
    this.socket.on('presence_update', (data) => {
      if (this.options.onPresenceUpdate && data.userId && data.status) {
        this.options.onPresenceUpdate({
          userId: data.userId,
          status: data.status,
          displayName: data.displayName || 'Usuário',
          lastActivity: data.lastActivity || Date.now()
        });
      }
    });
    
    // Status de entrega de mensagens
    this.socket.on('message_status', (data) => {
      if (this.options.onMessageStatus && data.messageId && data.status) {
        this.options.onMessageStatus({
          messageId: data.messageId,
          status: data.status,
          updatedAt: data.updatedAt || Date.now(),
          receivedBy: data.receivedBy || [],
          readBy: data.readBy || []
        });
      }
    });
    
    // Notificações
    this.socket.on('notification', (data) => {
      console.log("Recebida notificação via Socket.IO:", data);
      if (this.options.onNotification && data) {
        this.options.onNotification(data);
      }
    });
    
    // Eventos personalizados do aplicativo (para compatibilidade com a API anterior)
    // Passando através do callback genérico onMessage
    this.socket.onAny((eventName, ...args) => {
      // Se for um evento conhecido específico, já foi tratado acima
      if (['connect', 'disconnect', 'connect_error', 'connected', 
           'typing_status', 'presence_update', 'message_status'].includes(eventName)) {
        return;
      }
      
      // Para outros eventos, construir objeto no formato anterior
      if (this.options.onMessage) {
        this.options.onMessage({
          type: eventName,
          data: args[0]
        });
      }
    });
  }
  
  disconnect(): void {
    if (this.socket) {
      this.autoReconnect = false;
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  send(data: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit('event', data);
    } else {
      console.warn("Socket.IO not connected, message not sent");
    }
  }
  
  /**
   * Notifica o servidor que o usuário começou a digitar em uma conversa
   */
  startTyping(conversationId: number, displayName?: string): void {
    if (!this.options.userId || !conversationId) return;
    
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing_start', {
        conversationId,
        displayName: displayName || 'Usuário'
      });
    }
  }
  
  /**
   * Notifica o servidor que o usuário parou de digitar em uma conversa
   */
  stopTyping(conversationId: number): void {
    if (!this.options.userId || !conversationId) return;
    
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing_stop', {
        conversationId
      });
    }
  }
  
  /**
   * Marca uma mensagem como entregue para este usuário
   */
  markMessageAsDelivered(messageId: number): void {
    if (!this.options.userId || !messageId) return;
    
    if (this.socket && this.socket.connected) {
      this.socket.emit('message_delivered', {
        messageId
      });
    }
  }
  
  /**
   * Marca uma mensagem como lida por este usuário
   */
  markMessageAsRead(messageId: number): void {
    if (!this.options.userId || !messageId) return;
    
    if (this.socket && this.socket.connected) {
      this.socket.emit('message_read', {
        messageId
      });
    }
  }
  
  /**
   * Atualiza o status de presença deste usuário
   */
  updatePresence(status: PresenceStatus, displayName?: string): void {
    if (!this.options.userId) return;
    
    if (this.socket && this.socket.connected) {
      this.socket.emit('presence_update', {
        status,
        displayName: displayName || this.options.userName || 'Usuário'
      });
    }
  }
  
  /**
   * Atualiza as opções da conexão Socket.IO
   */
  updateOptions(options: Partial<SocketIOOptions>): void {
    const prevUserId = this.options.userId;
    const prevUserName = this.options.userName;
    
    this.options = { ...this.options, ...options };
    
    // Se o ID do usuário ou nome mudou, autenticar novamente
    if ((options.userId !== undefined && options.userId !== prevUserId) || 
        (options.userName !== undefined && options.userName !== prevUserName)) {
      if (this.socket && this.socket.connected) {
        this.socket.emit('authenticate', {
          userId: this.options.userId,
          userName: this.options.userName || 'Anônimo'
        });
      }
    }
  }
  
  /**
   * Marca uma notificação como lida
   */
  markNotificationAsRead(notificationId: number): Promise<{ success: boolean, unreadCount: number }> {
    if (!this.options.userId || !notificationId) {
      return Promise.reject(new Error("Usuário não autenticado ou ID de notificação inválido"));
    }
    
    return new Promise((resolve, reject) => {
      fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Erro ao marcar notificação como lida: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        resolve(data);
      })
      .catch(error => {
        console.error('Erro ao marcar notificação como lida:', error);
        reject(error);
      });
    });
  }
  
  /**
   * Marca todas as notificações do usuário como lidas
   */
  markAllNotificationsAsRead(): Promise<{ success: boolean, unreadCount: number }> {
    if (!this.options.userId) {
      return Promise.reject(new Error("Usuário não autenticado"));
    }
    
    return new Promise((resolve, reject) => {
      fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Erro ao marcar todas notificações como lidas: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        resolve(data);
      })
      .catch(error => {
        console.error('Erro ao marcar todas notificações como lidas:', error);
        reject(error);
      });
    });
  }
  
  /**
   * Excluir uma notificação
   */
  deleteNotification(notificationId: number): Promise<{ success: boolean, unreadCount: number }> {
    if (!this.options.userId || !notificationId) {
      return Promise.reject(new Error("Usuário não autenticado ou ID de notificação inválido"));
    }
    
    return new Promise((resolve, reject) => {
      fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Erro ao excluir notificação: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        resolve(data);
      })
      .catch(error => {
        console.error('Erro ao excluir notificação:', error);
        reject(error);
      });
    });
  }
  
  /**
   * Emite um evento personalizado (para compatibilidade com a API anterior)
   */
  emit(eventType: string, data: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(eventType, data);
    }
  }
}