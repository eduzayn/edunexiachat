/**
 * Módulo centralizador para processamento de webhooks
 * Este módulo gerencia o registro, a validação e o encaminhamento de webhooks 
 * para os handlers específicos de cada canal de comunicação.
 */

import { IStorage } from '../storage';
import { WebhookQueueService } from '../services/webhookQueue';
import { BaseChannelHandler } from '../channels/index';

// Tipos de webhook suportados
export enum WebhookType {
  TWILIO = 'twilio',
  TWILIO_SMS = 'twilio-sms',
  META = 'meta', // Facebook e Instagram
  MESSENGER = 'messenger',
  INSTAGRAM = 'instagram',
  TELEGRAM = 'telegram',
  ZAPAPI = 'zapapi',
  WHATSAPP_BUSINESS = 'whatsapp-business',
  SENDGRID = 'sendgrid',
  SLACK = 'slack',
  DISCORD = 'discord',
  ASAAS = 'asaas'
}

// Mapeamento de validadores específicos para cada tipo de webhook
const webhookValidators: Record<string, (data: any) => boolean> = {
  [WebhookType.TWILIO]: (data) => !!data.SmsMessageSid || !!data.SmsSid || !!data.MessageSid,
  [WebhookType.TWILIO_SMS]: (data) => !!data.SmsSid || !!data.MessageSid,
  [WebhookType.META]: (data) => !!data.object && (data.object === 'page' || data.object === 'instagram'),
  [WebhookType.MESSENGER]: (data) => !!data.object && data.object === 'page',
  [WebhookType.INSTAGRAM]: (data) => !!data.object && data.object === 'instagram',
  [WebhookType.TELEGRAM]: (data) => !!data.update_id || !!data.message || !!data.callback_query,
  [WebhookType.ZAPAPI]: (data) => !!data.from || (!!data.key && !!data.phone),
  [WebhookType.WHATSAPP_BUSINESS]: (data) => 
    !!data.object && data.object === 'whatsapp_business_account' || 
    (!!data.entry && 
     Array.isArray(data.entry) && 
     data.entry.some((e: any) => e.changes && e.changes.some((c: any) => c.field === 'messages'))),
  [WebhookType.SENDGRID]: (data) => Array.isArray(data) && data.some((event) => !!event.sg_event_id),
  [WebhookType.SLACK]: (data) => !!data.event || !!data.challenge || !!data.payload,
  [WebhookType.DISCORD]: (data) => !!data.id || !!data.t || !!data.op,
  [WebhookType.ASAAS]: (data) => !!data.event && !!data.payment
};

export class WebhookManager {
  private storage: IStorage;
  private queueService: WebhookQueueService;
  private handlers: Map<string, BaseChannelHandler>;
  
  constructor(
    storage: IStorage, 
    queueService: WebhookQueueService,
    handlers: Map<string, BaseChannelHandler>
  ) {
    this.storage = storage;
    this.queueService = queueService;
    this.handlers = handlers;
  }
  
  /**
   * Processa um webhook recebido
   * @param type Tipo do webhook
   * @param data Dados do webhook
   * @param options Opções adicionais
   * @returns Resultado do processamento
   */
  async processWebhook(
    type: WebhookType, 
    data: any, 
    options: { 
      channelId?: number, 
      priority?: number,
      skipValidation?: boolean
    } = {}
  ): Promise<{ success: boolean, message: string, id?: number }> {
    try {
      // Validar o webhook, se a validação não estiver sendo ignorada
      if (!options.skipValidation) {
        const isValid = this.validateWebhook(type, data);
        if (!isValid) {
          return { 
            success: false, 
            message: `Webhook inválido para o tipo ${type}` 
          };
        }
      }
      
      // Enfileirar o webhook para processamento assíncrono
      const item = await this.queueService.enqueueWebhook(
        type, 
        data, 
        { 
          channelId: options.channelId,
          priority: options.priority
        }
      );
      
      return {
        success: true,
        message: `Webhook ${type} enfileirado com sucesso`,
        id: item.id
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Erro desconhecido';
      console.error(`Erro ao processar webhook ${type}:`, errorMessage);
      return { 
        success: false, 
        message: `Erro ao processar webhook: ${errorMessage}` 
      };
    }
  }
  
  /**
   * Valida se um payload de webhook é válido para um determinado tipo
   */
  validateWebhook(type: WebhookType, data: any): boolean {
    const validator = webhookValidators[type];
    if (!validator) {
      console.warn(`Nenhum validador encontrado para o tipo de webhook: ${type}`);
      return true; // Se não há validador, assumimos que é válido
    }
    
    return validator(data);
  }
  
  /**
   * Identifica o tipo de webhook com base no payload
   * Útil para rotas de webhook genéricas
   */
  identifyWebhookType(data: any): WebhookType | null {
    for (const [type, validator] of Object.entries(webhookValidators)) {
      if (validator(data)) {
        return type as WebhookType;
      }
    }
    return null;
  }
  
  /**
   * Obtém estatísticas de processamento de webhooks
   */
  async getWebhookStats() {
    return {
      processingStats: this.queueService.getProcessingStats(),
      queueStatus: await this.queueService.getQueueStatsBySource()
    };
  }
  
  /**
   * Realiza limpeza da fila de webhooks
   */
  async cleanupQueue(maxAgeInDays = 30) {
    return this.queueService.cleanupQueue(maxAgeInDays);
  }
}

export default WebhookManager;