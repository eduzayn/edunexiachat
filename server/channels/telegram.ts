import { BaseChannelHandler } from "./index";
import { IStorage } from "../storage";
import axios from "axios";
import { Channel } from "@shared/schema";

type TelegramConfig = {
  botToken: string;
  username?: string;
  webhookUrl?: string;
};

/**
 * Handler para a integração com o Telegram Bot API
 * 
 * Documentação oficial: https://core.telegram.org/bots/api
 */
export class TelegramHandler extends BaseChannelHandler {
  private channels: Map<number, {
    config: TelegramConfig; 
    apiBaseUrl: string;
    initialized: boolean;
  }> = new Map();
  
  private defaultTokenFromEnv: string;
  private defaultWebhookUrl: string | null;

  constructor(storage: IStorage, sendEventToAll: (event: any) => void) {
    super({ storage, sendEventToAll });
    
    // Configuração de ambiente (fallback)
    this.defaultTokenFromEnv = process.env.TELEGRAM_BOT_TOKEN || "";
    this.defaultWebhookUrl = process.env.TELEGRAM_WEBHOOK_URL || null;
    
    // Inicializa os canais do Telegram configurados no banco de dados
    this.loadChannels();
  }

  /**
   * Carrega todos os canais do Telegram configurados no banco de dados
   */
  private async loadChannels(): Promise<void> {
    console.log("Carregando canais do Telegram configurados...");
    try {
      // Buscar todos os canais configurados no banco de dados
      const allChannels = await this.storage.getChannels();
      const telegramChannels = allChannels.filter(channel => channel.type === "telegram");
      
      if (telegramChannels.length === 0) {
        console.log("Nenhum canal do Telegram configurado no banco de dados.");
        
        // Se tiver um token padrão, inicializar como fallback
        if (this.defaultTokenFromEnv && this.defaultTokenFromEnv.length > 10) {
          console.log("Usando token do Telegram configurado nas variáveis de ambiente como fallback.");
          
          // Criar um canal virtual com o token do ambiente
          const virtualChannel = {
            id: 0, // ID 0 para canal virtual
            config: JSON.stringify({
              botToken: this.defaultTokenFromEnv,
              webhookUrl: this.defaultWebhookUrl
            }),
            isActive: true
          } as Channel;
          
          await this.initChannel(virtualChannel);
        } else {
          console.warn("Token do Telegram não configurado ou inválido. Integração com Telegram estará indisponível.");
        }
        return;
      }
      
      // Inicializar cada canal
      for (const channel of telegramChannels) {
        if (channel.isActive) {
          await this.initChannel(channel);
        }
      }
      
      console.log(`Inicializado ${this.channels.size} canais do Telegram.`);
    } catch (error) {
      console.error("Erro ao carregar canais do Telegram:", error);
    }
  }
  
  /**
   * Inicializa um canal específico do Telegram
   */
  async initChannel(channel: Channel): Promise<void> {
    try {
      if (!channel.config) {
        console.warn(`Canal Telegram ID ${channel.id} não possui configuração válida.`);
        return;
      }
      
      // Parsear a configuração
      let config: TelegramConfig;
      try {
        config = JSON.parse(channel.config) as TelegramConfig;
      } catch (e) {
        console.error(`Erro ao parsear configuração do canal Telegram ID ${channel.id}:`, e);
        return;
      }
      
      // Validar token
      if (!config.botToken || config.botToken.length < 10) {
        console.warn(`Token do Bot do Telegram inválido para o canal ID ${channel.id}`);
        return;
      }
      
      // Criar dados do canal
      const channelData = {
        config,
        apiBaseUrl: `https://api.telegram.org/bot${config.botToken}`,
        initialized: false
      };
      
      // Salvar dados do canal
      this.channels.set(channel.id, channelData);
      
      // Inicializar o bot
      await this.initBot(channel.id);
      
      console.log(`Canal Telegram ID ${channel.id} inicializado com sucesso.`);
    } catch (error) {
      console.error(`Erro ao inicializar canal Telegram ID ${channel.id}:`, error);
    }
  }

  /**
   * Inicializa o bot para um canal específico e configura o webhook
   */
  private async initBot(channelId: number): Promise<void> {
    const channelData = this.channels.get(channelId);
    if (!channelData) {
      console.warn(`Canal Telegram ID ${channelId} não encontrado.`);
      return;
    }
    
    try {
      // Obter informações do bot
      const botInfo = await this.makeRequest(channelId, 'getMe');
      if (!botInfo || !botInfo.id) {
        console.error(`Não foi possível obter informações do bot para o canal ID ${channelId}`);
        return;
      }

      // Guardar o nome de usuário do bot se não estiver definido
      if (!channelData.config.username && botInfo.username) {
        channelData.config.username = botInfo.username;
      }

      // Configurar webhook se a URL estiver definida
      const webhookUrl = channelData.config.webhookUrl || this.defaultWebhookUrl;
      if (webhookUrl) {
        await this.makeRequest(channelId, 'setWebhook', {
          url: `${webhookUrl}/api/webhooks/telegram?channelId=${channelId}`,
          allowed_updates: ['message', 'callback_query', 'inline_query']
        });
        console.log(`Webhook do Telegram configurado para canal ID ${channelId}: ${webhookUrl}/api/webhooks/telegram?channelId=${channelId}`);
      } else {
        console.warn(`URL de webhook do Telegram não configurada para canal ID ${channelId}. Bot precisará usar polling (não implementado).`);
      }

      // Marcar como inicializado
      channelData.initialized = true;
      this.channels.set(channelId, channelData);
      console.log(`Bot do Telegram inicializado para canal ID ${channelId}: @${channelData.config.username || botInfo.username}`);
    } catch (error) {
      console.error(`Erro ao inicializar bot do Telegram para canal ID ${channelId}:`, error);
      // Não remover o canal, pois ele pode ser retentado posteriormente
    }
  }

  /**
   * Método auxiliar para fazer requisições à API do Telegram para um canal específico
   */
  private async makeRequest(channelId: number, method: string, params: any = {}): Promise<any> {
    const channelData = this.channels.get(channelId);
    if (!channelData) {
      throw new Error(`Canal Telegram ID ${channelId} não encontrado`);
    }

    try {
      const response = await axios.post(`${channelData.apiBaseUrl}/${method}`, params);
      if (response.data && response.data.ok) {
        return response.data.result;
      }
      throw new Error(`Erro na API do Telegram: ${response.data.description || 'Erro desconhecido'}`);
    } catch (error: any) {
      console.error(`Erro na requisição do Telegram [${method}] para canal ID ${channelId}:`, error.message);
      throw error;
    }
  }

  /**
   * Processa os webhooks recebidos do Telegram
   */
  async handleWebhook(data: any): Promise<void> {
    try {
      // Verificar se é uma atualização válida do Telegram
      if (!data || (!data.message && !data.callback_query)) {
        return;
      }
      
      // Obter ID do canal a partir da query string ou usar o canal padrão (0)
      let channelId = 0;
      if (data._query && data._query.channelId) {
        channelId = parseInt(data._query.channelId);
      }
      
      // Verificar se o canal existe
      const channelData = this.channels.get(channelId);
      if (!channelData || !channelData.initialized) {
        console.warn(`Recebido webhook para canal Telegram ID ${channelId} não inicializado.`);
        // Tentar carregar canais novamente
        await this.loadChannels();
        return;
      }
      
      // Processar mensagem de texto
      if (data.message && data.message.from) {
        const message = data.message;
        const chatId = message.chat.id.toString();
        const username = message.from.username || 
                        `${message.from.first_name} ${message.from.last_name || ''}`.trim();
        
        // Buscar canal real do banco de dados
        let channelEntity;
        if (channelId > 0) {
          channelEntity = await this.storage.getChannelById(channelId);
        }
        
        // Processar diferentes tipos de conteúdo
        if (message.text) {
          // Mensagem de texto simples
          await this.processIncomingMessage({
            from: chatId,
            to: channelEntity?.name || 'telegram',
            messageId: `${message.message_id}`,
            timestamp: message.date * 1000, // Converter timestamp Unix para milissegundos
            content: message.text,
            contentType: "text",
            channelType: "telegram",
            channelName: channelEntity?.name || "Telegram"
          });
        } else if (message.photo) {
          // Mensagem com foto
          const photoId = message.photo[message.photo.length - 1].file_id; // Pegar a versão de maior resolução
          const caption = message.caption || "";
          
          await this.processIncomingMessage({
            from: chatId,
            to: channelEntity?.name || 'telegram',
            messageId: `${message.message_id}`,
            timestamp: message.date * 1000,
            content: JSON.stringify({
              type: "photo",
              fileId: photoId,
              caption: caption
            }),
            contentType: "image",
            channelType: "telegram",
            channelName: channelEntity?.name || "Telegram"
          });
        } else if (message.document) {
          // Mensagem com documento
          await this.processIncomingMessage({
            from: chatId,
            to: channelEntity?.name || 'telegram',
            messageId: `${message.message_id}`,
            timestamp: message.date * 1000,
            content: JSON.stringify({
              type: "document",
              fileId: message.document.file_id,
              fileName: message.document.file_name,
              fileSize: message.document.file_size,
              mimeType: message.document.mime_type,
              caption: message.caption || ""
            }),
            contentType: "file",
            channelType: "telegram",
            channelName: channelEntity?.name || "Telegram"
          });
        } else if (message.voice) {
          // Mensagem de áudio/voz
          await this.processIncomingMessage({
            from: chatId,
            to: channelEntity?.name || 'telegram',
            messageId: `${message.message_id}`,
            timestamp: message.date * 1000,
            content: JSON.stringify({
              type: "voice",
              fileId: message.voice.file_id,
              duration: message.voice.duration,
              caption: message.caption || ""
            }),
            contentType: "audio",
            channelType: "telegram",
            channelName: channelEntity?.name || "Telegram"
          });
        }
      }
      
      // Processar callback_query (botões interativos)
      if (data.callback_query) {
        const query = data.callback_query;
        const chatId = query.message.chat.id.toString();
        
        // Responder ao callback para remover o estado de "carregando" no botão
        await this.makeRequest(channelId, 'answerCallbackQuery', {
          callback_query_id: query.id
        });
        
        // Buscar canal real do banco de dados
        let channelEntity;
        if (channelId > 0) {
          channelEntity = await this.storage.getChannelById(channelId);
        }
        
        // Processar a interação como uma mensagem
        await this.processIncomingMessage({
          from: chatId,
          to: channelEntity?.name || 'telegram',
          messageId: `callback_${query.id}`,
          timestamp: Date.now(),
          content: `[Botão] ${query.data}`,
          contentType: "text",
          channelType: "telegram",
          channelName: channelEntity?.name || "Telegram"
        });
      }
    } catch (error) {
      console.error("Erro ao processar webhook do Telegram:", error);
    }
  }

  /**
   * Envia mensagem para um destinatário via Telegram
   * @param recipient ID do destinatário (chatId)
   * @param content Conteúdo da mensagem (texto ou JSON)
   */
  async sendMessage(recipient: string, content: string): Promise<void> {
    try {
      // Encontrar canal adequado para enviar a mensagem
      // Na implementação atual, usamos o primeiro canal disponível
      // Em um cenário mais complexo, deveríamos determinar o canal com base na conversa
      
      // Pegar o primeiro canal inicializado
      let channelId = -1;
      // Usar o método forEach que é mais compatível com versões anteriores
      this.channels.forEach((data, id) => {
        if (data.initialized && channelId === -1) {
          channelId = id;
        }
      });
      
      if (channelId === -1) {
        // Tentar recarregar os canais
        await this.loadChannels();
        
        // Verificar novamente
        this.channels.forEach((data, id) => {
          if (data.initialized && channelId === -1) {
            channelId = id;
          }
        });
        
        if (channelId === -1) {
          console.warn("Nenhum canal do Telegram inicializado disponível para enviar mensagem.");
          return;
        }
      }

      // Verificar se o conteúdo é JSON (para mensagens mais complexas)
      try {
        const parsedContent = JSON.parse(content);
        
        // Enviar diferentes tipos de mensagem com base no tipo
        if (parsedContent.type === "photo") {
          await this.makeRequest(channelId, 'sendPhoto', {
            chat_id: recipient,
            photo: parsedContent.url || parsedContent.fileId,
            caption: parsedContent.caption || "",
            parse_mode: 'HTML'
          });
          return;
        } else if (parsedContent.type === "document") {
          await this.makeRequest(channelId, 'sendDocument', {
            chat_id: recipient,
            document: parsedContent.url || parsedContent.fileId,
            caption: parsedContent.caption || "",
            parse_mode: 'HTML'
          });
          return;
        } else if (parsedContent.type === "buttons") {
          // Enviar mensagem com botões inline
          await this.makeRequest(channelId, 'sendMessage', {
            chat_id: recipient,
            text: parsedContent.text || "Selecione uma opção:",
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: this.formatButtons(parsedContent.buttons)
            }
          });
          return;
        }
      } catch (e) {
        // Não é JSON, tratar como texto simples
      }

      // Mensagem de texto simples (fallback padrão)
      await this.makeRequest(channelId, 'sendMessage', {
        chat_id: recipient,
        text: content,
        parse_mode: 'HTML'
      });
    } catch (error) {
      console.error("Erro ao enviar mensagem via Telegram:", error);
      // Não lançar erro para não interromper o fluxo
    }
  }

  /**
   * Formata os botões para o formato esperado pelo Telegram
   */
  private formatButtons(buttons: Array<{text: string, value: string}>): any[][] {
    // Organizar os botões em linhas (máximo de 2 botões por linha)
    const keyboard = [];
    let row = [];
    
    for (const button of buttons) {
      row.push({
        text: button.text,
        callback_data: button.value
      });
      
      // Criar nova linha após 2 botões
      if (row.length === 2) {
        keyboard.push([...row]);
        row = [];
      }
    }
    
    // Adicionar os botões restantes, se houver
    if (row.length > 0) {
      keyboard.push(row);
    }
    
    return keyboard;
  }
}