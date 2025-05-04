import { WhatsAppHandler } from "./whatsapp";
import { IStorage } from "../storage";
import axios from "axios";
import { Channel } from "@shared/schema";

type TwilioConfig = {
  accountSid: string;
  authToken: string;
  fromNumber: string;
};

export class TwilioHandler extends WhatsAppHandler {
  private channels: Map<number, {
    config: TwilioConfig;
    initialized: boolean;
  }> = new Map();
  
  // Fallback credentials do ambiente
  private defaultAccountSid: string;
  private defaultAuthToken: string;
  private defaultFromNumber: string;
  
  constructor(storage: IStorage, sendEventToAll: (event: any) => void) {
    super(storage, sendEventToAll);
    
    // Configuração de ambiente (fallback)
    this.defaultAccountSid = process.env.TWILIO_ACCOUNT_SID || "";
    this.defaultAuthToken = process.env.TWILIO_AUTH_TOKEN || "";
    this.defaultFromNumber = process.env.TWILIO_PHONE_NUMBER || "";
    
    // Inicializa os canais do Twilio configurados no banco de dados
    this.loadChannels();
  }
  
  /**
   * Carrega todos os canais do Twilio configurados no banco de dados
   */
  private async loadChannels(): Promise<void> {
    console.log("Carregando canais do WhatsApp Twilio configurados...");
    try {
      // Buscar todos os canais configurados no banco de dados
      const allChannels = await this.storage.getChannels();
      const twilioChannels = allChannels.filter(channel => channel.type === "whatsapp_twilio");
      
      if (twilioChannels.length === 0) {
        console.log("Nenhum canal do WhatsApp Twilio configurado no banco de dados.");
        
        // Se tiver credenciais padrão, inicializar como fallback
        if (this.defaultAccountSid && this.defaultAuthToken && this.defaultFromNumber) {
          console.log("Usando credenciais Twilio configuradas nas variáveis de ambiente como fallback.");
          
          // Criar um canal virtual com as credenciais do ambiente
          const virtualChannel = {
            id: 0, // ID 0 para canal virtual
            config: JSON.stringify({
              accountSid: this.defaultAccountSid,
              authToken: this.defaultAuthToken,
              fromNumber: this.defaultFromNumber
            }),
            isActive: true
          } as Channel;
          
          await this.initChannel(virtualChannel);
        } else {
          console.warn("Credenciais Twilio não configuradas. Integração com WhatsApp Twilio estará indisponível.");
        }
        return;
      }
      
      // Inicializar cada canal
      for (const channel of twilioChannels) {
        if (channel.isActive) {
          await this.initChannel(channel);
        }
      }
      
      console.log(`Inicializado ${this.channels.size} canais do WhatsApp Twilio.`);
    } catch (error) {
      console.error("Erro ao carregar canais do WhatsApp Twilio:", error);
    }
  }
  
  /**
   * Inicializa um canal específico do WhatsApp Twilio
   */
  async initChannel(channel: Channel): Promise<void> {
    try {
      if (!channel.config) {
        console.warn(`Canal WhatsApp Twilio ID ${channel.id} não possui configuração válida.`);
        return;
      }
      
      // Parsear a configuração
      let config: TwilioConfig;
      try {
        config = JSON.parse(channel.config) as TwilioConfig;
      } catch (e) {
        console.error(`Erro ao parsear configuração do canal WhatsApp Twilio ID ${channel.id}:`, e);
        return;
      }
      
      // Validar credenciais
      if (!config.accountSid || !config.authToken || !config.fromNumber) {
        console.warn(`Credenciais Twilio inválidas para o canal ID ${channel.id}`);
        return;
      }
      
      // Criar dados do canal
      const channelData = {
        config,
        initialized: true
      };
      
      // Salvar dados do canal
      this.channels.set(channel.id, channelData);
      
      console.log(`Canal WhatsApp Twilio ID ${channel.id} inicializado com sucesso.`);
    } catch (error) {
      console.error(`Erro ao inicializar canal WhatsApp Twilio ID ${channel.id}:`, error);
    }
  }
  
  async handleWebhook(data: any): Promise<void> {
    try {
      // Obter ID do canal a partir da query string ou usar o canal padrão (0)
      let channelId = 0;
      if (data._query && data._query.channelId) {
        channelId = parseInt(data._query.channelId);
      }
      
      // Verificar se o canal existe
      const channelData = this.channels.get(channelId);
      if (!channelData || !channelData.initialized) {
        console.warn(`Recebido webhook para canal WhatsApp Twilio ID ${channelId} não inicializado.`);
        // Tentar carregar canais novamente
        await this.loadChannels();
        return;
      }
      
      // Buscar canal real do banco de dados
      let channelEntity;
      if (channelId > 0) {
        channelEntity = await this.storage.getChannelById(channelId);
      }
      
      // Check if the message is an inbound WhatsApp message
      if (data.SmsMessageSid && data.From && data.To && data.Body) {
        // "whatsapp:+1234567890" -> "+1234567890"
        const from = data.From.replace("whatsapp:", "");
        const to = data.To.replace("whatsapp:", "");
        
        await this.processIncomingMessage({
          from,
          to,
          messageId: data.SmsMessageSid,
          timestamp: Date.now(),
          content: data.Body,
          contentType: "text",
          channelType: "whatsapp_twilio",
          channelName: channelEntity?.name || "WhatsApp (Twilio)"
        });
      }
    } catch (error) {
      console.error("Error processing Twilio webhook:", error);
    }
  }
  
  async sendMessage(recipient: string, content: string): Promise<void> {
    try {
      // Encontrar canal adequado para enviar a mensagem
      // Na implementação atual, usamos o primeiro canal disponível
      // Em um cenário mais complexo, deveríamos determinar o canal com base na conversa
      
      // Pegar o primeiro canal inicializado
      let channelId = -1;
      let channelConfig: TwilioConfig | null = null;
      
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
          console.warn("Nenhum canal do WhatsApp Twilio inicializado disponível para enviar mensagem.");
          return;
        }
      }
      
      // Verificar se temos credenciais válidas
      if (!channelConfig.accountSid || !channelConfig.authToken || !channelConfig.fromNumber) {
        console.warn("Credenciais Twilio não configuradas para o canal selecionado.");
        return;
      }
      
      // Add "whatsapp:" prefix if not present
      const to = recipient.startsWith("whatsapp:") ? recipient : `whatsapp:${recipient}`;
      const from = channelConfig.fromNumber.startsWith("whatsapp:") ? 
        channelConfig.fromNumber : `whatsapp:${channelConfig.fromNumber}`;
      
      // Use basic auth for Twilio API
      const auth = {
        username: channelConfig.accountSid,
        password: channelConfig.authToken
      };
      
      await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${channelConfig.accountSid}/Messages.json`,
        new URLSearchParams({
          To: to,
          From: from,
          Body: content
        }),
        { auth }
      );
      
      console.log(`Mensagem enviada com sucesso para ${recipient} via WhatsApp Twilio usando canal ID ${channelId}`);
    } catch (error) {
      console.error("Error sending message via Twilio:", error);
      // Não relança o erro para não interromper o fluxo da aplicação
    }
  }
}
