import { BaseChannelHandler } from "./index";
import { IStorage } from "../storage";
import sgMail from '@sendgrid/mail';
import { Channel } from "@shared/schema";

type SendGridConfig = {
  apiKey: string;
  fromEmail: string;
};

export class SendGridEmailHandler extends BaseChannelHandler {
  private channels: Map<number, {
    config: SendGridConfig;
    initialized: boolean;
  }> = new Map();
  
  private defaultApiKeyFromEnv: string;
  private defaultFromEmail: string;
  
  constructor(storage: IStorage, sendEventToAll: (event: any) => void) {
    super({ storage, sendEventToAll });
    
    // Configuração de ambiente (fallback)
    this.defaultApiKeyFromEnv = process.env.SENDGRID_API_KEY || "";
    this.defaultFromEmail = process.env.SENDGRID_FROM_EMAIL || "noreply@educhat.com.br";
    
    // Configurar inicialmente com a chave padrão
    if (this.defaultApiKeyFromEnv) {
      sgMail.setApiKey(this.defaultApiKeyFromEnv);
    }
    
    // Inicializa os canais do SendGrid configurados no banco de dados
    this.loadChannels();
  }
  
  /**
   * Carrega todos os canais do SendGrid configurados no banco de dados
   */
  private async loadChannels(): Promise<void> {
    console.log("Carregando canais do SendGrid configurados...");
    try {
      // Buscar todos os canais configurados no banco de dados
      const allChannels = await this.storage.getChannels();
      const sendGridChannels = allChannels.filter(channel => channel.type === "email_sendgrid");
      
      if (sendGridChannels.length === 0) {
        console.log("Nenhum canal do SendGrid configurado no banco de dados.");
        
        // Se tiver um token padrão, inicializar como fallback
        if (this.defaultApiKeyFromEnv) {
          console.log("Usando API key do SendGrid configurada nas variáveis de ambiente como fallback.");
          
          // Criar um canal virtual com a API key do ambiente
          const virtualChannel = {
            id: 0, // ID 0 para canal virtual
            config: JSON.stringify({
              apiKey: this.defaultApiKeyFromEnv,
              fromEmail: this.defaultFromEmail
            }),
            isActive: true
          } as Channel;
          
          await this.initChannel(virtualChannel);
        } else {
          console.warn("API key do SendGrid não configurada ou inválida. Integração com SendGrid estará indisponível.");
        }
        return;
      }
      
      // Inicializar cada canal
      for (const channel of sendGridChannels) {
        if (channel.isActive) {
          await this.initChannel(channel);
        }
      }
      
      console.log(`Inicializado ${this.channels.size} canais do SendGrid.`);
    } catch (error) {
      console.error("Erro ao carregar canais do SendGrid:", error);
    }
  }
  
  /**
   * Inicializa um canal específico do SendGrid
   */
  async initChannel(channel: Channel): Promise<void> {
    try {
      if (!channel.config) {
        console.warn(`Canal SendGrid ID ${channel.id} não possui configuração válida.`);
        return;
      }
      
      // Parsear a configuração
      let config: SendGridConfig;
      try {
        config = JSON.parse(channel.config) as SendGridConfig;
      } catch (e) {
        console.error(`Erro ao parsear configuração do canal SendGrid ID ${channel.id}:`, e);
        return;
      }
      
      // Validar API key
      if (!config.apiKey) {
        console.warn(`API key do SendGrid inválida para o canal ID ${channel.id}`);
        return;
      }
      
      // Criar dados do canal (sem cliente individual)
      const channelData = {
        config,
        initialized: true
      };
      
      // Salvar dados do canal
      this.channels.set(channel.id, channelData);
      
      // Se for o primeiro canal, configurar o cliente global
      if (this.channels.size === 1) {
        sgMail.setApiKey(config.apiKey);
      }
      
      console.log(`Canal SendGrid ID ${channel.id} inicializado com sucesso.`);
    } catch (error) {
      console.error(`Erro ao inicializar canal SendGrid ID ${channel.id}:`, error);
    }
  }
  
  async handleWebhook(data: any): Promise<void> {
    try {
      // Obter ID do canal a partir da query string ou usar o canal padrão (0)
      let channelId = 0;
      if (data._query && data._query.channelId) {
        channelId = parseInt(data._query.channelId);
      }
      
      // Buscar canal real do banco de dados
      let channelEntity;
      if (channelId > 0) {
        channelEntity = await this.storage.getChannelById(channelId);
      }
      
      // ProcessingEmail webhooks from SendGrid
      // Reference: https://docs.sendgrid.com/for-developers/tracking-events/getting-started-event-webhook
      
      // SendGrid webhook sends an array of events
      if (Array.isArray(data)) {
        for (const event of data) {
          // We're only interested in inbound email events
          if (event.event === 'inbound') {
            await this.processIncomingMessage({
              from: event.email || event.from,
              to: event.to || (channelEntity?.name || "sendgrid"),
              messageId: event.sg_message_id || `email_${Date.now()}`,
              timestamp: Date.now(),
              content: event.text || event.subject || 'Email recebido',
              contentType: "text",
              channelType: "email_sendgrid",
              channelName: channelEntity?.name || "Email (SendGrid)"
            });
          }
        }
      }
    } catch (error) {
      console.error("Error processing SendGrid webhook:", error);
    }
  }
  
  async sendMessage(recipient: string, content: string): Promise<void> {
    try {
      // Encontrar canal adequado para enviar a mensagem
      // Na implementação atual, usamos o primeiro canal disponível
      // Em um cenário mais complexo, deveríamos determinar o canal com base na conversa
      
      // Pegar o primeiro canal inicializado
      let channelId = -1;
      let channelConfig: SendGridConfig | null = null;
      
      // Usar o método forEach que é mais compatível com versões anteriores
      this.channels.forEach((data, id) => {
        if (data.initialized && channelId === -1) {
          channelId = id;
          channelConfig = data.config;
        }
      });
      
      if (channelId === -1 || !channelConfig) {
        // Tentar recarregar os canais
        await this.loadChannels();
        
        // Verificar novamente
        this.channels.forEach((data, id) => {
          if (data.initialized && channelId === -1) {
            channelId = id;
            channelConfig = data.config;
          }
        });
        
        if (channelId === -1 || !channelConfig) {
          console.warn("Nenhum canal do SendGrid inicializado disponível para enviar mensagem.");
          return;
        }
      }
      
      // Garantir que estamos usando a API key correta
      if (channelConfig && channelConfig.apiKey) {
        sgMail.setApiKey(channelConfig.apiKey);
      } else {
        console.warn("API key do SendGrid não configurada para o canal selecionado.");
        return;
      }
      
      // Verificar se as credenciais estão configuradas corretamente
      const fromEmail = channelConfig && channelConfig.fromEmail ? channelConfig.fromEmail : this.defaultFromEmail;
      
      // Formatar o conteúdo do email
      const msg = {
        to: recipient,
        from: fromEmail,
        subject: 'Nova mensagem do EduChat',
        text: content,
        html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #4f46e5; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">EduChat</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <p>${content.replace(/\n/g, '<br/>')}</p>
            <p style="color: #6b7280; font-size: 12px; margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 10px;">
              Esta mensagem foi enviada através da plataforma EduChat Omnichannel.
            </p>
          </div>
        </div>`,
      };
      
      await sgMail.send(msg);
      console.log(`Email enviado com sucesso para ${recipient} usando canal ID ${channelId}`);
    } catch (error) {
      console.error("Erro ao enviar e-mail via SendGrid:", error);
      // Não relança o erro para não interromper o fluxo da aplicação
      // em caso de problemas com um único canal
    }
  }
}