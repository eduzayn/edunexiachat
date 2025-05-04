/**
 * Serviço para processamento assíncrono de webhooks
 * Este serviço gerencia a fila de webhooks, permitindo que sejam processados
 * de forma confiável e assíncrona, com suporte a retentativas em caso de falha.
 */

import { db } from '../db';
import { storage } from '../storage';
import { eq, and, lt, lte, sql, desc, asc } from 'drizzle-orm';
import { webhookQueue, InsertWebhookQueueItem, WebhookQueueItem } from '@shared/schema';
import EventEmitter from 'events';

// Registro de handlers global que será preenchido em runtime
const globalHandlerRegistry: Record<string, any> = {};

// Handlers especiais para fontes compostas
const metaWebhookHandler = (data: any) => {
  // Determinar se é do Instagram ou Messenger com base no payload
  if (data.object === 'instagram') {
    return globalHandlerRegistry['instagram']?.handleWebhook(data);
  } else if (data.object === 'page') {
    return globalHandlerRegistry['messenger']?.handleWebhook(data);
  }
  throw new Error(`Tipo de webhook Meta desconhecido: ${data.object}`);
};

// Registrar handlers especiais
globalHandlerRegistry['meta'] = { handleWebhook: metaWebhookHandler };

/**
 * Função para registrar um handler na fila de webhooks
 * Esta função é chamada em server/routes.ts quando os handlers são inicializados
 */
export function registerWebhookHandler(source: string, handler: any): void {
  globalHandlerRegistry[source] = handler;
  console.log(`Handler para fonte '${source}' registrado na fila de webhooks`);
  
  // Para o Twilio, registrar também o SMS
  if (source === 'twilio') {
    globalHandlerRegistry['twilio-sms'] = handler;
  }
}

// Configurações para retentativas com backoff exponencial
const retryDelay = {
  initial: 30, // 30 segundos
  factor: 2,   // dobra a cada tentativa
  maxDelay: 3600, // máximo de 1 hora
  maxAttempts: 5 // máximo de 5 tentativas
};

export class WebhookQueueService extends EventEmitter {
  private isProcessing: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private processingStats = {
    totalProcessed: 0,
    successCount: 0,
    failureCount: 0,
    startTime: Date.now(),
    lastProcessedTime: 0,
    avgProcessingTime: 0,
    criticalErrors: 0
  };
  
  constructor() {
    super();
    // Configurar os eventos do serviço de webhook
    this.on('webhook_processed', this.handleWebhookProcessed.bind(this));
    this.on('webhook_failed', this.handleWebhookFailed.bind(this));
    this.on('critical_error', this.handleCriticalError.bind(this));
  }
  
  /**
   * Retorna o status atual do processamento
   */
  getProcessingStatus(): boolean {
    return this.isProcessing;
  }
  
  /**
   * Retorna estatísticas de processamento
   */
  getProcessingStats() {
    return {
      ...this.processingStats,
      uptime: Math.floor((Date.now() - this.processingStats.startTime) / 1000)
    };
  }
  
  /**
   * Manipulador de evento para webhooks processados com sucesso
   */
  private handleWebhookProcessed(data: { id: number, source: string, processingTime: number }) {
    this.processingStats.totalProcessed++;
    this.processingStats.successCount++;
    this.processingStats.lastProcessedTime = Date.now();
    
    // Recalcular média de tempo de processamento
    const totalProcessed = this.processingStats.successCount + this.processingStats.failureCount;
    this.processingStats.avgProcessingTime = 
      (this.processingStats.avgProcessingTime * (totalProcessed - 1) + data.processingTime) / totalProcessed;
  }
  
  /**
   * Manipulador de evento para webhooks com falha
   */
  private handleWebhookFailed(data: { id: number, source: string, error: string, attempts: number }) {
    this.processingStats.totalProcessed++;
    this.processingStats.failureCount++;
    
    if (data.attempts >= retryDelay.maxAttempts) {
      console.error(`Webhook ${data.id} falhou permanentemente após ${data.attempts} tentativas: ${data.error}`);
    }
  }
  
  /**
   * Manipulador para erros críticos
   */
  private handleCriticalError(error: any) {
    this.processingStats.criticalErrors++;
    console.error(`ERRO CRÍTICO NA FILA DE WEBHOOKS: ${error.message || 'Erro desconhecido'}`);
    
    // TODO: Implementar notificação para administradores
  }

  /**
   * Adiciona um webhook à fila para processamento assíncrono
   * @param source Fonte do webhook (ex: 'twilio', 'zapapi', etc)
   * @param payload Conteúdo do webhook
   * @param options Opções extras para o webhook
   */
  async enqueueWebhook(
    source: string, 
    payload: any, 
    options: {
      channelId?: number, 
      priority?: number, 
      tags?: string[], 
      batchId?: string,
      processAfter?: Date
    } = {}
  ): Promise<WebhookQueueItem> {
    try {
      // Verificar se o source é válido
      if (!globalHandlerRegistry[source]) {
        console.warn(`Tentativa de enfileirar webhook com fonte desconhecida: ${source}`);
      }

      // Determinar a prioridade padrão com base no tipo de fonte
      let defaultPriority = 5; // Prioridade média por padrão
      
      // Prioridades específicas para cada fonte (menor número = maior prioridade)
      const sourcePriorities: Record<string, number> = {
        'twilio': 2, // Mensagens do WhatsApp são prioritárias
        'twilio-sms': 3,
        'zapapi': 2,
        'whatsapp-business': 2,
        'messenger': 4,
        'instagram': 4,
        'telegram': 3,
        'sendgrid': 6, // Email tem prioridade menor
        'asaas': 7, // Webhooks de pagamento são menos urgentes
        'slack': 5,
        'discord': 5,
        'test': 10 // Webhooks de teste têm a menor prioridade
      };
      
      if (sourcePriorities[source]) {
        defaultPriority = sourcePriorities[source];
      }

      // Preparar payload para armazenamento como JSON
      const queueItem: InsertWebhookQueueItem = {
        source,
        channelId: options.channelId || null,
        payload,
        processAfter: options.processAfter || new Date(), // Processar imediatamente por padrão
        priority: options.priority !== undefined ? options.priority : defaultPriority,
        tags: options.tags || [],
        batchId: options.batchId || null
      };

      // Inserir na fila
      const result = await db.insert(webhookQueue).values(queueItem).returning();
      console.log(`Webhook de ${source} adicionado à fila com ID ${result[0].id}, prioridade ${queueItem.priority}`);
      return result[0];
    } catch (error) {
      console.error('Erro ao enfileirar webhook:', error);
      this.emit('critical_error', error);
      throw error;
    }
  }

  /**
   * Processa um item específico da fila
   */
  async processQueueItem(item: WebhookQueueItem): Promise<boolean> {
    const startTime = performance.now();
    let processingTimeMs = 0;
    
    try {
      // Marcar como em processamento
      await db.update(webhookQueue)
        .set({ 
          status: 'processing',
          updatedAt: new Date() 
        })
        .where(eq(webhookQueue.id, item.id));

      // Verificar se existe um handler para este tipo de webhook
      const handler = globalHandlerRegistry[item.source];
      if (!handler) {
        throw new Error(`Handler não encontrado para fonte: ${item.source}`);
      }

      // Processar o webhook
      await handler.handleWebhook(item.payload);

      // Calcular tempo de processamento
      processingTimeMs = Math.round(performance.now() - startTime);
      
      // Marcar como concluído
      await db.update(webhookQueue)
        .set({ 
          status: 'completed',
          completedAt: new Date(),
          updatedAt: new Date(),
          processingTimeMs
        })
        .where(eq(webhookQueue.id, item.id));

      console.log(`Processado com sucesso: webhook ${item.id} de ${item.source} em ${processingTimeMs}ms`);
      
      // Emitir evento de webhook processado com sucesso
      this.emit('webhook_processed', {
        id: item.id,
        source: item.source,
        processingTime: processingTimeMs
      });
      
      return true;
    } catch (error: any) {
      processingTimeMs = Math.round(performance.now() - startTime);
      console.error(`Erro ao processar webhook ${item.id} de ${item.source} após ${processingTimeMs}ms:`, error);

      // Calcular próxima tentativa com backoff exponencial
      const nextDelay = Math.min(
        retryDelay.initial * Math.pow(retryDelay.factor, item.attempts),
        retryDelay.maxDelay
      );
      
      const processAfter = new Date();
      processAfter.setSeconds(processAfter.getSeconds() + nextDelay);

      // Verificar se atingiu o limite de tentativas
      const newStatus = item.attempts >= retryDelay.maxAttempts ? 'failed' : 'pending';
      
      // Atualizar o item da fila
      await db.update(webhookQueue)
        .set({ 
          status: newStatus,
          attempts: item.attempts + 1,
          lastError: error.message || 'Erro desconhecido',
          processAfter,
          processingTimeMs,
          updatedAt: new Date() 
        })
        .where(eq(webhookQueue.id, item.id));
      
      // Emitir evento de falha no processamento
      this.emit('webhook_failed', {
        id: item.id,
        source: item.source,
        error: error.message || 'Erro desconhecido',
        attempts: item.attempts + 1
      });
      
      // Se falhou permanentemente, emitir evento crítico
      if (newStatus === 'failed') {
        this.emit('critical_error', {
          message: `Webhook ${item.id} falhou permanentemente após ${item.attempts + 1} tentativas`,
          source: item.source,
          error: error
        });
      }

      return false;
    }
  }

  /**
   * Obtém itens pendentes da fila para processamento, ordenados por prioridade
   * @param limit Limite de itens a serem retornados
   * @param options Opções adicionais de filtragem
   */
  async getPendingItems(
    limit = 10, 
    options: { 
      source?: string,
      tags?: string[],
      batchId?: string
    } = {}
  ): Promise<WebhookQueueItem[]> {
    const now = new Date();
    let query = db.select()
      .from(webhookQueue)
      .where(
        and(
          eq(webhookQueue.status, 'pending'),
          lte(webhookQueue.processAfter, now)
        )
      );
    
    // Filtrar por fonte, se especificada
    if (options.source) {
      query = query.where(eq(webhookQueue.source, options.source));
    }
    
    // Filtrar por batchId, se especificado
    if (options.batchId) {
      query = query.where(eq(webhookQueue.batchId, options.batchId));
    }
    
    // Ordenar primeiro por prioridade (menor número = maior prioridade) e depois por data de criação
    // Isso garante que webhooks mais prioritários sejam processados primeiro
    return query
      .orderBy(asc(webhookQueue.priority), asc(webhookQueue.createdAt))
      .limit(limit);
  }
  
  /**
   * Conta o número de itens pendentes na fila
   */
  async countPendingItems(source?: string): Promise<number> {
    const now = new Date();
    let query = db.select({ count: sql<number>`count(*)` })
      .from(webhookQueue)
      .where(
        and(
          eq(webhookQueue.status, 'pending'),
          lte(webhookQueue.processAfter, now)
        )
      );
    
    if (source) {
      query = query.where(eq(webhookQueue.source, source));
    }
    
    const result = await query;
    return result[0].count;
  }
  
  /**
   * Obtém os próximos webhooks pendentes para um canal específico
   */
  async getPendingItemsByChannel(channelId: number, limit = 5): Promise<WebhookQueueItem[]> {
    const now = new Date();
    return db.select()
      .from(webhookQueue)
      .where(
        and(
          eq(webhookQueue.status, 'pending'),
          eq(webhookQueue.channelId, channelId),
          lte(webhookQueue.processAfter, now)
        )
      )
      .orderBy(asc(webhookQueue.priority), asc(webhookQueue.createdAt))
      .limit(limit);
  }

  /**
   * Inicia o processador da fila que executa continuamente
   */
  startProcessor(intervalMs = 5000): void {
    if (this.processingInterval) {
      console.warn('Processador de fila já está em execução');
      return;
    }

    console.log('Iniciando processador de fila de webhooks...');
    
    this.processingInterval = setInterval(async () => {
      if (this.isProcessing) {
        return; // Evita processamento concorrente
      }

      this.isProcessing = true;
      try {
        // Buscar itens pendentes da fila
        const pendingItems = await this.getPendingItems();
        
        if (pendingItems.length > 0) {
          console.log(`Processando ${pendingItems.length} webhooks da fila...`);
          
          // Processar cada item da fila
          for (const item of pendingItems) {
            await this.processQueueItem(item);
          }
        }
      } catch (error) {
        console.error('Erro no processador de fila:', error);
      } finally {
        this.isProcessing = false;
      }
    }, intervalMs);
  }

  /**
   * Para o processador da fila
   */
  stopProcessor(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
      console.log('Processador de fila de webhooks parado');
    }
  }

  /**
   * Obtém estatísticas detalhadas da fila por fonte
   */
  async getQueueStatsBySource(): Promise<Array<{ 
    source: string, 
    pending: number, 
    processing: number, 
    completed: number, 
    failed: number,
    avgProcessingTimeMs: number | null
  }>> {
    try {
      // Fazer uma consulta única para obter todas as estatísticas agrupadas por fonte
      const result = await db.execute(sql`
        SELECT 
          source,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
          SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
          AVG(CASE WHEN processing_time_ms > 0 THEN processing_time_ms ELSE NULL END) as avg_processing_time_ms
        FROM webhook_queue
        GROUP BY source
        ORDER BY pending DESC, failed DESC
      `);
      
      return result.rows.map(row => ({
        source: row.source,
        pending: parseInt(row.pending, 10) || 0,
        processing: parseInt(row.processing, 10) || 0,
        completed: parseInt(row.completed, 10) || 0,
        failed: parseInt(row.failed, 10) || 0,
        avgProcessingTimeMs: row.avg_processing_time_ms ? parseFloat(row.avg_processing_time_ms) : null
      }));
    } catch (error) {
      console.error('Erro ao obter estatísticas da fila por fonte:', error);
      return [];
    }
  }
  
  /**
   * Obtém análise de performance da fila
   */
  async getQueuePerformanceMetrics(): Promise<{
    processingTimes: { source: string, avgTimeMs: number }[],
    throughput: { date: string, count: number }[],
    failureRate: { source: string, rate: number }[]
  }> {
    try {
      // 1. Tempo médio de processamento por fonte
      const processingTimesResult = await db.execute(sql`
        SELECT source, AVG(processing_time_ms) as avg_time_ms
        FROM webhook_queue
        WHERE processing_time_ms IS NOT NULL
        GROUP BY source
        ORDER BY avg_time_ms DESC
      `);
      
      // 2. Throughput diário (últimos 7 dias)
      const throughputResult = await db.execute(sql`
        SELECT 
          to_char(completed_at, 'YYYY-MM-DD') as date, 
          COUNT(*) as count
        FROM webhook_queue
        WHERE 
          status = 'completed' 
          AND completed_at >= NOW() - INTERVAL '7 days'
        GROUP BY to_char(completed_at, 'YYYY-MM-DD')
        ORDER BY date
      `);
      
      // 3. Taxa de falha por fonte
      const failureRateResult = await db.execute(sql`
        SELECT 
          source,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::FLOAT / 
          COUNT(*)::FLOAT as failure_rate
        FROM webhook_queue
        GROUP BY source
        HAVING COUNT(*) > 10
        ORDER BY failure_rate DESC
      `);
      
      return {
        processingTimes: processingTimesResult.rows.map(row => ({
          source: row.source,
          avgTimeMs: parseFloat(row.avg_time_ms) || 0
        })),
        throughput: throughputResult.rows.map(row => ({
          date: row.date,
          count: parseInt(row.count, 10) || 0
        })),
        failureRate: failureRateResult.rows.map(row => ({
          source: row.source,
          rate: parseFloat(row.failure_rate) || 0
        }))
      };
    } catch (error) {
      console.error('Erro ao obter métricas de performance da fila:', error);
      return {
        processingTimes: [],
        throughput: [],
        failureRate: []
      };
    }
  }
  
  /**
   * Repriorizção automática de filas com base na carga
   */
  async autoRebalanceQueue(): Promise<number> {
    try {
      // Aumentar a prioridade de itens pendentes há muito tempo
      const result = await db.execute(sql`
        UPDATE webhook_queue
        SET priority = GREATEST(1, priority - 1)
        WHERE 
          status = 'pending'
          AND created_at < NOW() - INTERVAL '1 hour'
          AND priority > 1
      `);
      
      // @ts-ignore - ignorar erro de typechecking aqui
      const count = result.rowCount || result.count || 0;
      
      if (count > 0) {
        console.log(`Rebalanceamento automático de fila: ${count} itens repriorizados`);
      }
      
      return Number(count);
    } catch (error) {
      console.error('Erro ao rebalancear automaticamente a fila:', error);
      return 0;
    }
  }
  
  /**
   * Obtém métricas de itens problemáticos
   */
  async getProblematicItems(limit = 10): Promise<WebhookQueueItem[]> {
    try {
      // Buscar webhooks com mais tentativas ou erros consistentes
      return db.select()
        .from(webhookQueue)
        .where(
          eq(webhookQueue.status, 'failed')
        )
        .orderBy(desc(webhookQueue.attempts), desc(webhookQueue.updatedAt))
        .limit(limit);
    } catch (error) {
      console.error('Erro ao obter itens problemáticos da fila:', error);
      return [];
    }
  }

  /**
   * Limpa entradas antigas e concluídas da fila (manutenção)
   * @param maxAgeInDays Idade máxima em dias para registros completados
   */
  async cleanupQueue(maxAgeInDays = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - maxAgeInDays);

    try {
      const result = await db.delete(webhookQueue)
        .where(
          and(
            eq(webhookQueue.status, 'completed'),
            sql`${webhookQueue.completedAt} < ${cutoffDate}`
          )
        );
  
      // Drizzle ORM às vezes retorna o resultado de maneiras diferentes
      // @ts-ignore - ignorar erro de typechecking aqui
      const count = result.rowCount || result.count || 0;
      
      if (count > 0) {
        console.log(`Limpeza de fila: ${count} webhooks antigos removidos`);
      }
      
      return Number(count);
    } catch (error) {
      console.error('Erro ao limpar registros antigos da fila:', error);
      return 0;
    }
  }
}

// Instância global do serviço
export const webhookQueueService = new WebhookQueueService();