/**
 * Validadores para webhooks de diferentes plataformas
 * Este módulo contém funções específicas para validar payloads de webhook
 * de diferentes canais de comunicação.
 */

import { WebhookType } from './index';

/**
 * Valida webhook do Twilio para mensagens do WhatsApp
 */
export function validateTwilioWebhook(data: any): boolean {
  // Verifica os campos específicos do webhook do Twilio
  return (
    !!data.SmsMessageSid || 
    !!data.SmsSid || 
    !!data.MessageSid
  ) && (
    !!data.From && 
    !!data.To
  );
}

/**
 * Valida webhook do Twilio para mensagens SMS
 */
export function validateTwilioSmsWebhook(data: any): boolean {
  // Verifica os campos específicos do webhook do Twilio para SMS
  return (
    !!data.SmsSid || 
    !!data.MessageSid
  ) && (
    !!data.From && 
    !!data.To
  );
}

/**
 * Valida webhook da Meta Platform (Facebook/Instagram)
 */
export function validateMetaWebhook(data: any): boolean {
  // Verifica se é um evento válido do Facebook ou Instagram
  return (
    !!data.object && 
    (data.object === 'page' || data.object === 'instagram') &&
    Array.isArray(data.entry) &&
    data.entry.length > 0
  );
}

/**
 * Valida webhook do Facebook Messenger
 */
export function validateMessengerWebhook(data: any): boolean {
  // Verifica se é um evento válido do Facebook Messenger
  return (
    !!data.object && 
    data.object === 'page' &&
    Array.isArray(data.entry) &&
    data.entry.length > 0 &&
    data.entry.some((entry: any) => 
      entry.messaging && 
      Array.isArray(entry.messaging) &&
      entry.messaging.length > 0
    )
  );
}

/**
 * Valida webhook do Instagram
 */
export function validateInstagramWebhook(data: any): boolean {
  // Verifica se é um evento válido do Instagram
  return (
    !!data.object && 
    data.object === 'instagram' &&
    Array.isArray(data.entry) &&
    data.entry.length > 0 &&
    data.entry.some((entry: any) => 
      entry.messaging && 
      Array.isArray(entry.messaging) &&
      entry.messaging.length > 0
    )
  );
}

/**
 * Valida webhook do Telegram
 */
export function validateTelegramWebhook(data: any): boolean {
  // Verifica se é um evento válido do Telegram
  return (
    !!data.update_id || 
    !!data.message || 
    !!data.callback_query ||
    !!data.edited_message ||
    !!data.channel_post
  );
}

/**
 * Valida webhook do ZapAPI (API não oficial do WhatsApp)
 */
export function validateZapApiWebhook(data: any): boolean {
  // Verifica se é um evento válido do ZapAPI
  return (
    (!!data.from && typeof data.from === 'string') || 
    (!!data.key && !!data.phone)
  );
}

/**
 * Valida webhook do WhatsApp Business API (oficial)
 */
export function validateWhatsAppBusinessWebhook(data: any): boolean {
  // Verifica se é um evento válido do WhatsApp Business API
  return (
    (!!data.object && data.object === 'whatsapp_business_account') || 
    (!!data.entry && 
     Array.isArray(data.entry) && 
     data.entry.length > 0 &&
     data.entry.some((e: any) => e.changes && e.changes.some((c: any) => c.field === 'messages')))
  );
}

/**
 * Valida webhook do SendGrid para eventos de email
 */
export function validateSendGridWebhook(data: any): boolean {
  // Verifica se é um evento válido do SendGrid
  return (
    Array.isArray(data) && 
    data.length > 0 &&
    data.some((event) => !!event.sg_event_id)
  );
}

/**
 * Valida webhook do Slack
 */
export function validateSlackWebhook(data: any): boolean {
  // Verifica se é um evento válido do Slack
  return (
    !!data.event || 
    !!data.challenge || 
    !!data.payload || 
    !!data.team_id || 
    !!data.api_app_id
  );
}

/**
 * Valida webhook do Discord
 */
export function validateDiscordWebhook(data: any): boolean {
  // Verifica se é um evento válido do Discord
  return (
    (!!data.id && !!data.t) || 
    (!!data.op && typeof data.op === 'number') ||
    (!!data.d && typeof data.d === 'object')
  );
}

/**
 * Valida webhook do Asaas de pagamentos
 */
export function validateAsaasWebhook(data: any): boolean {
  // Verifica se é um evento válido do Asaas
  return (
    !!data.event && 
    !!data.payment &&
    typeof data.payment.id === 'string'
  );
}

/**
 * Mapeamento de validadores para cada tipo de webhook
 */
export const webhookValidators: Record<string, (data: any) => boolean> = {
  [WebhookType.TWILIO]: validateTwilioWebhook,
  [WebhookType.TWILIO_SMS]: validateTwilioSmsWebhook,
  [WebhookType.META]: validateMetaWebhook,
  [WebhookType.MESSENGER]: validateMessengerWebhook,
  [WebhookType.INSTAGRAM]: validateInstagramWebhook,
  [WebhookType.TELEGRAM]: validateTelegramWebhook,
  [WebhookType.ZAPAPI]: validateZapApiWebhook,
  [WebhookType.WHATSAPP_BUSINESS]: validateWhatsAppBusinessWebhook,
  [WebhookType.SENDGRID]: validateSendGridWebhook,
  [WebhookType.SLACK]: validateSlackWebhook,
  [WebhookType.DISCORD]: validateDiscordWebhook,
  [WebhookType.ASAAS]: validateAsaasWebhook
};