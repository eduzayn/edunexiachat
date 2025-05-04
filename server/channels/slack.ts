import { BaseChannelHandler } from "./index";
import { IStorage } from "../storage";
import { WebClient } from "@slack/web-api";
import { Channel } from "@shared/schema";

type SlackConfig = {
  botToken: string;
  channelId: string;
};

export class SlackHandler extends BaseChannelHandler {
  private channels: Map<number, {
    config: SlackConfig;
    client: WebClient;
    initialized: boolean;
  }> = new Map();
  
  private defaultTokenFromEnv: string;
  private defaultChannelId: string;
  
  constructor(storage: IStorage, sendEventToAll: (event: any) => void) {
    super({ storage, sendEventToAll });
    
    // Configuração de ambiente (fallback)
    this.defaultTokenFromEnv = process.env.SLACK_BOT_TOKEN || "";
    this.defaultChannelId = process.env.SLACK_CHANNEL_ID || "";
    
    // Inicializa os canais do Slack configurados no banco de dados
    this.loadChannels();
  }
  
  /**
   * Carrega todos os canais do Slack configurados no banco de dados
   */
  private async loadChannels(): Promise<void> {
    console.log("Carregando canais do Slack configurados...");
    try {
      // Buscar todos os canais configurados no banco de dados
      const allChannels = await this.storage.getChannels();
      const slackChannels = allChannels.filter(channel => channel.type === "slack");
      
      if (slackChannels.length === 0) {
        console.log("Nenhum canal do Slack configurado no banco de dados.");
        
        // Se tiver um token padrão, inicializar como fallback
        if (this.defaultTokenFromEnv && this.defaultTokenFromEnv.startsWith("xoxb-")) {
          console.log("Usando token do Slack configurado nas variáveis de ambiente como fallback.");
          
          // Criar um canal virtual com o token do ambiente
          const virtualChannel = {
            id: 0, // ID 0 para canal virtual
            config: JSON.stringify({
              botToken: this.defaultTokenFromEnv,
              channelId: this.defaultChannelId
            }),
            isActive: true
          } as Channel;
          
          await this.initChannel(virtualChannel);
        } else {
          console.warn("Slack Bot Token not configured or invalid (should start with 'xoxb-'). Slack messaging will be unavailable.");
        }
        return;
      }
      
      // Inicializar cada canal
      for (const channel of slackChannels) {
        if (channel.isActive) {
          await this.initChannel(channel);
        }
      }
      
      console.log(`Inicializado ${this.channels.size} canais do Slack.`);
    } catch (error) {
      console.error("Erro ao carregar canais do Slack:", error);
    }
  }
  
  /**
   * Inicializa um canal específico do Slack
   */
  async initChannel(channel: Channel): Promise<void> {
    try {
      if (!channel.config) {
        console.warn(`Canal Slack ID ${channel.id} não possui configuração válida.`);
        return;
      }
      
      // Parsear a configuração
      let config: SlackConfig;
      try {
        config = JSON.parse(channel.config) as SlackConfig;
      } catch (e) {
        console.error(`Erro ao parsear configuração do canal Slack ID ${channel.id}:`, e);
        return;
      }
      
      // Validar token
      if (!config.botToken || !config.botToken.startsWith("xoxb-")) {
        console.warn(`Token do Bot do Slack inválido para o canal ID ${channel.id}`);
        return;
      }
      
      // Criar cliente para este canal
      let client: WebClient;
      try {
        client = new WebClient(config.botToken);
      } catch (error) {
        console.error(`Erro ao criar cliente Slack para o canal ID ${channel.id}:`, error);
        return;
      }
      
      // Criar dados do canal
      const channelData = {
        config,
        client,
        initialized: true
      };
      
      // Salvar dados do canal
      this.channels.set(channel.id, channelData);
      
      console.log(`Canal Slack ID ${channel.id} inicializado com sucesso.`);
    } catch (error) {
      console.error(`Erro ao inicializar canal Slack ID ${channel.id}:`, error);
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
        console.warn(`Recebido webhook para canal Slack ID ${channelId} não inicializado.`);
        // Tentar carregar canais novamente
        await this.loadChannels();
        return;
      }
      
      // Buscar canal real do banco de dados
      let channelEntity;
      if (channelId > 0) {
        channelEntity = await this.storage.getChannelById(channelId);
      }
      
      // Processing Slack events
      // Reference: https://api.slack.com/events-api
      
      // URL verification - respond to Slack's challenge
      if (data.type === 'url_verification') {
        // Usually we would respond with data.challenge, but this is handled elsewhere
        return;
      }
      
      // Handle Events API events
      if (data.event) {
        const event = data.event;
        
        // We're only interested in message events that are not from bots
        if (event.type === 'message' && !event.bot_id && !event.subtype) {
          const userId = event.user;
          const slackChannelId = event.channel;
          const text = event.text;
          
          // Get user info to identify the sender
          const userInfo = await channelData.client.users.info({ user: userId });
          const username = userInfo.user?.real_name || userInfo.user?.name || userId;
          
          await this.processIncomingMessage({
            from: slackChannelId,
            to: channelEntity?.name || "slack",
            messageId: `${event.client_msg_id || event.ts}`,
            timestamp: new Date(parseFloat(event.ts) * 1000).getTime(),
            content: text,
            contentType: "text",
            channelType: "slack",
            channelName: channelEntity?.name || "Slack"
          });
        }
      }
    } catch (error) {
      console.error("Error processing Slack webhook:", error);
    }
  }
  
  async sendMessage(recipient: string, content: string): Promise<void> {
    try {
      // Encontrar canal adequado para enviar a mensagem
      // Na implementação atual, usamos o primeiro canal disponível
      // Em um cenário mais complexo, deveríamos determinar o canal com base na conversa
      
      // Pegar o primeiro canal inicializado
      let channelId = -1;
      let channelData: {
        config: SlackConfig;
        client: WebClient;
        initialized: boolean;
      } | null = null;
      
      // Usar o método forEach que é mais compatível com versões anteriores
      this.channels.forEach((data, id) => {
        if (data.initialized && channelId === -1) {
          channelId = id;
          channelData = data;
        }
      });
      
      if (channelId === -1 || !channelData) {
        // Tentar recarregar os canais
        await this.loadChannels();
        
        // Verificar novamente
        this.channels.forEach((data, id) => {
          if (data.initialized && channelId === -1) {
            channelId = id;
            channelData = data;
          }
        });
        
        if (channelId === -1 || !channelData) {
          console.warn("Nenhum canal do Slack inicializado disponível para enviar mensagem.");
          return;
        }
      }
      
      // Use the recipient as the channel ID, or fall back to default channel from config
      const defaultChannelFromConfig = channelData?.config?.channelId;
      const channel = recipient || defaultChannelFromConfig || this.defaultChannelId;
      
      if (!channel) {
        console.warn("Canal Slack não especificado para envio de mensagem");
        return;
      }
      
      if (!channelData.client) {
        console.warn("Cliente Slack não inicializado para o canal selecionado");
        return;
      }
      
      await channelData.client.chat.postMessage({
        channel,
        text: content,
        // Optional: Use blocks for richer message formatting
        // blocks: [
        //   {
        //     type: "section",
        //     text: {
        //       type: "mrkdwn",
        //       text: content
        //     }
        //   }
        // ]
      });
      console.log(`Mensagem enviada com sucesso para o canal ${channel} no Slack usando canal ID ${channelId}`);
    } catch (error) {
      console.error("Erro ao enviar mensagem via Slack:", error);
      // Não relança o erro para não interromper o fluxo da aplicação
      // em caso de problemas com um único canal
    }
  }
}