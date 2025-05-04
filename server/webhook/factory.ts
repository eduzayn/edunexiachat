/**
 * Factory para inicialização dos serviços de webhook
 * Este módulo cria e configura todos os componentes do sistema de webhooks,
 * garantindo a correta inicialização e interdependência entre os serviços.
 */

import { IStorage } from '../storage';
import { WebhookQueueService } from '../services/webhookQueue';
import { BaseChannelHandler } from '../channels/index';
import { WebhookHandlerService } from './handler';
import { WebhookStatsService } from './stats';
import { WebhookTester } from './tester';
import { Router } from 'express';
import { registerWebhookRoutes } from './routes';

// Interface para o resultado do factory
export interface WebhookServices {
  handlerService: WebhookHandlerService;
  statsService: WebhookStatsService;
  testerService: WebhookTester;
  router: Router;
}

/**
 * Factory para criar e configurar todos os serviços de webhook
 * @param storage Instância do storage do sistema
 * @param queueService Serviço de fila de webhooks
 * @param channelHandlers Mapa de handlers por tipo de canal
 * @param router Router Express para registro das rotas
 * @returns Objeto com os serviços configurados
 */
export function createWebhookServices(
  storage: IStorage,
  queueService: WebhookQueueService,
  channelHandlers: Map<string, BaseChannelHandler>,
  router: Router
): WebhookServices {
  // Criar serviço de handler
  const handlerService = new WebhookHandlerService(
    storage,
    queueService,
    channelHandlers
  );
  
  // Criar serviço de estatísticas
  const statsService = new WebhookStatsService(queueService);
  
  // Criar serviço de testes
  const testerService = new WebhookTester(handlerService);
  
  // Registrar rotas de API para webhooks
  registerWebhookRoutes(router, handlerService, statsService, testerService);
  
  return {
    handlerService,
    statsService,
    testerService,
    router
  };
}

export default createWebhookServices;