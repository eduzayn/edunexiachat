/**
 * Arquivo de integração dos serviços do sistema
 * Centraliza a configuração e inicialização dos módulos
 */

import { Router } from 'express';
import { storage } from '../storage';
import { log } from '../vite';

// Importação dos serviços
import { getAIServicesStatus } from './ai';
import { AutomationService } from './automation';
import { automationHandler } from './automation/handler';
import registerAutomationRoutes from './automation/routes';
import { webhookQueueService } from './webhookQueue';
import { notificationService } from './notifications';
import { scheduleAutomations } from './scheduler';
import createLogger from '../utils/logger';

// Configuração de logger
const integrationLogger = createLogger('integration');

/**
 * Inicializa e configura todos os serviços do sistema
 */
export async function initializeServices(router: Router): Promise<void> {
  try {
    // 1. Inicializar o serviço de automação
    const automationService = new AutomationService(storage);
    automationHandler.setService(automationService);
    integrationLogger.info('Serviço de automação inicializado');
    
    // 2. Registrar rotas de automação
    registerAutomationRoutes(router);
    integrationLogger.info('Rotas de automação registradas');
    
    // 3. Verificar status dos serviços de IA
    try {
      const aiStatus = await getAIServicesStatus();
      const availableProviders = Object.entries(aiStatus)
        .filter(([_, status]) => status.available)
        .map(([provider]) => provider);
      
      if (availableProviders.length > 0) {
        integrationLogger.info(`Serviços de IA disponíveis: ${availableProviders.join(', ')}`);
        log(`Serviços de IA disponíveis: ${availableProviders.join(', ')}`, 'ai');
      } else {
        integrationLogger.warn('Nenhum serviço de IA está disponível');
        log('Nenhum serviço de IA está disponível. Verifique as configurações de API.', 'ai');
      }
    } catch (error) {
      integrationLogger.error('Erro ao verificar status dos serviços de IA', { error });
    }
    
    // 4. Configurar verificação periódica de automações agendadas
    scheduleAutomations(async () => {
      try {
        log('Verificando automações agendadas...', 'scheduler');
        const executedCount = await automationHandler.checkScheduledAutomations();
        if (executedCount > 0) {
          log(`${executedCount} automações agendadas executadas`, 'scheduler');
        } else {
          log('Nenhuma automação agendada ativa encontrada', 'scheduler');
        }
      } catch (error) {
        integrationLogger.error('Erro ao verificar automações agendadas', { error });
      }
    });
    
    // 5. Inicializar sistema de processamento de webhooks
    webhookQueueService.startProcessing();
    integrationLogger.info('Serviço de processamento de webhooks iniciado');
    
    // 6. Inicializar outras integrações conforme necessário
    integrationLogger.info('Todos os serviços inicializados com sucesso');
    
  } catch (error) {
    integrationLogger.error('Erro ao inicializar serviços', { error });
    throw error;
  }
}

/**
 * Integra os manipuladores de mensagens do sistema
 * @param message Mensagem a ser processada
 * @returns Resultado do processamento
 */
export async function processIncomingMessage(message: any): Promise<{
  wasProcessed: boolean;
  response?: string;
  source?: string;
}> {
  try {
    // 1. Verificar regras de automação
    const automationResult = await automationHandler.processMessage(message);
    if (automationResult.processed) {
      return {
        wasProcessed: true,
        response: automationResult.response,
        source: 'automation'
      };
    }
    
    // 2. Verificar outros handlers se necessário...
    
    return { wasProcessed: false };
  } catch (error) {
    integrationLogger.error('Erro ao processar mensagem', { error, messageId: message.id });
    return { wasProcessed: false };
  }
}