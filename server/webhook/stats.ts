/**
 * Serviço para estatísticas e monitoramento de webhooks
 * Este módulo fornece ferramentas para coletar, analisar e visualizar
 * métricas de desempenho do sistema de webhooks.
 */

import { db } from '../db';
import { webhookQueue } from '@shared/schema';
import { sql, and, eq, gte, lt, count } from 'drizzle-orm';
import { WebhookQueueService } from '../services/webhookQueue';

export class WebhookStatsService {
  private queueService: WebhookQueueService;
  
  constructor(queueService: WebhookQueueService) {
    this.queueService = queueService;
  }
  
  /**
   * Obtém estatísticas gerais do sistema de webhooks
   */
  async getOverallStats() {
    const processingStats = this.queueService.getProcessingStats();
    const queueStats = await this.queueService.getQueueStatsBySource();
    
    return {
      processing: processingStats,
      queue: queueStats
    };
  }
  
  /**
   * Obtém estatísticas detalhadas por tipo de fonte de webhook
   */
  async getStatsBySource() {
    return this.queueService.getQueueStatsBySource();
  }
  
  /**
   * Obtém estatísticas de tempos de processamento
   */
  async getPerformanceMetrics() {
    return this.queueService.getQueuePerformanceMetrics();
  }
  
  /**
   * Obtém estatísticas de webhooks por período (dia, semana, mês)
   */
  async getWebhookStatsByPeriod(
    period: 'day' | 'week' | 'month' = 'day'
  ): Promise<Array<{
    date: string;
    count: number;
    source: string;
    success: number;
    failed: number;
  }>> {
    const now = new Date();
    let startDate: Date;
    let interval: string;
    let dateFormat: string;
    
    // Configurar parâmetros conforme o período
    switch (period) {
      case 'day':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 1);
        interval = 'hour';
        dateFormat = 'YYYY-MM-DD HH24:00';
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        interval = 'day';
        dateFormat = 'YYYY-MM-DD';
        break;
      case 'month':
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        interval = 'day';
        dateFormat = 'YYYY-MM-DD';
        break;
      default:
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 1);
        interval = 'hour';
        dateFormat = 'YYYY-MM-DD HH24:00';
    }
    
    // Executar consulta para obter dados agregados
    const result = await db.execute(sql`
      SELECT 
        to_char(created_at, ${dateFormat}) as date,
        source,
        COUNT(*) as count,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM webhook_queue
      WHERE created_at >= ${startDate}
      GROUP BY to_char(created_at, ${dateFormat}), source
      ORDER BY date, source
    `);
    
    return result.rows.map(row => ({
      date: row.date,
      source: row.source,
      count: parseInt(row.count, 10),
      success: parseInt(row.success, 10),
      failed: parseInt(row.failed, 10)
    }));
  }
  
  /**
   * Obtém métricas avançadas de desempenho para análise
   */
  async getAdvancedMetrics(): Promise<{
    volumeByHour: Array<{ hour: number, count: number }>;
    avgProcessingTimeBySource: Array<{ source: string, avgTime: number }>;
    errorRateBySource: Array<{ source: string, errorRate: number }>;
  }> {
    // 1. Volume por hora do dia
    const volumeByHourResult = await db.execute(sql`
      SELECT 
        EXTRACT(HOUR FROM created_at) as hour,
        COUNT(*) as count
      FROM webhook_queue
      WHERE created_at >= NOW() - INTERVAL '7 days'
      GROUP BY EXTRACT(HOUR FROM created_at)
      ORDER BY hour
    `);
    
    // 2. Tempo médio de processamento por origem
    const avgTimeBySourceResult = await db.execute(sql`
      SELECT 
        source,
        AVG(processing_time_ms) as avg_time
      FROM webhook_queue
      WHERE 
        processing_time_ms IS NOT NULL AND
        created_at >= NOW() - INTERVAL '30 days'
      GROUP BY source
      ORDER BY avg_time DESC
    `);
    
    // 3. Taxa de erro por origem
    const errorRateBySourceResult = await db.execute(sql`
      SELECT 
        source,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::FLOAT / COUNT(*)::FLOAT as error_rate
      FROM webhook_queue
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY source
      HAVING COUNT(*) > 10
      ORDER BY error_rate DESC
    `);
    
    return {
      volumeByHour: volumeByHourResult.rows.map(row => ({
        hour: parseInt(row.hour, 10),
        count: parseInt(row.count, 10)
      })),
      avgProcessingTimeBySource: avgTimeBySourceResult.rows.map(row => ({
        source: row.source,
        avgTime: parseFloat(row.avg_time) || 0
      })),
      errorRateBySource: errorRateBySourceResult.rows.map(row => ({
        source: row.source,
        errorRate: parseFloat(row.error_rate) || 0
      }))
    };
  }
  
  /**
   * Obtém os webhooks mais recentes (para depuração/monitoramento)
   */
  async getRecentWebhooks(
    limit: number = 50,
    source?: string
  ) {
    let query = db.select()
      .from(webhookQueue)
      .orderBy(sql`created_at DESC`)
      .limit(limit);
    
    if (source) {
      query = query.where(eq(webhookQueue.source, source));
    }
    
    return query;
  }
  
  /**
   * Obtém webhooks com falha para análise
   */
  async getFailedWebhooks(
    limit: number = 50,
    source?: string
  ) {
    let query = db.select()
      .from(webhookQueue)
      .where(eq(webhookQueue.status, 'failed'))
      .orderBy(sql`created_at DESC`)
      .limit(limit);
    
    if (source) {
      query = query.where(eq(webhookQueue.source, source));
    }
    
    return query;
  }
}

export default WebhookStatsService;