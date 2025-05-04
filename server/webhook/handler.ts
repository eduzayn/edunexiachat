/**
 * Implementação unificada para processamento de handlers de webhook
 * Este arquivo fornece uma implementação padronizada para processar 
 * webhooks recebidos de diferentes plataformas, garantindo um tratamento
 * consistente e centralizado.
 */

import { WebhookType } from './index';
import { webhookValidators } from './validators';
import { IStorage } from '../storage';
import { WebhookQueueService } from '../services/webhookQueue';
import { BaseChannelHandler } from '../channels/index';

export class WebhookHandlerService {
  private storage: IStorage;
  private queueService: WebhookQueueService;
  private channelHandlers: Map<string, BaseChannelHandler>;
  
  constructor(
    storage: IStorage, 
    queueService: WebhookQueueService,
    channelHandlers: Map<string, BaseChannelHandler>
  ) {
    this.storage = storage;
    this.queueService = queueService;
    this.channelHandlers = channelHandlers;
  }
  
  /**
   * Processa um webhook recebido diretamente (sem enfileiramento)
   * @param type Tipo do webhook
   * @param data Dados do webhook
   * @param skipValidation Se deve ignorar a validação
   */
  async processWebhookDirectly(
    type: WebhookType, 
    data: any,
    skipValidation: boolean = false
  ): Promise<boolean> {
    try {
      // Validar o webhook, se necessário
      if (!skipValidation) {
        const isValid = this.validateWebhook(type, data);
        if (!isValid) {
          console.error(`Webhook inválido para o tipo ${type}`);
          return false;
        }
      }
      
      // Obter o handler apropriado para este tipo
      const handler = this.getHandlerForType(type);
      if (!handler) {
        console.error(`Handler não encontrado para o tipo ${type}`);
        return false;
      }
      
      // Processar o webhook
      await handler.handleWebhook(data);
      return true;
    } catch (error: any) {
      console.error(`Erro ao processar webhook ${type} diretamente:`, error);
      return false;
    }
  }
  
  /**
   * Enfileira um webhook para processamento assíncrono
   * @param type Tipo do webhook
   * @param data Dados do webhook
   * @param options Opções adicionais para enfileiramento
   */
  async enqueueWebhook(
    type: WebhookType, 
    data: any, 
    options: { 
      channelId?: number, 
      priority?: number,
      skipValidation?: boolean 
    } = {}
  ): Promise<number> {
    // Validar o webhook, se necessário
    if (!options.skipValidation) {
      const isValid = this.validateWebhook(type, data);
      if (!isValid) {
        throw new Error(`Webhook inválido para o tipo ${type}`);
      }
    }
    
    // Enfileirar para processamento assíncrono
    const item = await this.queueService.enqueueWebhook(
      type, 
      data, 
      { 
        channelId: options.channelId,
        priority: options.priority
      }
    );
    
    return item.id;
  }
  
  /**
   * Verifica se um payload de webhook é válido para determinado tipo
   */
  validateWebhook(type: WebhookType, data: any): boolean {
    const validator = webhookValidators[type];
    if (!validator) {
      console.warn(`Validador não encontrado para o tipo ${type}`);
      return true; // Se não há validador, assumimos que é válido
    }
    
    return validator(data);
  }
  
  /**
   * Identifica o tipo de webhook baseado na análise do payload
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
   * Obtém o handler apropriado para um tipo de webhook
   */
  private getHandlerForType(type: WebhookType): BaseChannelHandler | null {
    switch (type) {
      case WebhookType.TWILIO:
        return this.channelHandlers.get('twilio') || null;
      case WebhookType.TWILIO_SMS:
        return this.channelHandlers.get('twilio-sms') || null;
      case WebhookType.META:
        return this.channelHandlers.get('meta') || null;
      case WebhookType.MESSENGER:
        return this.channelHandlers.get('messenger') || null;
      case WebhookType.INSTAGRAM:
        return this.channelHandlers.get('instagram') || null;
      case WebhookType.TELEGRAM:
        return this.channelHandlers.get('telegram') || null;
      case WebhookType.ZAPAPI:
        return this.channelHandlers.get('zapapi') || null;
      case WebhookType.WHATSAPP_BUSINESS:
        return this.channelHandlers.get('whatsapp-business') || null;
      case WebhookType.SENDGRID:
        return this.channelHandlers.get('sendgrid') || null;
      case WebhookType.SLACK:
        return this.channelHandlers.get('slack') || null;
      case WebhookType.DISCORD:
        return this.channelHandlers.get('discord') || null;
      case WebhookType.ASAAS:
        return this.channelHandlers.get('asaas') || null;
      default:
        return null;
    }
  }
}

export default WebhookHandlerService;