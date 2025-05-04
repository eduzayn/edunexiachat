/**
 * Ferramenta para teste e depuração de webhooks
 * Este módulo fornece funções para simular e testar webhooks
 * sem depender de serviços externos.
 */

import { v4 as uuidv4 } from 'uuid';
import { WebhookType } from './index';
import { WebhookHandlerService } from './handler';

// Exemplos de payloads de webhook para teste
const mockWebhookPayloads: Record<WebhookType, () => any> = {
  [WebhookType.TWILIO]: () => ({
    SmsMessageSid: `SM${uuidv4().replace(/-/g, '')}`,
    MessageSid: `MM${uuidv4().replace(/-/g, '')}`,
    AccountSid: 'FAKE_ACCOUNT_NOT_REAL_TEST_ONLY',
    From: 'whatsapp:+5511999999999',
    To: 'whatsapp:+14155238886',
    Body: 'Mensagem de teste via Twilio WhatsApp',
    NumMedia: '0',
    ProfileName: 'Usuário de Teste',
    WaId: '5511999999999',
    SmsStatus: 'received',
    NumSegments: '1',
    ReferralNumMedia: '0',
    MessageStatus: 'received',
    StructuredMessage: 'false',
    ChannelPrefix: 'whatsapp'
  }),
  
  [WebhookType.TWILIO_SMS]: () => ({
    SmsSid: `SM${uuidv4().replace(/-/g, '')}`,
    SmsStatus: 'received',
    Body: 'Mensagem SMS de teste',
    From: '+5511999999999',
    To: '+14155238886',
    NumMedia: '0',
    NumSegments: '1',
    MessageSid: `SM${uuidv4().replace(/-/g, '')}`,
    AccountSid: 'FAKE_ACCOUNT_NOT_REAL_TEST_ONLY',
    ApiVersion: '2010-04-01'
  }),
  
  [WebhookType.META]: () => ({
    object: Math.random() > 0.5 ? 'page' : 'instagram',
    entry: [
      {
        id: `${Math.floor(Math.random() * 1000000000000000)}`,
        time: Date.now(),
        messaging: [
          {
            sender: { id: `${Math.floor(Math.random() * 1000000000000000)}` },
            recipient: { id: `${Math.floor(Math.random() * 1000000000000000)}` },
            timestamp: Date.now(),
            message: {
              mid: `m_${uuidv4().replace(/-/g, '')}`,
              text: 'Mensagem de teste via Meta Platform',
              seq: 1
            }
          }
        ]
      }
    ]
  }),
  
  [WebhookType.MESSENGER]: () => ({
    object: 'page',
    entry: [
      {
        id: `${Math.floor(Math.random() * 1000000000000000)}`,
        time: Date.now(),
        messaging: [
          {
            sender: { id: `${Math.floor(Math.random() * 1000000000000000)}` },
            recipient: { id: `${Math.floor(Math.random() * 1000000000000000)}` },
            timestamp: Date.now(),
            message: {
              mid: `m_${uuidv4().replace(/-/g, '')}`,
              text: 'Mensagem de teste via Facebook Messenger',
              seq: 1
            }
          }
        ]
      }
    ]
  }),
  
  [WebhookType.INSTAGRAM]: () => ({
    object: 'instagram',
    entry: [
      {
        id: `${Math.floor(Math.random() * 1000000000000000)}`,
        time: Date.now(),
        messaging: [
          {
            sender: { id: `${Math.floor(Math.random() * 1000000000000000)}` },
            recipient: { id: `${Math.floor(Math.random() * 1000000000000000)}` },
            timestamp: Date.now(),
            message: {
              mid: `m_${uuidv4().replace(/-/g, '')}`,
              text: 'Mensagem de teste via Instagram DM',
              seq: 1
            }
          }
        ]
      }
    ]
  }),
  
  [WebhookType.TELEGRAM]: () => ({
    update_id: Math.floor(Math.random() * 1000000000),
    message: {
      message_id: Math.floor(Math.random() * 10000),
      from: {
        id: Math.floor(Math.random() * 1000000000),
        is_bot: false,
        first_name: 'Usuário',
        last_name: 'Teste',
        username: 'usuario_teste',
        language_code: 'pt-br'
      },
      chat: {
        id: Math.floor(Math.random() * 1000000000),
        first_name: 'Usuário',
        last_name: 'Teste',
        username: 'usuario_teste',
        type: 'private'
      },
      date: Math.floor(Date.now() / 1000),
      text: 'Mensagem de teste via Telegram'
    }
  }),
  
  [WebhookType.ZAPAPI]: () => ({
    from: '5511999999999@s.whatsapp.net',
    to: '5511888888888@s.whatsapp.net',
    id: `${uuidv4().replace(/-/g, '')}`,
    timestamp: Date.now(),
    type: 'text',
    content: 'Mensagem de teste via ZapAPI',
    _query: {}
  }),
  
  [WebhookType.WHATSAPP_BUSINESS]: () => ({
    object: 'whatsapp_business_account',
    entry: [
      {
        id: `${Math.floor(Math.random() * 1000000000000000)}`,
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '5511999999999',
                phone_number_id: `${Math.floor(Math.random() * 1000000000000000)}`
              },
              contacts: [
                {
                  profile: {
                    name: 'Usuário de Teste'
                  },
                  wa_id: '5511888888888'
                }
              ],
              messages: [
                {
                  from: '5511888888888',
                  id: `wamid.${uuidv4().replace(/-/g, '')}`,
                  timestamp: Math.floor(Date.now() / 1000),
                  text: {
                    body: 'Mensagem de teste via WhatsApp Business API'
                  },
                  type: 'text'
                }
              ]
            },
            field: 'messages'
          }
        ]
      }
    ]
  }),
  
  [WebhookType.SENDGRID]: () => ([
    {
      sg_event_id: uuidv4(),
      sg_message_id: `${uuidv4().replace(/-/g, '')}.filter-274.12345.1`,
      email: 'usuario.teste@example.com',
      timestamp: Math.floor(Date.now() / 1000),
      'smtp-id': `<${uuidv4().replace(/-/g, '')}@example.com>`,
      event: 'delivered',
      category: ['teste'],
      sg_template_id: 'FAKE_TEMPLATE_ID_NOT_REAL'
    }
  ]),
  
  [WebhookType.SLACK]: () => ({
    token: 'XXYYZZ',
    team_id: 'T12345',
    api_app_id: 'A12345',
    event: {
      type: 'message',
      user: 'U12345',
      text: 'Mensagem de teste via Slack',
      ts: `${Date.now() / 1000}`,
      channel: 'C12345',
      event_ts: `${Date.now() / 1000}`
    },
    type: 'event_callback',
    event_id: `Ev${uuidv4().substring(0, 8)}`,
    event_time: Math.floor(Date.now() / 1000),
    authed_users: ['U12345']
  }),
  
  [WebhookType.DISCORD]: () => ({
    id: uuidv4(),
    t: 'MESSAGE_CREATE',
    d: {
      id: `${Math.floor(Math.random() * 1000000000000000000)}`,
      type: 0,
      content: 'Mensagem de teste via Discord',
      channel_id: `${Math.floor(Math.random() * 1000000000000000000)}`,
      author: {
        id: `${Math.floor(Math.random() * 1000000000000000000)}`,
        username: 'usuario_teste',
        discriminator: '1234',
        avatar: uuidv4()
      },
      timestamp: new Date().toISOString(),
      guild_id: `${Math.floor(Math.random() * 1000000000000000000)}`
    }
  }),
  
  [WebhookType.ASAAS]: () => ({
    event: 'PAYMENT_RECEIVED',
    payment: {
      id: uuidv4(),
      dateCreated: new Date().toISOString(),
      customer: uuidv4(),
      dueDate: new Date().toISOString(),
      value: 100.00,
      netValue: 97.00,
      billingType: 'BOLETO',
      status: 'RECEIVED',
      description: 'Cobrança de teste',
      externalReference: 'REF-001',
      confirmedDate: new Date().toISOString(),
      originalValue: 100.00,
      interestValue: 0.00,
      originalDueDate: new Date().toISOString(),
      paymentDate: new Date().toISOString(),
      clientPaymentDate: new Date().toISOString()
    }
  })
};

export class WebhookTester {
  private handlerService: WebhookHandlerService;
  
  constructor(handlerService: WebhookHandlerService) {
    this.handlerService = handlerService;
  }
  
  /**
   * Gera um payload de webhook de teste
   * @param type Tipo do webhook
   * @param customData Dados personalizados para mesclar com o template
   */
  generateMockWebhook(type: WebhookType, customData: any = {}): any {
    const generator = mockWebhookPayloads[type];
    if (!generator) {
      throw new Error(`Tipo de webhook não suportado para teste: ${type}`);
    }
    
    // Gerar payload base e mesclar com dados personalizados
    const basePayload = generator();
    
    // Função recursiva para mesclar objetos aninhados
    const merge = (target: any, source: any) => {
      Object.keys(source).forEach(key => {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          if (!target[key]) target[key] = {};
          merge(target[key], source[key]);
        } else {
          target[key] = source[key];
        }
      });
      return target;
    };
    
    return merge(basePayload, customData);
  }
  
  /**
   * Simula um webhook
   * @param type Tipo do webhook
   * @param customData Dados personalizados para incluir no payload
   * @param options Opções adicionais para processamento
   */
  async simulateWebhook(
    type: WebhookType,
    customData: any = {},
    options: {
      processDirectly?: boolean,
      channelId?: number
    } = {}
  ): Promise<any> {
    // Gerar payload de teste
    const payload = this.generateMockWebhook(type, customData);
    
    // Processar o webhook conforme configurado
    if (options.processDirectly) {
      const result = await this.handlerService.processWebhookDirectly(
        type, 
        payload, 
        true // Pular validação para permitir testes flexíveis
      );
      return { success: result, payload };
    } else {
      // Enfileirar para processamento assíncrono
      const id = await this.handlerService.enqueueWebhook(
        type, 
        payload, 
        {
          channelId: options.channelId,
          skipValidation: true,
          priority: 9 // Prioridade mais baixa para webhooks de teste
        }
      );
      return { id, payload };
    }
  }
  
  /**
   * Simula um lote de webhooks para teste de carga
   * @param type Tipo do webhook
   * @param count Quantidade de webhooks a simular
   */
  async simulateBatch(
    type: WebhookType, 
    count: number = 10
  ): Promise<{ batchId: string, count: number }> {
    const batchId = uuidv4();
    const results = [];
    
    for (let i = 0; i < count; i++) {
      const payload = this.generateMockWebhook(type);
      
      try {
        // Enfileirar com o mesmo batchId
        const id = await this.handlerService.enqueueWebhook(
          type, 
          payload, 
          {
            skipValidation: true,
            priority: 9,
            // Adicionar tags e batchId
            options: {
              tags: ['batch-test', `type-${type}`],
              batchId
            }
          }
        );
        
        results.push({ id, success: true });
      } catch (error) {
        results.push({ success: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
    
    return {
      batchId,
      count: results.filter(r => r.success).length
    };
  }
}

export default WebhookTester;