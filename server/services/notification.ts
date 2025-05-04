import { Server as SocketIOServer } from 'socket.io';
import { db } from '../db';
import { eq, desc, and, sql } from 'drizzle-orm';
import { notifications } from '@shared/schema';
import { log } from '../vite';

// Tipos de notificação
export enum NotificationType {
  SYSTEM = 'system',
  ALERT = 'alert',
  INFO = 'info',
  SUCCESS = 'success',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// Níveis de prioridade
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

// Categoria de notificação
export enum NotificationCategory {
  SECURITY = 'security',
  SYSTEM = 'system',
  CONVERSATION = 'conversation',
  WEBHOOK = 'webhook',
  USER = 'user',
  CHANNEL = 'channel',
  AUTOMATION = 'automation',
  PERFORMANCE = 'performance'
}

// Interface para dados de notificação
export interface NotificationData {
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  category: NotificationCategory;
  userId?: number;
  metadata?: any;
  requiresAction?: boolean;
  actionUrl?: string;
  expiresAt?: Date;
}

// Classe para o serviço de notificações
export class NotificationService {
  private io: SocketIOServer | null = null;
  private sendEventToUser: ((userId: number, eventType: string, data: any) => void) | null = null;
  private sendEventToAll: ((eventType: string, data: any) => void) | null = null;
  
  // Métricas e limites
  private notificationCounts: Map<NotificationCategory, number> = new Map();
  private lastNotificationTimes: Map<NotificationCategory, number> = new Map();
  private throttleRates: Map<NotificationCategory, number> = new Map();
  private maxNotificationsPerCategory: Map<NotificationCategory, number> = new Map();
  
  // Caminhos para templates personalizados
  private notificationTemplates: Map<string, string> = new Map();
  
  constructor() {
    // Configurar limites padrão por categoria (notificações por minuto)
    this.throttleRates.set(NotificationCategory.SECURITY, 10);
    this.throttleRates.set(NotificationCategory.SYSTEM, 20);
    this.throttleRates.set(NotificationCategory.CONVERSATION, 50);
    this.throttleRates.set(NotificationCategory.WEBHOOK, 30);
    this.throttleRates.set(NotificationCategory.USER, 30);
    this.throttleRates.set(NotificationCategory.CHANNEL, 20);
    this.throttleRates.set(NotificationCategory.AUTOMATION, 20);
    this.throttleRates.set(NotificationCategory.PERFORMANCE, 10);
    
    // Limite máximo de notificações por categoria
    this.maxNotificationsPerCategory.set(NotificationCategory.SECURITY, 100);
    this.maxNotificationsPerCategory.set(NotificationCategory.SYSTEM, 200);
    this.maxNotificationsPerCategory.set(NotificationCategory.CONVERSATION, 500);
    this.maxNotificationsPerCategory.set(NotificationCategory.WEBHOOK, 300);
    this.maxNotificationsPerCategory.set(NotificationCategory.USER, 200);
    this.maxNotificationsPerCategory.set(NotificationCategory.CHANNEL, 150);
    this.maxNotificationsPerCategory.set(NotificationCategory.AUTOMATION, 150);
    this.maxNotificationsPerCategory.set(NotificationCategory.PERFORMANCE, 100);
    
    // Inicializar contadores
    Object.values(NotificationCategory).forEach(category => {
      this.notificationCounts.set(category as NotificationCategory, 0);
      this.lastNotificationTimes.set(category as NotificationCategory, 0);
    });
    
    // Agendar limpeza automática de notificações expiradas
    setInterval(() => this.cleanupExpiredNotifications(), 60 * 60 * 1000); // A cada hora
    
    log('Serviço de notificações avançado inicializado', 'notification');
  }
  
  // Inicializar com socket.io
  initialize(
    io: SocketIOServer, 
    sendEventToUser: (userId: number, eventType: string, data: any) => void,
    sendEventToAll: (eventType: string, data: any) => void
  ): void {
    this.io = io;
    this.sendEventToUser = sendEventToUser;
    this.sendEventToAll = sendEventToAll;
    
    log('Serviço de notificações conectado ao Socket.IO', 'notification');
  }
  
  // Criar uma nova notificação
  async createNotification(data: NotificationData): Promise<number | null> {
    try {
      // Verificar limite e throttling
      if (!this.checkThrottling(data.category)) {
        log(`Notificação throttled: ${data.category} - ${data.title}`, 'notification');
        return null;
      }
      
      // Determinar tempo de expiração padrão se não for fornecido
      if (!data.expiresAt) {
        // Diferentes categorias podem ter durações padrão diferentes
        const expirationHours = this.getDefaultExpirationHours(data.category, data.priority);
        data.expiresAt = new Date(Date.now() + expirationHours * 60 * 60 * 1000);
      }
      
      // Verificar se é uma notificação duplicada recente
      const isDuplicate = await this.isDuplicateNotification(data);
      if (isDuplicate) {
        log(`Notificação duplicada ignorada: ${data.title}`, 'notification');
        return null;
      }
      
      // Inserir no banco de dados
      const [notification] = await db
        .insert(notifications)
        .values({
          title: data.title,
          message: data.message,
          type: data.type,
          priority: data.priority,
          category: data.category,
          userId: data.userId,
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
          requiresAction: data.requiresAction || false,
          actionUrl: data.actionUrl,
          expiresAt: data.expiresAt,
          readAt: null,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();
        
      if (!notification) {
        log(`Erro ao criar notificação: ${data.title}`, 'notification');
        return null;
      }
      
      // Atualizar contadores
      this.updateNotificationMetrics(data.category);
      
      // Enviar notificação via WebSocket se configurado
      this.sendNotificationViaSocket(notification);
      
      return notification.id;
    } catch (error) {
      console.error(`Erro ao criar notificação:`, error);
      return null;
    }
  }
  
  // Buscar notificações para um usuário específico
  async getUserNotifications(
    userId: number, 
    limit: number = 50, 
    offset: number = 0, 
    includeRead: boolean = false
  ): Promise<any[]> {
    try {
      let query = db
        .select()
        .from(notifications)
        .where(
          includeRead 
            ? eq(notifications.userId, userId)
            : and(
                eq(notifications.userId, userId),
                sql`${notifications.readAt} IS NULL`
              )
        )
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);
        
      return await query;
    } catch (error) {
      console.error('Erro ao buscar notificações do usuário:', error);
      return [];
    }
  }
  
  // Buscar notificações do sistema (sem userId)
  async getSystemNotifications(
    limit: number = 50, 
    offset: number = 0,
    category?: NotificationCategory
  ): Promise<any[]> {
    try {
      let query = db
        .select()
        .from(notifications);
        
      if (category) {
        query = query.where(
          and(
            sql`${notifications.userId} IS NULL`,
            eq(notifications.category, category)
          )
        );
      } else {
        query = query.where(sql`${notifications.userId} IS NULL`);
      }
      
      query = query
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);
        
      return await query;
    } catch (error) {
      console.error('Erro ao buscar notificações do sistema:', error);
      return [];
    }
  }
  
  // Marcar notificação como lida
  async markAsRead(notificationId: number, userId?: number): Promise<boolean> {
    try {
      let query = db
        .update(notifications)
        .set({
          readAt: new Date(),
          updatedAt: new Date()
        });
        
      if (userId) {
        // Se userId for fornecido, verificamos permissão (usuário só pode marcar suas próprias notificações como lidas)
        query = query.where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userId)
          )
        );
      } else {
        // Sem userId, apenas com ID (para uso administrativo/sistema)
        query = query.where(eq(notifications.id, notificationId));
      }
      
      await query;
      return true;
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      return false;
    }
  }
  
  // Marcar todas as notificações de um usuário como lidas
  async markAllAsRead(userId: number): Promise<boolean> {
    try {
      await db
        .update(notifications)
        .set({
          readAt: new Date(),
          updatedAt: new Date()
        })
        .where(
          and(
            eq(notifications.userId, userId),
            sql`${notifications.readAt} IS NULL`
          )
        );
        
      return true;
    } catch (error) {
      console.error('Erro ao marcar todas notificações como lidas:', error);
      return false;
    }
  }
  
  // Excluir notificação
  async deleteNotification(notificationId: number, userId?: number): Promise<boolean> {
    try {
      let query = db.delete(notifications);
        
      if (userId) {
        // Se userId for fornecido, verificamos permissão (usuário só pode excluir suas próprias notificações)
        query = query.where(
          and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userId)
          )
        );
      } else {
        // Sem userId, apenas com ID (para uso administrativo/sistema)
        query = query.where(eq(notifications.id, notificationId));
      }
      
      await query;
      return true;
    } catch (error) {
      console.error('Erro ao excluir notificação:', error);
      return false;
    }
  }
  
  // Criar notificação de sistema
  async createSystemNotification(
    title: string,
    message: string,
    type: NotificationType = NotificationType.INFO,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    category: NotificationCategory = NotificationCategory.SYSTEM,
    metadata?: any,
    requiresAction: boolean = false,
    actionUrl?: string,
    expiresAt?: Date
  ): Promise<number | null> {
    return this.createNotification({
      title,
      message,
      type,
      priority,
      category,
      metadata,
      requiresAction,
      actionUrl,
      expiresAt
    });
  }
  
  // Criar notificação para um usuário específico
  async createUserNotification(
    userId: number,
    title: string,
    message: string,
    type: NotificationType = NotificationType.INFO,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    category: NotificationCategory = NotificationCategory.USER,
    metadata?: any,
    requiresAction: boolean = false,
    actionUrl?: string,
    expiresAt?: Date
  ): Promise<number | null> {
    return this.createNotification({
      userId,
      title,
      message,
      type,
      priority,
      category,
      metadata,
      requiresAction,
      actionUrl,
      expiresAt
    });
  }
  
  // Criar notificação de erro crítico (alta visibilidade)
  async createCriticalErrorNotification(
    title: string,
    message: string,
    category: NotificationCategory = NotificationCategory.SYSTEM,
    metadata?: any,
    actionUrl?: string
  ): Promise<number | null> {
    // Para erros críticos, configuramos prioridade alta, expiração longa e requer ação
    return this.createNotification({
      title: `🚨 ${title}`,
      message,
      type: NotificationType.CRITICAL,
      priority: NotificationPriority.URGENT,
      category,
      metadata,
      requiresAction: true,
      actionUrl,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 horas
    });
  }
  
  // Criar notificação de segurança 
  async createSecurityNotification(
    title: string,
    message: string,
    priority: NotificationPriority = NotificationPriority.HIGH,
    metadata?: any,
    requiresAction: boolean = true,
    actionUrl?: string
  ): Promise<number | null> {
    return this.createNotification({
      title: `🔒 ${title}`,
      message,
      type: NotificationType.ALERT,
      priority,
      category: NotificationCategory.SECURITY,
      metadata,
      requiresAction,
      actionUrl,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) // 48 horas
    });
  }
  
  // Quantidade de notificações não lidas para um usuário
  async getUnreadCount(userId: number): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, userId),
            sql`${notifications.readAt} IS NULL`
          )
        );
        
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Erro ao contar notificações não lidas:', error);
      return 0;
    }
  }
  
  // Excluir notificações expiradas
  private async cleanupExpiredNotifications(): Promise<void> {
    try {
      const now = new Date();
      const result = await db
        .delete(notifications)
        .where(sql`${notifications.expiresAt} < ${now}`)
        .returning({ deletedId: notifications.id });
        
      const count = result.length;
      if (count > 0) {
        log(`Limpeza automática: ${count} notificações expiradas removidas`, 'notification');
      }
    } catch (error) {
      console.error('Erro ao limpar notificações expiradas:', error);
    }
  }
  
  // Enviar notificação via WebSocket
  private async sendNotificationViaSocket(notification: any): Promise<void> {
    if (!this.io || !this.sendEventToUser || !this.sendEventToAll) {
      log('Socket.IO não configurado para envio de notificações', 'notification');
      return;
    }
    
    const eventData = {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      priority: notification.priority,
      category: notification.category,
      requiresAction: notification.requiresAction,
      actionUrl: notification.actionUrl,
      createdAt: notification.createdAt
    };
    
    try {
      // Se tiver userId, enviar apenas para esse usuário
      if (notification.userId) {
        // Obter contagem atualizada de notificações não lidas para este usuário
        const unreadCount = await this.getUnreadCount(notification.userId);
        
        // Adicionar contador ao evento
        const eventWithCount = {
          ...eventData,
          unreadCount
        };
        
        // Enviar para o usuário específico
        this.sendEventToUser(notification.userId, 'notification', eventWithCount);
        log(`Notificação enviada para o usuário ${notification.userId}`, 'notification');
      } else {
        // Notificação do sistema, enviar para todos os usuários conectados
        this.sendEventToAll('notification', eventData);
        log('Notificação do sistema enviada para todos os usuários', 'notification');
      }
    } catch (error) {
      console.error('Erro ao enviar notificação via Socket.IO:', error);
    }
  }
  
  // Verificar se a notificação é duplicata recente (30 minutos)
  private async isDuplicateNotification(data: NotificationData): Promise<boolean> {
    try {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
      
      const query = db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.title, data.title),
            eq(notifications.category, data.category),
            eq(notifications.type, data.type),
            sql`${notifications.createdAt} > ${thirtyMinutesAgo}`
          )
        )
        .limit(1);
        
      if (data.userId) {
        query.where(eq(notifications.userId, data.userId));
      } else {
        query.where(sql`${notifications.userId} IS NULL`);
      }
      
      const result = await query;
      return result.length > 0;
    } catch (error) {
      console.error('Erro ao verificar duplicidade de notificação:', error);
      return false;
    }
  }
  
  // Gerenciar limites (throttling) de notificações por categoria
  private checkThrottling(category: NotificationCategory): boolean {
    const now = Date.now();
    const lastTime = this.lastNotificationTimes.get(category) || 0;
    const count = this.notificationCounts.get(category) || 0;
    const throttleRate = this.throttleRates.get(category) || 10;
    const maxCount = this.maxNotificationsPerCategory.get(category) || 100;
    
    // Verificar se excedeu o número máximo
    if (count >= maxCount) {
      return false;
    }
    
    // Reset do contador se passou mais de 60 segundos
    if (now - lastTime > 60000) {
      this.notificationCounts.set(category, 0);
      this.lastNotificationTimes.set(category, now);
      return true;
    }
    
    // Verificar se excedeu a taxa por minuto
    if (count >= throttleRate) {
      return false;
    }
    
    return true;
  }
  
  // Atualizar métricas de notificação após criação
  private updateNotificationMetrics(category: NotificationCategory): void {
    const count = this.notificationCounts.get(category) || 0;
    this.notificationCounts.set(category, count + 1);
    this.lastNotificationTimes.set(category, Date.now());
  }
  
  // Determinar tempo de expiração padrão por categoria/prioridade
  private getDefaultExpirationHours(category: NotificationCategory, priority: NotificationPriority): number {
    // Matriz de tempos de expiração padrão (em horas) para cada categoria e prioridade
    const expirationHours: Record<NotificationCategory, Record<NotificationPriority, number>> = {
      [NotificationCategory.SECURITY]: {
        [NotificationPriority.LOW]: 72,
        [NotificationPriority.MEDIUM]: 72,
        [NotificationPriority.HIGH]: 96,
        [NotificationPriority.URGENT]: 168
      },
      [NotificationCategory.SYSTEM]: {
        [NotificationPriority.LOW]: 24,
        [NotificationPriority.MEDIUM]: 48,
        [NotificationPriority.HIGH]: 72,
        [NotificationPriority.URGENT]: 96
      },
      [NotificationCategory.CONVERSATION]: {
        [NotificationPriority.LOW]: 24,
        [NotificationPriority.MEDIUM]: 48,
        [NotificationPriority.HIGH]: 72,
        [NotificationPriority.URGENT]: 72
      },
      [NotificationCategory.WEBHOOK]: {
        [NotificationPriority.LOW]: 24,
        [NotificationPriority.MEDIUM]: 48,
        [NotificationPriority.HIGH]: 72,
        [NotificationPriority.URGENT]: 72
      },
      [NotificationCategory.USER]: {
        [NotificationPriority.LOW]: 24,
        [NotificationPriority.MEDIUM]: 48,
        [NotificationPriority.HIGH]: 72,
        [NotificationPriority.URGENT]: 72
      },
      [NotificationCategory.CHANNEL]: {
        [NotificationPriority.LOW]: 24,
        [NotificationPriority.MEDIUM]: 48,
        [NotificationPriority.HIGH]: 72,
        [NotificationPriority.URGENT]: 72
      },
      [NotificationCategory.AUTOMATION]: {
        [NotificationPriority.LOW]: 24,
        [NotificationPriority.MEDIUM]: 48,
        [NotificationPriority.HIGH]: 72,
        [NotificationPriority.URGENT]: 72
      },
      [NotificationCategory.PERFORMANCE]: {
        [NotificationPriority.LOW]: 24,
        [NotificationPriority.MEDIUM]: 48,
        [NotificationPriority.HIGH]: 72,
        [NotificationPriority.URGENT]: 72
      }
    };
    
    return expirationHours[category]?.[priority] || 48; // 48 horas como valor padrão
  }
}

// Singleton instance
export const notificationService = new NotificationService();