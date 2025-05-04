import { BaseChannelHandler } from "./index";
import { IStorage } from "../storage";
import axios from "axios";
import { Channel } from "@shared/schema";

type InstagramConfig = {
  pageToken: string;
  verifyToken?: string;
};

export class InstagramHandler extends BaseChannelHandler {
  private channels: Map<number, {
    config: InstagramConfig;
    initialized: boolean;
  }> = new Map();
  
  private defaultTokenFromEnv: string;
  
  constructor(storage: IStorage, sendEventToAll: (event: any) => void) {
    super({ storage, sendEventToAll });
    
    // Configuração de ambiente (fallback)
    this.defaultTokenFromEnv = process.env.INSTAGRAM_PAGE_TOKEN || process.env.FACEBOOK_PAGE_TOKEN || "";
    
    // Inicializa os canais do Instagram configurados no banco de dados
    this.loadChannels();
  }
  
  /**
   * Carrega todos os canais do Instagram configurados no banco de dados
   */
  private async loadChannels(): Promise<void> {
    console.log("Carregando canais do Instagram configurados...");
    try {
      // Buscar todos os canais configurados no banco de dados
      const allChannels = await this.storage.getChannels();
      const instagramChannels = allChannels.filter(channel => channel.type === "instagram");
      
      if (instagramChannels.length === 0) {
        console.log("Nenhum canal do Instagram configurado no banco de dados.");
        
        // Se tiver um token padrão, inicializar como fallback
        if (this.defaultTokenFromEnv) {
          console.log("Usando Page Token do Instagram configurado nas variáveis de ambiente como fallback.");
          
          // Criar um canal virtual com o token do ambiente
          const virtualChannel = {
            id: 0, // ID 0 para canal virtual
            config: JSON.stringify({
              pageToken: this.defaultTokenFromEnv
            }),
            isActive: true
          } as Channel;
          
          await this.initChannel(virtualChannel);
        } else {
          console.warn("Page Token do Instagram não configurado. Integração com Instagram estará indisponível.");
        }
        return;
      }
      
      // Inicializar cada canal
      for (const channel of instagramChannels) {
        if (channel.isActive) {
          await this.initChannel(channel);
        }
      }
      
      console.log(`Inicializado ${this.channels.size} canais do Instagram.`);
    } catch (error) {
      console.error("Erro ao carregar canais do Instagram:", error);
    }
  }
  
  /**
   * Inicializa um canal específico do Instagram
   */
  async initChannel(channel: Channel): Promise<void> {
    try {
      if (!channel.config) {
        console.warn(`Canal Instagram ID ${channel.id} não possui configuração válida.`);
        return;
      }
      
      // Parsear a configuração
      let config: InstagramConfig;
      try {
        config = JSON.parse(channel.config) as InstagramConfig;
      } catch (e) {
        console.error(`Erro ao parsear configuração do canal Instagram ID ${channel.id}:`, e);
        return;
      }
      
      // Validar page token
      if (!config.pageToken) {
        console.warn(`Page Token do Instagram inválido para o canal ID ${channel.id}`);
        return;
      }
      
      // Criar dados do canal
      const channelData = {
        config,
        initialized: true
      };
      
      // Salvar dados do canal
      this.channels.set(channel.id, channelData);
      
      console.log(`Canal Instagram ID ${channel.id} inicializado com sucesso.`);
    } catch (error) {
      console.error(`Erro ao inicializar canal Instagram ID ${channel.id}:`, error);
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
        console.warn(`Recebido webhook para canal Instagram ID ${channelId} não inicializado.`);
        // Tentar carregar canais novamente
        await this.loadChannels();
        return;
      }
      
      // Buscar canal real do banco de dados
      let channelEntity;
      if (channelId > 0) {
        channelEntity = await this.storage.getChannelById(channelId);
      }
      
      // Process Instagram webhook events
      const entries = data.entry || [];
      
      for (const entry of entries) {
        const messaging = entry.messaging || [];
        
        for (const event of messaging) {
          if (event.message && event.message.text) {
            await this.processIncomingMessage({
              from: event.sender.id,
              to: event.recipient.id,
              messageId: event.message.mid,
              timestamp: event.timestamp,
              content: event.message.text,
              contentType: "text",
              channelType: "instagram",
              channelName: channelEntity?.name || "Instagram Direct"
            });
          }
        }
      }
    } catch (error) {
      console.error("Error processing Instagram webhook:", error);
    }
  }
  
  async sendMessage(recipient: string, content: string): Promise<void> {
    try {
      // Encontrar canal adequado para enviar a mensagem
      // Na implementação atual, usamos o primeiro canal disponível
      // Em um cenário mais complexo, deveríamos determinar o canal com base na conversa
      
      // Pegar o primeiro canal inicializado
      let channelId = -1;
      let channelConfig: InstagramConfig | null = null;
      
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
          console.warn("Nenhum canal do Instagram inicializado disponível para enviar mensagem.");
          return;
        }
      }
      
      // Verificar se temos um token válido
      if (!channelConfig.pageToken) {
        console.warn("Page Token do Instagram não configurado para o canal selecionado.");
        return;
      }
      
      await axios.post(
        `https://graph.facebook.com/v18.0/me/messages?access_token=${channelConfig.pageToken}`,
        {
          recipient: { id: recipient },
          message: { text: content }
        }
      );
      
      console.log(`Mensagem enviada com sucesso para ${recipient} via Instagram usando canal ID ${channelId}`);
    } catch (error) {
      console.error("Error sending message via Instagram:", error);
      // Não relança o erro para não interromper o fluxo da aplicação
    }
  }
}
