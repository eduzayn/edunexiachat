import { BaseChannelHandler } from "./index";
import { IStorage } from "../storage";
import { 
  Client, 
  GatewayIntentBits, 
  Events, 
  TextChannel,
  Message,
  REST,
  Routes
} from "discord.js";
import { Channel } from "@shared/schema";

type DiscordConfig = {
  botToken: string;
  channelId: string;
};

export class DiscordHandler extends BaseChannelHandler {
  private channels: Map<number, {
    config: DiscordConfig;
    client: Client;
    ready: boolean;
    connectPromise: Promise<void>;
  }> = new Map();
  
  private defaultTokenFromEnv: string;
  private defaultChannelId: string;
  
  constructor(storage: IStorage, sendEventToAll: (event: any) => void) {
    super({ storage, sendEventToAll });
    
    // Configuração de ambiente (fallback)
    this.defaultTokenFromEnv = process.env.DISCORD_BOT_TOKEN || "";
    this.defaultChannelId = process.env.DISCORD_CHANNEL_ID || "";
    
    // Inicializa os canais do Discord configurados no banco de dados
    this.loadChannels();
  }
  
  /**
   * Carrega todos os canais do Discord configurados no banco de dados
   */
  private async loadChannels(): Promise<void> {
    console.log("Carregando canais do Discord configurados...");
    try {
      // Buscar todos os canais configurados no banco de dados
      const allChannels = await this.storage.getChannels();
      const discordChannels = allChannels.filter(channel => channel.type === "discord");
      
      if (discordChannels.length === 0) {
        console.log("Nenhum canal do Discord configurado no banco de dados.");
        
        // Se tiver um token padrão, inicializar como fallback
        if (this.defaultTokenFromEnv && this.defaultTokenFromEnv.length > 50) {
          console.log("Usando token do Discord configurado nas variáveis de ambiente como fallback.");
          
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
          console.warn("Token do Discord não configurado ou inválido. Integração com Discord estará indisponível.");
        }
        return;
      }
      
      // Inicializar cada canal
      for (const channel of discordChannels) {
        if (channel.isActive) {
          await this.initChannel(channel);
        }
      }
      
      console.log(`Inicializado ${this.channels.size} canais do Discord.`);
    } catch (error) {
      console.error("Erro ao carregar canais do Discord:", error);
    }
  }
  
  /**
   * Inicializa um canal específico do Discord
   */
  async initChannel(channel: Channel): Promise<void> {
    try {
      if (!channel.config) {
        console.warn(`Canal Discord ID ${channel.id} não possui configuração válida.`);
        return;
      }
      
      // Parsear a configuração
      let config: DiscordConfig;
      try {
        config = JSON.parse(channel.config) as DiscordConfig;
      } catch (e) {
        console.error(`Erro ao parsear configuração do canal Discord ID ${channel.id}:`, e);
        return;
      }
      
      // Validar token
      if (!config.botToken || config.botToken.length < 50) {
        console.warn(`Token do Bot do Discord inválido para o canal ID ${channel.id}`);
        return;
      }
      
      // Criar cliente para este canal
      const client = new Client({ 
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.DirectMessages,
        ] 
      });
      
      // Configurar listeners para este cliente
      this.setupEventListeners(client, channel.id);
      
      // Criar dados do canal com promise de conexão
      const channelData = {
        config,
        client,
        ready: false,
        connectPromise: this.connect(client, config.botToken, channel.id)
      };
      
      // Salvar dados do canal
      this.channels.set(channel.id, channelData);
      
      console.log(`Canal Discord ID ${channel.id} inicializado.`);
    } catch (error) {
      console.error(`Erro ao inicializar canal Discord ID ${channel.id}:`, error);
    }
  }
  
  /**
   * Conecta o cliente do Discord com o token fornecido
   */
  private async connect(client: Client, token: string, channelId: number): Promise<void> {
    try {
      // Log in to Discord with token
      await client.login(token);
      console.log(`Discord bot ID ${channelId} connected successfully`);
      
      // Atualizar estado de prontidão
      const channelData = this.channels.get(channelId);
      if (channelData) {
        channelData.ready = true;
        this.channels.set(channelId, channelData);
      }
    } catch (error) {
      console.error(`Failed to connect Discord bot ID ${channelId}:`, error);
      
      // Marcar como não pronto
      const channelData = this.channels.get(channelId);
      if (channelData) {
        channelData.ready = false;
        this.channels.set(channelId, channelData);
      }
    }
  }
  
  /**
   * Configura os listeners de evento para um cliente específico
   */
  private setupEventListeners(client: Client, channelId: number) {
    // Handle ready event
    client.once(Events.ClientReady, (c) => {
      console.log(`Discord bot ID ${channelId} ready! Logged in as ${c.user.tag}`);
    });
    
    // Handle incoming messages
    client.on(Events.MessageCreate, async (message: Message) => {
      try {
        // Ignore messages from bots (including our own)
        if (message.author.bot) return;
        
        // Buscar canal real do banco de dados
        let channelEntity;
        if (channelId > 0) {
          channelEntity = await this.storage.getChannelById(channelId);
        }
        
        // Process the message
        await this.processIncomingMessage({
          from: `${message.author.id}`,
          to: channelEntity?.name || "discord",
          messageId: message.id,
          timestamp: message.createdTimestamp,
          content: message.content,
          contentType: "text",
          channelType: "discord",
          channelName: channelEntity?.name || "Discord"
        });
      } catch (error) {
        console.error(`Error processing Discord message for channel ID ${channelId}:`, error);
      }
    });
  }
  
  async handleWebhook(data: any): Promise<void> {
    // Discord typically uses WebSocket connections through the client
    // This method is kept for API consistency, but most processing
    // happens through the event listeners above
    console.log("Discord webhook received, but processing happens via WebSocket");
  }
  
  async sendMessage(recipient: string, content: string): Promise<void> {
    try {
      // Encontrar canal adequado para enviar a mensagem
      // Na implementação atual, usamos o primeiro canal disponível
      // Em um cenário mais complexo, deveríamos determinar o canal com base na conversa
      
      // Pegar o primeiro canal inicializado
      let channelId = -1;
      let channelData: {
        config: DiscordConfig;
        client: Client;
        ready: boolean;
        connectPromise: Promise<void>;
      } | null = null;
      
      // Usar o método forEach que é mais compatível com versões anteriores
      this.channels.forEach((data, id) => {
        if (data.ready && channelId === -1) {
          channelId = id;
          channelData = data;
        }
      });
      
      if (channelId === -1 || !channelData) {
        // Tentar recarregar os canais
        await this.loadChannels();
        
        // Esperar um momento para que os clientes se conectem
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verificar novamente
        this.channels.forEach((data, id) => {
          if (data.ready && channelId === -1) {
            channelId = id;
            channelData = data;
          }
        });
        
        if (channelId === -1 || !channelData) {
          console.warn("Nenhum canal do Discord inicializado disponível para enviar mensagem.");
          return;
        }
      }
      
      // Verificar se temos dados válidos do canal
      if (!channelData) {
        console.warn("Dados do canal do Discord não encontrados.");
        return;
      }
      
      // Verificar se o bot está conectado
      if (!channelData.ready && channelData.connectPromise) {
        await channelData.connectPromise;
      }
      
      // Se ainda não estiver pronto após esperar
      if (!channelData.client || !channelData.client.isReady()) {
        console.warn(`Discord não configurado corretamente para canal ID ${channelId}. Não foi possível enviar mensagem para ${recipient}`);
        console.info(`Conteúdo da mensagem que seria enviada: ${content}`);
        return; // Retorna sem erro, mas registra alerta
      }
      
      // Use recipient as channel ID, or fall back to default
      const defaultChannelFromConfig = channelData.config?.channelId;
      const discordChannelId = recipient || defaultChannelFromConfig || this.defaultChannelId;
      
      if (!discordChannelId) {
        console.warn("Canal Discord não especificado para envio de mensagem");
        return;
      }
      
      try {
        // Get the channel and send the message
        const channel = await channelData.client.channels.fetch(discordChannelId);
        
        if (!channel || !(channel instanceof TextChannel)) {
          console.warn(`Canal Discord ${discordChannelId} não encontrado ou não é um canal de texto`);
          return;
        }
        
        await channel.send(content);
        console.log(`Mensagem enviada com sucesso para o canal ${discordChannelId} no Discord usando canal ID ${channelId}`);
      } catch (channelError) {
        console.error(`Erro ao acessar canal Discord ${discordChannelId}:`, channelError);
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem via Discord:", error);
      // Não relança o erro para não interromper o fluxo da aplicação
      // em caso de problemas com um único canal
    }
  }
  
  // Cleanup method for graceful shutdown
  async disconnect() {
    // Usar forEach em vez de entries() para evitar problemas de compatibilidade
    this.channels.forEach((channelData, channelId) => {
      if (channelData.client) {
        channelData.client.destroy();
        console.log(`Discord bot ID ${channelId} disconnected`);
      }
    });
  }
}