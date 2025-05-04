import { WhatsAppHandler } from "./whatsapp";
import { IStorage } from "../storage";
import axios from "axios";
import { Channel } from "@shared/schema";

type ZapApiConfig = {
  apiToken: string;
  instance: string;
};

export class ZapApiHandler extends WhatsAppHandler {
  private channels: Map<number, {
    config: ZapApiConfig;
    initialized: boolean;
  }> = new Map();
  
  // Fallback credentials do ambiente
  private defaultApiToken: string;
  private defaultInstance: string;
  private baseUrl: string;
  
  constructor(storage: IStorage, sendEventToAll: (event: any) => void) {
    super(storage, sendEventToAll);
    
    // Configuração de ambiente (fallback)
    this.defaultApiToken = process.env.ZAPAPI_TOKEN || "";
    this.defaultInstance = process.env.ZAPAPI_INSTANCE || "";
    this.baseUrl = "https://api.z-api.io/instances";
    
    // Inicializa os canais do ZapAPI configurados no banco de dados
    this.loadChannels();
  }
  
  /**
   * Carrega todos os canais do ZapAPI configurados no banco de dados
   */
  private async loadChannels(): Promise<void> {
    console.log("Carregando canais do WhatsApp ZapAPI configurados...");
    try {
      // Buscar todos os canais configurados no banco de dados
      const allChannels = await this.storage.getChannels();
      const zapChannels = allChannels.filter(channel => channel.type === "whatsapp_zap");
      
      if (zapChannels.length === 0) {
        console.log("Nenhum canal do WhatsApp ZapAPI configurado no banco de dados.");
        
        // Se tiver credenciais padrão, inicializar como fallback
        if (this.defaultApiToken && this.defaultInstance) {
          console.log("Usando credenciais ZapAPI configuradas nas variáveis de ambiente como fallback.");
          
          // Criar um canal virtual com as credenciais do ambiente
          const virtualChannel = {
            id: 0, // ID 0 para canal virtual
            config: JSON.stringify({
              apiToken: this.defaultApiToken,
              instance: this.defaultInstance
            }),
            isActive: true
          } as Channel;
          
          await this.initChannel(virtualChannel);
        } else {
          console.warn("Credenciais ZapAPI não configuradas. Integração com WhatsApp ZapAPI estará indisponível.");
        }
        return;
      }
      
      // Inicializar cada canal
      for (const channel of zapChannels) {
        if (channel.isActive) {
          await this.initChannel(channel);
        }
      }
      
      console.log(`Inicializado ${this.channels.size} canais do WhatsApp ZapAPI.`);
    } catch (error) {
      console.error("Erro ao carregar canais do WhatsApp ZapAPI:", error);
    }
  }
  
  /**
   * Inicializa um canal específico do WhatsApp ZapAPI
   */
  async initChannel(channel: Channel): Promise<void> {
    try {
      if (!channel.config) {
        console.warn(`Canal WhatsApp ZapAPI ID ${channel.id} não possui configuração válida.`);
        return;
      }
      
      // Parsear a configuração
      let config: ZapApiConfig;
      try {
        config = JSON.parse(channel.config) as ZapApiConfig;
      } catch (e) {
        console.error(`Erro ao parsear configuração do canal WhatsApp ZapAPI ID ${channel.id}:`, e);
        return;
      }
      
      // Validar credenciais
      if (!config.apiToken || !config.instance) {
        console.warn(`Credenciais ZapAPI inválidas para o canal ID ${channel.id}`);
        return;
      }
      
      // Criar dados do canal
      const channelData = {
        config,
        initialized: true
      };
      
      // Salvar dados do canal
      this.channels.set(channel.id, channelData);
      
      console.log(`Canal WhatsApp ZapAPI ID ${channel.id} inicializado com sucesso.`);
    } catch (error) {
      console.error(`Erro ao inicializar canal WhatsApp ZapAPI ID ${channel.id}:`, error);
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
        console.warn(`Recebido webhook para canal WhatsApp ZapAPI ID ${channelId} não inicializado.`);
        // Tentar carregar canais novamente
        await this.loadChannels();
        return;
      }
      
      // Buscar canal real do banco de dados
      let channelEntity;
      if (channelId > 0) {
        channelEntity = await this.storage.getChannelById(channelId);
      }
      
      // Process Z-API webhook for WhatsApp message
      if (data.phone && data.message) {
        const instanceId = channelData.config.instance;
        
        await this.processIncomingMessage({
          from: data.phone,
          to: instanceId,
          messageId: data.messageId || `zap_${Date.now()}`,
          timestamp: data.timestamp || Date.now(),
          content: data.message,
          contentType: "text",
          channelType: "whatsapp_zap",
          channelName: channelEntity?.name || "WhatsApp (Z-API)"
        });
      }
    } catch (error) {
      console.error("Error processing ZapAPI webhook:", error);
    }
  }
  
  async sendMessage(recipient: string, content: string): Promise<void> {
    try {
      // Encontrar canal adequado para enviar a mensagem
      // Na implementação atual, usamos o primeiro canal disponível
      // Em um cenário mais complexo, deveríamos determinar o canal com base na conversa
      
      // Pegar o primeiro canal inicializado
      let channelId = -1;
      let channelConfig: ZapApiConfig | null = null;
      
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
          console.warn("Nenhum canal do WhatsApp ZapAPI inicializado disponível para enviar mensagem.");
          return;
        }
      }
      
      // Verificar se temos credenciais válidas
      if (!channelConfig.apiToken || !channelConfig.instance) {
        console.warn("Credenciais ZapAPI não configuradas para o canal selecionado.");
        return;
      }
      
      // Clean phone number format (remove any non-numeric characters except '+')
      const phone = recipient.replace(/[^\d+]/g, "");
      
      await axios.post(
        `${this.baseUrl}/${channelConfig.instance}/token/${channelConfig.apiToken}/send-text`,
        {
          phone,
          message: content
        }
      );
      
      console.log(`Mensagem enviada com sucesso para ${recipient} via WhatsApp ZapAPI usando canal ID ${channelId}`);
    } catch (error) {
      console.error("Error sending message via ZapAPI:", error);
      // Não relança o erro para não interromper o fluxo da aplicação
    }
  }
}
