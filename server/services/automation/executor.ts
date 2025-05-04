/**
 * Executa ações de automação com base em tipos e contexto
 */

import { IStorage } from '../../storage';
import { MessageTemplater } from './message-templater';
import { Automation, Message, Channel } from '@shared/schema';
import { AutomationContext } from './index';
import lodash from 'lodash';
import { AiService } from '../ai/index';
import type { jsonb } from 'drizzle-orm/pg-core';

const { get, merge } = lodash;

/**
 * Classe para execução de automações
 */
export class AutomationExecutor {
  private storage: IStorage;
  private templater: MessageTemplater;

  constructor(storage: IStorage, templater: MessageTemplater) {
    this.storage = storage;
    this.templater = templater;
  }


  /**
   * Executa uma automação
   * @param automation Automação a ser executada
   * @param context Contexto para execução
   * @returns Resultado da execução
   */
  async execute(automation: Automation, context: AutomationContext): Promise<{
    success: boolean;
    response?: string;
    message?: Message;
    error?: string;
  }> {
    try {
      // Atualizar data da última execução
      await this.storage.updateAutomation(automation.id, {
        lastExecutedAt: new Date()
      });

      // Escolher método de execução com base no tipo
      switch (automation.type) {
        case 'quick_reply':
          return this.executeQuickReply(automation, context);
        case 'chatbot':
          return this.executeChatbot(automation, context);
        case 'trigger':
          return this.executeTrigger(automation, context);
        case 'scheduled':
          return this.executeScheduled(automation, context);
        default:
          throw new Error(`Tipo de automação desconhecido: ${automation.type}`);
      }
    } catch (error: any) {
      console.error(`Erro ao executar automação ${automation.id}:`, error);
      return {
        success: false,
        error: error.message || 'Erro desconhecido durante execução da automação',
      };
    }
  }

  /**
   * Executa automação de resposta rápida
   * @param automation Automação de resposta rápida
   * @param context Contexto para execução
   * @returns Resultado da execução
   */
  private async executeQuickReply(
    automation: Automation,
    context: AutomationContext
  ): Promise<{
    success: boolean;
    response?: string;
    message?: Message;
    error?: string;
  }> {
    try {
      // Verificar se há mensagem de entrada e conversa
      if (!context.incomingMessage || !context.conversation) {
        return {
          success: false,
          error: 'Contexto incompleto: mensagem ou conversa ausente',
        };
      }

      // Obter conteúdo da mensagem de entrada
      const incomingContent = context.incomingMessage.content.toLowerCase();
      
      // Obter palavras-chave da automação
      const triggerConfig = (automation.trigger || {}) as any;
      const keywords: string[] = triggerConfig.keywords || [];
      
      // Se não houver palavras-chave definidas, não executar
      if (!keywords.length) {
        return {
          success: false,
          error: 'Nenhuma palavra-chave definida para resposta rápida',
        };
      }
      
      // Verificar se alguma palavra-chave está presente na mensagem
      const matchFound = keywords.some(keyword => 
        incomingContent.includes(keyword.toLowerCase())
      );
      
      if (!matchFound) {
        return {
          success: false,
          error: 'Nenhuma correspondência encontrada para as palavras-chave',
        };
      }
      
      // Processar template de resposta
      const responseTemplate = automation.response as string || '';
      const processedResponse = this.templater.processTemplate(responseTemplate, context);
      
      // Criar e enviar mensagem de resposta
      const message = await this.storage.createMessage({
        conversationId: context.conversation.id,
        content: processedResponse,
        contentType: 'text',
        direction: 'outbound',
        status: 'sent',
        sentById: null, // Sistema
      });
      
      // Enviar a mensagem pelo canal apropriado
      if (context.channel) {
        await this.sendMessageViaChannel(
          context.channel,
          context.conversation.contactIdentifier,
          processedResponse
        );
      }
      
      return {
        success: true,
        response: processedResponse,
        message,
      };
    } catch (error: any) {
      console.error('Erro ao executar resposta rápida:', error);
      return {
        success: false,
        error: error.message || 'Erro desconhecido ao executar resposta rápida',
      };
    }
  }

  /**
   * Executa automação de chatbot com IA
   * @param automation Automação de chatbot
   * @param context Contexto para execução
   * @returns Resultado da execução
   */
  private async executeChatbot(
    automation: Automation,
    context: AutomationContext
  ): Promise<{
    success: boolean;
    response?: string;
    message?: Message;
    error?: string;
  }> {
    try {
      // Verificar se há mensagem de entrada e conversa
      if (!context.incomingMessage || !context.conversation) {
        return {
          success: false,
          error: 'Contexto incompleto: mensagem ou conversa ausente',
        };
      }

      // Obter configuração do modelo de IA
      const modelProvider = automation.modelProvider || 'openai';
      const modelConfig = (automation.modelConfig || {}) as Record<string, any>;
      
      // Obter histórico de mensagens recentes
      const recentMessages = context.messages || [];
      
      // Preparar prompt para a IA
      const systemPrompt = get(automation, 'response.prompt', '') as string;
      const formattedSystemPrompt = this.templater.processTemplate(systemPrompt, context);
      
      // Criar prompt completo com histórico de conversa
      let fullPrompt = `${formattedSystemPrompt}\n\nHistórico de conversa:\n`;
      
      // Adicionar histórico de mensagens ao prompt
      recentMessages.forEach(msg => {
        const role = msg.direction === 'inbound' ? 'Cliente' : 'Atendente';
        fullPrompt += `${role}: ${msg.content}\n`;
      });
      
      // Adicionar mensagem atual do usuário
      fullPrompt += `\nCliente: ${context.incomingMessage.content}\n\nResposta:`;
      
      // Gerar resposta com o serviço de IA
      let aiResponseText: string;
      try {
        // Inicializar serviço de IA
        const aiService = new AiService(this.storage);
        
        // Usar o método answerQuestion para gerar a resposta
        aiResponseText = await aiService.answerQuestion(
          context.incomingMessage.content,
          context.conversation.id,
          context.conversation.contactId,
          context.conversation.channelId
        );
        
        if (!aiResponseText) {
          throw new Error('Resposta vazia da IA');
        }
      } catch (error) {
        console.error('Erro ao gerar resposta com o modelo:', error);
        return {
          success: false,
          error: `Erro ao gerar resposta com o provedor ${modelProvider}: ${error}`
        };
      }
      
      if (!aiResponseText) {
        return {
          success: false,
          error: 'Resposta vazia do serviço de IA'
        };
      }
      
      // Processar a resposta gerada pela IA (substituir variáveis se houver)
      const processedResponse = this.templater.processTemplate(aiResponseText, context);
      
      // Criar e enviar mensagem de resposta
      const message = await this.storage.createMessage({
        conversationId: context.conversation.id,
        content: processedResponse,
        contentType: 'text',
        direction: 'outbound',
        status: 'sent',
        sentById: null, // Sistema
      });
      
      // Enviar a mensagem pelo canal apropriado
      if (context.channel) {
        await this.sendMessageViaChannel(
          context.channel,
          context.conversation.contactIdentifier,
          processedResponse
        );
      }
      
      return {
        success: true,
        response: processedResponse,
        message,
      };
    } catch (error: any) {
      console.error('Erro ao executar chatbot:', error);
      return {
        success: false,
        error: error.message || 'Erro desconhecido ao executar chatbot',
      };
    }
  }

  /**
   * Executa automação baseada em gatilho
   * @param automation Automação de gatilho
   * @param context Contexto para execução
   * @returns Resultado da execução
   */
  private async executeTrigger(
    automation: Automation,
    context: AutomationContext
  ): Promise<{
    success: boolean;
    response?: string;
    message?: Message;
    error?: string;
  }> {
    try {
      // Verificar se há conversa
      if (!context.conversation) {
        return {
          success: false,
          error: 'Contexto incompleto: conversa ausente',
        };
      }

      // Obter configuração de ações
      const triggerConfig = (automation.trigger || {}) as any;
      const actions = triggerConfig.actions || [];
      
      // Se não houver ações definidas, não executar
      if (!actions.length) {
        return {
          success: false,
          error: 'Nenhuma ação definida para o gatilho',
        };
      }
      
      // Processar e executar cada ação
      for (const action of actions) {
        await this.executeAction(action, context);
      }
      
      // Se houver mensagem de resposta configurada, enviá-la
      const responseTemplate = automation.response as string || '';
      
      if (responseTemplate) {
        const processedResponse = this.templater.processTemplate(responseTemplate, context);
        
        // Criar e enviar mensagem de resposta
        const message = await this.storage.createMessage({
          conversationId: context.conversation.id,
          content: processedResponse,
          contentType: 'text',
          direction: 'outbound',
          status: 'sent',
          sentById: null, // Sistema
        });
        
        // Enviar a mensagem pelo canal apropriado
        if (context.channel) {
          await this.sendMessageViaChannel(
            context.channel,
            context.conversation.contactIdentifier,
            processedResponse
          );
        }
        
        return {
          success: true,
          response: processedResponse,
          message,
        };
      }
      
      return {
        success: true,
      };
    } catch (error: any) {
      console.error('Erro ao executar gatilho:', error);
      return {
        success: false,
        error: error.message || 'Erro desconhecido ao executar gatilho',
      };
    }
  }

  /**
   * Executa automação agendada
   * @param automation Automação agendada
   * @param context Contexto para execução
   * @returns Resultado da execução
   */
  private async executeScheduled(
    automation: Automation,
    context: AutomationContext
  ): Promise<{
    success: boolean;
    response?: string;
    message?: Message;
    error?: string;
  }> {
    try {
      // Verificar se há conversa
      if (!context.conversation) {
        return {
          success: false,
          error: 'Contexto incompleto: conversa ausente',
        };
      }

      // Obter configuração de ações
      const scheduleConfig = (automation.schedule || {}) as any;
      const actions = scheduleConfig.actions || [];
      
      // Executar ações configuradas
      for (const action of actions) {
        await this.executeAction(action, context);
      }
      
      // Se houver mensagem a ser enviada, processá-la e enviá-la
      const responseTemplate = automation.response as string || '';
      
      if (responseTemplate) {
        const processedResponse = this.templater.processTemplate(responseTemplate, context);
        
        // Criar e enviar mensagem
        const message = await this.storage.createMessage({
          conversationId: context.conversation.id,
          content: processedResponse,
          contentType: 'text',
          direction: 'outbound',
          status: 'sent',
          sentById: null, // Sistema
        });
        
        // Enviar a mensagem pelo canal apropriado
        if (context.channel) {
          await this.sendMessageViaChannel(
            context.channel,
            context.conversation.contactIdentifier,
            processedResponse
          );
        }
        
        return {
          success: true,
          response: processedResponse,
          message,
        };
      }
      
      return {
        success: true,
      };
    } catch (error: any) {
      console.error('Erro ao executar automação agendada:', error);
      return {
        success: false,
        error: error.message || 'Erro desconhecido ao executar automação agendada',
      };
    }
  }

  /**
   * Executa uma ação específica
   * @param action Ação a ser executada
   * @param context Contexto para execução
   */
  private async executeAction(action: any, context: AutomationContext): Promise<void> {
    try {
      if (!action || !action.type) {
        throw new Error('Ação inválida ou tipo não especificado');
      }

      // Obter dados da ação
      const actionType = action.type;
      
      // Executar com base no tipo de ação
      switch (actionType) {
        case 'update_conversation_status': {
          // Atualizar status da conversa
          if (!context.conversation) {
            throw new Error('Conversa não disponível no contexto');
          }
          
          const newStatus = action.status || 'open';
          await this.storage.updateConversation(context.conversation.id, {
            status: newStatus,
          });
          break;
        }
        
        case 'assign_to_user': {
          // Atribuir conversa a um usuário
          if (!context.conversation) {
            throw new Error('Conversa não disponível no contexto');
          }
          
          const userId = action.userId || null;
          if (userId) {
            await this.storage.assignConversation(context.conversation.id, userId);
          } else {
            throw new Error('ID do usuário não especificado para atribuição');
          }
          break;
        }
        
        case 'add_tag_to_contact': {
          // Adicionar tag ao contato
          if (!context.contact) {
            throw new Error('Contato não disponível no contexto');
          }
          
          const tag = action.tag;
          if (!tag) {
            throw new Error('Tag não especificada');
          }
          
          const currentTags = context.contact.tags || [];
          if (!currentTags.includes(tag)) {
            const updatedTags = [...currentTags, tag];
            await this.storage.updateContact(context.contact.id, {
              tags: updatedTags,
            });
          }
          break;
        }
        
        case 'remove_tag_from_contact': {
          // Remover tag do contato
          if (!context.contact) {
            throw new Error('Contato não disponível no contexto');
          }
          
          const tag = action.tag;
          if (!tag) {
            throw new Error('Tag não especificada');
          }
          
          const currentTags = context.contact.tags || [];
          if (currentTags.includes(tag)) {
            const updatedTags = currentTags.filter(t => t !== tag);
            await this.storage.updateContact(context.contact.id, {
              tags: updatedTags,
            });
          }
          break;
        }
        
        case 'update_contact_field': {
          // Atualizar campo do contato
          if (!context.contact) {
            throw new Error('Contato não disponível no contexto');
          }
          
          const field = action.field;
          const value = action.value;
          
          if (!field) {
            throw new Error('Campo não especificado para atualização');
          }
          
          // Processar o valor com o templater se for string
          const processedValue = typeof value === 'string'
            ? this.templater.processTemplate(value, context)
            : value;
          
          // Criar objeto de atualização com o campo específico
          const updateData: Record<string, any> = {};
          updateData[field] = processedValue;
          
          await this.storage.updateContact(context.contact.id, updateData);
          break;
        }
        
        case 'create_activity': {
          // Criar atividade relacionada ao contato
          if (!context.contact) {
            throw new Error('Contato não disponível no contexto');
          }
          
          const activityType = action.activityType || 'task';
          const title = action.title || 'Atividade criada por automação';
          const description = action.description || '';
          const status = action.status || 'pending';
          const priority = action.priority || 'medium';
          const userId = action.userId || null;
          
          // Calcular data de vencimento se fornecida
          let dueDate: Date | undefined;
          if (action.dueDays) {
            dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + parseInt(action.dueDays));
          }
          
          // Processar campos de texto com o templater
          const processedTitle = this.templater.processTemplate(title, context);
          const processedDescription = this.templater.processTemplate(description, context);
          
          // Criar a atividade
          await this.storage.createActivity({
            contactId: context.contact.id,
            type: activityType,
            title: processedTitle, 
            description: processedDescription,
            status: status,
            priority: priority,
            dueDate: dueDate || new Date(),
            userId: userId
          });
          break;
        }
        
        case 'create_deal': {
          // Criar negócio/oportunidade relacionada ao contato
          if (!context.contact) {
            throw new Error('Contato não disponível no contexto');
          }
          
          const dealName = action.dealName || 'Negócio criado por automação';
          const stage = action.stage || 'prospect';
          const value = action.value || 0;
          const currency = action.currency || 'BRL';
          const owner = action.userId || null;
          
          // Processar campos de texto com o templater
          const processedName = this.templater.processTemplate(dealName, context);
          
          // Criar o negócio
          await this.storage.createDeal({
            contactId: context.contact.id,
            name: processedName,
            stage: stage,
            value: parseFloat(value),
            currency: currency,
            userId: owner
          });
          break;
        }
        
        case 'send_satisfaction_survey': {
          // Enviar pesquisa de satisfação
          if (!context.conversation || !context.contact) {
            throw new Error('Conversa ou contato não disponível no contexto');
          }
          
          const surveyType = action.surveyType || 'nps';
          const sendInMessage = action.sendInMessage !== false; // padrão: true
          
          // Criar registro de pesquisa
          const survey = await this.storage.createSatisfactionSurvey({
            conversationId: context.conversation.id,
            contactId: context.contact.id,
            userId: context.conversation.assignedToId,
            surveyType: surveyType,
            source: 'automation',
            surveyData: {
              automationId: action.automationId || null,
              questions: action.questions || []
            }
          });
          
          // Gerar link ou mensagem para pesquisa
          const surveyLink = `${process.env.PUBLIC_URL || ''}/survey/${survey.id}`;
          
          // Se configurado, enviar mensagem com o link
          if (sendInMessage) {
            const messageTemplate = action.messageTemplate ||
              'Por favor, responda nossa pesquisa de satisfação: {{surveyLink}}';
            
            // Adicionar link da pesquisa ao contexto
            const surveyContext = {
              ...context,
              variables: {
                ...context.variables,
                surveyLink
              }
            };
            
            // Processar template da mensagem
            const processedMessage = this.templater.processTemplate(messageTemplate, surveyContext);
            
            // Criar e enviar mensagem
            const message = await this.storage.createMessage({
              conversationId: context.conversation.id,
              content: processedMessage,
              contentType: 'text',
              direction: 'outbound',
              status: 'sent',
              sentById: null, // Sistema
            });
            
            // Enviar a mensagem pelo canal apropriado
            if (context.channel) {
              await this.sendMessageViaChannel(
                context.channel,
                context.conversation.contactIdentifier,
                processedMessage
              );
            }
          }
          break;
        }
        
        case 'send_notification': {
          // Enviar notificação interna no sistema
          const title = action.title || 'Notificação de automação';
          const message = action.message || 'Ação automatizada executada';
          const recipientId = action.userId || null;
          const priority = action.priority || 'normal';
          const category = action.category || 'automation';
          
          // Processar campos de texto com o templater
          const processedTitle = this.templater.processTemplate(title, context);
          const processedMessage = this.templater.processTemplate(message, context);
          
          // Criar dados da notificação
          const notificationData: Record<string, any> = {};
          
          // Adicionar referências
          if (context.conversation) {
            notificationData.conversationId = context.conversation.id;
          }
          
          if (context.contact) {
            notificationData.contactId = context.contact.id;
          }
          
          // Criar a notificação
          await this.storage.createNotification({
            userId: recipientId,
            title: processedTitle,
            message: processedMessage,
            priority: priority as any,
            category: category as any,
            isRead: false,
            data: notificationData as Json
          });
          break;
        }
        
        case 'execute_webhook': {
          // Executa uma chamada de webhook para sistema externo
          const url = action.url;
          const method = action.method || 'POST';
          const headers = action.headers || {};
          const body = action.body || {};
          
          if (!url) {
            throw new Error('URL não especificada para webhook');
          }
          
          // Processar URL e corpo da requisição
          const processedUrl = this.templater.processTemplate(url, context);
          const processedBody = this.templater.processJSONTemplate(body, context);
          
          // Processar headers
          const processedHeaders: Record<string, string> = {};
          for (const [key, value] of Object.entries(headers)) {
            if (typeof value === 'string') {
              processedHeaders[key] = this.templater.processTemplate(value, context);
            } else {
              processedHeaders[key] = String(value);
            }
          }
          
          // Adicionar header Content-Type se não existir
          if (!processedHeaders['Content-Type']) {
            processedHeaders['Content-Type'] = 'application/json';
          }
          
          // Executar a requisição
          try {
            const response = await fetch(processedUrl, {
              method,
              headers: processedHeaders,
              body: method !== 'GET' ? JSON.stringify(processedBody) : undefined,
            });
            
            // Verificar se a resposta foi bem-sucedida
            if (!response.ok) {
              throw new Error(`Erro ao chamar webhook: ${response.status} ${response.statusText}`);
            }
          } catch (error: any) {
            console.error('Erro ao executar webhook:', error);
            throw new Error(`Falha na execução do webhook: ${error.message}`);
          }
          break;
        }
        
        default:
          throw new Error(`Tipo de ação desconhecido: ${actionType}`);
      }
    } catch (error: any) {
      console.error(`Erro ao executar ação ${action?.type}:`, error);
      throw error;
    }
  }

  /**
   * Envia mensagem através do canal apropriado
   * @param channel Canal para envio
   * @param recipient Identificador do destinatário
   * @param content Conteúdo da mensagem
   */
  private async sendMessageViaChannel(
    channel: Channel,
    recipient: string,
    content: string
  ): Promise<void> {
    // Implementar com base nos manipuladores de canais disponíveis
    // Este método deve integrar com o sistema de canais do projeto
    
    // Exemplo simples que apenas registra a intenção
    console.log(
      `Enviando mensagem pelo canal ${channel.type} para ${recipient}: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`
    );
    
    // Implementação real pode ser adicionada conforme necessário
  }
}