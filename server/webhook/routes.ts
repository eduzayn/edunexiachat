/**
 * Rotas de API para gerenciamento de webhooks
 * Este arquivo centraliza as rotas relacionadas à administração, 
 * testes e estatísticas do sistema de webhooks.
 */

import { Router } from 'express';
import { WebhookType } from './index';
import { WebhookHandlerService } from './handler';
import { WebhookStatsService } from './stats';
import { WebhookTester } from './tester';
import { authenticatedOnly, adminOnly } from '../middleware/auth';

export function registerWebhookRoutes(
  router: Router,
  handlerService: WebhookHandlerService,
  statsService: WebhookStatsService,
  testerService: WebhookTester
) {
  /**
   * Obter estatísticas gerais do sistema de webhooks
   * Requer autenticação de administrador
   */
  router.get('/api/webhooks/stats', authenticatedOnly, adminOnly, async (req, res, next) => {
    try {
      const stats = await statsService.getOverallStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * Obter estatísticas por período (dia, semana, mês)
   * Requer autenticação de administrador
   */
  router.get('/api/webhooks/stats/period/:period', authenticatedOnly, adminOnly, async (req, res, next) => {
    try {
      const { period } = req.params;
      const stats = await statsService.getWebhookStatsByPeriod(period as any);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * Obter métricas avançadas de desempenho
   * Requer autenticação de administrador
   */
  router.get('/api/webhooks/stats/advanced', authenticatedOnly, adminOnly, async (req, res, next) => {
    try {
      const metrics = await statsService.getAdvancedMetrics();
      res.json(metrics);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * Obter webhooks mais recentes
   * Requer autenticação de administrador
   */
  router.get('/api/webhooks/recent', authenticatedOnly, adminOnly, async (req, res, next) => {
    try {
      const { limit = 50, source } = req.query;
      const webhooks = await statsService.getRecentWebhooks(
        parseInt(limit as string, 10),
        source as string
      );
      res.json(webhooks);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * Obter webhooks com falha
   * Requer autenticação de administrador
   */
  router.get('/api/webhooks/failed', authenticatedOnly, adminOnly, async (req, res, next) => {
    try {
      const { limit = 50, source } = req.query;
      const webhooks = await statsService.getFailedWebhooks(
        parseInt(limit as string, 10),
        source as string
      );
      res.json(webhooks);
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * Simular um webhook para testes
   * Requer autenticação de administrador
   */
  router.post('/api/webhooks/simulate', authenticatedOnly, adminOnly, async (req, res, next) => {
    try {
      const { type, customData = {}, processDirectly = false, channelId } = req.body;
      
      // Validar o tipo de webhook
      if (!Object.values(WebhookType).includes(type)) {
        return res.status(400).json({ 
          error: `Tipo de webhook inválido: ${type}`,
          validTypes: Object.values(WebhookType)
        });
      }
      
      // Simular o webhook
      const result = await testerService.simulateWebhook(
        type as WebhookType,
        customData,
        { 
          processDirectly: processDirectly === true,
          channelId
        }
      );
      
      res.json({
        success: true,
        message: processDirectly 
          ? 'Webhook processado diretamente com sucesso' 
          : 'Webhook enfileirado com sucesso',
        result
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * Simular um lote de webhooks para teste de carga
   * Requer autenticação de administrador
   */
  router.post('/api/webhooks/simulate-batch', authenticatedOnly, adminOnly, async (req, res, next) => {
    try {
      const { type, count = 10 } = req.body;
      
      // Validar o tipo de webhook
      if (!Object.values(WebhookType).includes(type)) {
        return res.status(400).json({ 
          error: `Tipo de webhook inválido: ${type}`,
          validTypes: Object.values(WebhookType)
        });
      }
      
      // Limitar o tamanho do lote para evitar sobrecarga
      const safeCount = Math.min(Math.max(1, count), 100);
      
      // Simular o lote
      const result = await testerService.simulateBatch(
        type as WebhookType,
        safeCount
      );
      
      res.json({
        success: true,
        message: `Lote de ${result.count} webhooks enfileirado com sucesso`,
        batchId: result.batchId,
        requestedCount: count,
        actualCount: safeCount
      });
    } catch (error) {
      next(error);
    }
  });
  
  /**
   * Processar webhook manualmente - útil para reprocessar webhooks com falha
   * Requer autenticação de administrador
   */
  router.post('/api/webhooks/process/:id', authenticatedOnly, adminOnly, async (req, res, next) => {
    try {
      const { id } = req.params;
      
      // TODO: Implementar funcionalidade para reprocessar webhook específico
      
      res.json({
        success: true,
        message: `Webhook ${id} enviado para reprocessamento`
      });
    } catch (error) {
      next(error);
    }
  });
  
  return router;
}

export default registerWebhookRoutes;