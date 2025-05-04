import { WhatsAppHandler } from "./whatsapp";
import { IStorage } from "../storage";
import axios from "axios";
import { Channel } from "@shared/schema";

type WhatsappBusinessConfig = {
  accessToken: string;
  phoneNumberId: string;
  businessAccountId?: string;
  version?: string;
};

export class WhatsAppBusinessHandler extends WhatsAppHandler {
  private channels: Map<number, {
    config: WhatsappBusinessConfig;
    initialized: boolean;
  }> = new Map();
  
  // Fallback credentials do ambiente
  private defaultAccessToken: string;
  private defaultPhoneNumberId: string;
  private apiVersion: string;
  
  constructor(storage: IStorage, sendEventToAll: (event: any) => void) {
    super(storage, sendEventToAll);
    
    // Configuração de ambiente (fallback)
    this.defaultAccessToken = process.env.WHATSAPP_BUSINESS_ACCESS_TOKEN || "";
    this.defaultPhoneNumberId = process.env.WHATSAPP_BUSINESS_PHONE_ID || "";
    this.apiVersion = "v18.0"; // Versão atual da Graph API
    
    // Inicializa os canais do WhatsApp Business configurados no banco de dados
    this.loadChannels();
  }
  
  /**
   * Carrega todos os canais do WhatsApp Business configurados no banco de dados
   */
  private async loadChannels(): Promise<void> {
    console.log("Carregando canais do WhatsApp Business configurados...");
    try {
      // Buscar todos os canais configurados no banco de dados
      const allChannels = await this.storage.getChannels();
      const whatsappBusinessChannels = allChannels.filter(channel => channel.type === "whatsapp_business");
      
      if (whatsappBusinessChannels.length === 0) {
        console.log("Nenhum canal do WhatsApp Business configurado no banco de dados.");
        
        // Se tiver credenciais padrão, inicializar como fallback
        if (this.defaultAccessToken && this.defaultPhoneNumberId) {
          console.log("Usando credenciais WhatsApp Business configuradas nas variáveis de ambiente como fallback.");
          
          // Criar um canal virtual com as credenciais do ambiente
          const virtualChannel = {
            id: 0, // ID 0 para canal virtual
            config: JSON.stringify({
              accessToken: this.defaultAccessToken,
              phoneNumberId: this.defaultPhoneNumberId,
              version: this.apiVersion
            }),
            isActive: true
          } as Channel;
          
          await this.initChannel(virtualChannel);
        } else {
          console.warn("Credenciais WhatsApp Business não configuradas. Integração com WhatsApp Business estará indisponível.");
        }
        return;
      }
      
      // Inicializar cada canal
      for (const channel of whatsappBusinessChannels) {
        if (channel.isActive) {
          await this.initChannel(channel);
        }
      }
      
      console.log(`Inicializado ${this.channels.size} canais do WhatsApp Business.`);
    } catch (error) {
      console.error("Erro ao carregar canais do WhatsApp Business:", error);
    }
  }
  
  /**
   * Inicializa um canal específico do WhatsApp Business
   */
  async initChannel(channel: Channel): Promise<void> {
    try {
      if (!channel.config) {
        console.warn(`Canal WhatsApp Business ID ${channel.id} não possui configuração válida.`);
        return;
      }
      
      // Parsear a configuração
      let config: WhatsappBusinessConfig;
      try {
        config = JSON.parse(channel.config) as WhatsappBusinessConfig;
      } catch (e) {
        console.error(`Erro ao parsear configuração do canal WhatsApp Business ID ${channel.id}:`, e);
        return;
      }
      
      // Validar credenciais
      if (!config.accessToken || !config.phoneNumberId) {
        console.warn(`Credenciais WhatsApp Business inválidas para o canal ID ${channel.id}`);
        return;
      }
      
      // Definir a versão da API se não especificada
      if (!config.version) {
        config.version = this.apiVersion;
      }
      
      // Criar dados do canal
      const channelData = {
        config,
        initialized: true
      };
      
      // Verificar se o token é válido fazendo uma requisição à API
      try {
        const response = await axios.get(
          `https://graph.facebook.com/${config.version}/${config.phoneNumberId}`,
          {
            headers: {
              Authorization: `Bearer ${config.accessToken}`
            }
          }
        );
        
        if (response.status === 200) {
          console.log(`Token do WhatsApp Business verificado com sucesso para o canal ID ${channel.id}`);
        } else {
          console.warn(`Falha na verificação do token do WhatsApp Business para o canal ID ${channel.id}`);
          return;
        }
      } catch (error) {
        console.error(`Erro ao verificar token do WhatsApp Business para o canal ID ${channel.id}:`, error);
        return;
      }
      
      // Salvar dados do canal
      this.channels.set(channel.id, channelData);
      
      console.log(`Canal WhatsApp Business ID ${channel.id} inicializado com sucesso.`);
    } catch (error) {
      console.error(`Erro ao inicializar canal WhatsApp Business ID ${channel.id}:`, error);
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
        console.warn(`Recebido webhook para canal WhatsApp Business ID ${channelId} não inicializado.`);
        // Tentar carregar canais novamente
        await this.loadChannels();
        return;
      }
      
      // Buscar canal real do banco de dados
      let channelEntity;
      if (channelId > 0) {
        channelEntity = await this.storage.getChannelById(channelId);
      }
      
      // Processar webhook do WhatsApp Business
      // Formato baseado na documentação da Meta WhatsApp Business API
      if (data.object && data.entry && data.entry.length > 0) {
        for (const entry of data.entry) {
          if (entry.changes && entry.changes.length > 0) {
            for (const change of entry.changes) {
              if (change.field === "messages" && change.value && change.value.messages) {
                for (const message of change.value.messages) {
                  if (message.type === "text" && message.text && message.text.body) {
                    const fromNumber = message.from; // Número de telefone do remetente
                    const messageContent = message.text.body; // Conteúdo da mensagem
                    
                    await this.processIncomingMessage({
                      from: fromNumber,
                      to: channelData.config.phoneNumberId,
                      messageId: message.id,
                      timestamp: parseInt(message.timestamp) || Date.now(),
                      content: messageContent,
                      contentType: "text",
                      channelType: "whatsapp_business",
                      channelName: channelEntity?.name || "WhatsApp Business"
                    });
                  } else if (message.type === "image" || message.type === "audio" || message.type === "document") {
                    // Poderia processar outros tipos de mensagem aqui
                    console.log(`Recebido tipo de mensagem não implementado: ${message.type}`);
                  }
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error processing WhatsApp Business webhook:", error);
    }
  }
  
  async sendMessage(recipient: string, content: string): Promise<void> {
    try {
      // Encontrar canal adequado para enviar a mensagem
      // Na implementação atual, usamos o primeiro canal disponível
      // Em um cenário mais complexo, deveríamos determinar o canal com base na conversa
      
      // Pegar o primeiro canal inicializado
      let channelId = -1;
      let channelConfig: WhatsappBusinessConfig | null = null;
      
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
          console.warn("Nenhum canal do WhatsApp Business inicializado disponível para enviar mensagem.");
          return;
        }
      }
      
      // Verificar se temos credenciais válidas
      if (!channelConfig.accessToken || !channelConfig.phoneNumberId) {
        console.warn("Credenciais WhatsApp Business não configuradas para o canal selecionado.");
        return;
      }
      
      // Limpar formato do número (remover caracteres não numéricos exceto '+')
      // No WhatsApp Business, os números precisam estar em formato internacional com código do país
      let phoneNumber = recipient.replace(/[^\d+]/g, "");
      
      // Adicionar o "+" inicial se não existir
      if (!phoneNumber.startsWith("+")) {
        phoneNumber = `+${phoneNumber}`;
      }
      
      // Enviar a mensagem usando a Graph API
      const version = channelConfig.version || this.apiVersion;
      const response = await axios.post(
        `https://graph.facebook.com/${version}/${channelConfig.phoneNumberId}/messages`,
        {
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: phoneNumber,
          type: "text",
          text: {
            body: content
          }
        },
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${channelConfig.accessToken}`
          }
        }
      );
      
      console.log(`Mensagem enviada com sucesso para ${recipient} via WhatsApp Business usando canal ID ${channelId}`);
      return response.data;
    } catch (error) {
      console.error("Error sending message via WhatsApp Business:", error);
      // Não relança o erro para não interromper o fluxo da aplicação
    }
  }
}