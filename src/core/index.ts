/**
 * Serviço principal de automação
 * Coordena a detecção, avaliação e execução de automações
 */

import { IStorage } from './server/storage';
import { Automation, Message } from './shared/schema';
import { RuleEngine } from './server/services/rule-engine';
import { MessageTemplater } from './server/services/message-templater';
import { AutomationExecutor } from './server/services/executor';

// Função simples de log para substituir log de vite
function log(message: string, category: string = 'app', level: string = 'info'): void {
  console.log(`[${new Date().toISOString()}] [${level.toUpperCase()}] [${category}] ${message}`);
}

/**
 * Contexto para execução de automações
 */
export interface AutomationContext {
  conversation?: any;
  contact?: any;
  channel?: any;
  messages?: any[];
  incomingMessage?: any;
  lastMessage?: any;
  variables?: Record<string, any>;
}

/**
 * Resultado da execução de automação
 */
export interface AutomationResult {
  success: boolean;
  message?: Message;
  response?: string;
  error?: string;
}

/**
 * Serviço principal para gerenciamento de automações
 */
export class AutomationService {
  private storage: IStorage;
  private ruleEngine: RuleEngine;
  private templater: MessageTemplater;
  private executor: AutomationExecutor;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.ruleEngine = new RuleEngine();
    this.templater = new MessageTemplater();
    this.executor = new AutomationExecutor(storage, this.templater);
  }

  /**
   * Processa uma nova mensagem para verificar automações
   * @param message Mensagem recebida
   * @returns Resultado das automações processadas
   */
  async processIncomingMessage(message: Message): Promise<AutomationResult[]> {
    try {
      // Verificar se a mensagem é de entrada
      if (message.direction !== 'inbound') {
        return [];
      }

      // Obter dados de contexto
      const conversation = await this.storage.getConversationById(message.conversationId);
      if (!conversation) {
        throw new Error(`Conversa ${message.conversationId} não encontrada`);
      }

      // Obter contato relacionado à conversa
      const contact = conversation.contactId 
        ? await this.storage.getContactById(conversation.contactId)
        : null;

      // Obter canal relacionado à conversa
      const channel = conversation.channelId
        ? await this.storage.getChannelById(conversation.channelId)
        : null;

      // Obter mensagens recentes da conversa
      const messages = await this.storage.getMessagesByConversationId(message.conversationId);

      // Compilar o contexto para avaliação
      const context: AutomationContext = {
        conversation,
        contact,
        channel,
        messages,
        incomingMessage: message,
        lastMessage: message
      };

      // Obter automações ativas
      const automations = await this.storage.getAutomations();
      const activeAutomations = automations.filter(a => a.isActive);

      // Filtrar automações relevantes para o evento
      // Respostas rápidas e chatbots são acionados por mensagens de entrada
      const applicableAutomations = activeAutomations.filter(a => 
        a.type === 'quick_reply' || a.type === 'chatbot' || a.type === 'trigger'
      );

      // Resultados das automações executadas
      const results: AutomationResult[] = [];
      
      // Executar cada automação aplicável
      for (const automation of applicableAutomations) {
        // Verificar regras específicas para o tipo de automação
        if (this.shouldExecuteAutomation(automation, context)) {
          const result = await this.executor.execute(automation, context);
          results.push(result);
          
          // Registrar a execução
          log(`Automação ${automation.id} (${automation.name}) executada: ${result.success ? 'sucesso' : 'falha'}`, 'automation');
          if (!result.success && result.error) {
            log(`Erro na automação ${automation.id}: ${result.error}`, 'automation');
          }
        }
      }

      return results;
    } catch (error: any) {
      log(`Erro ao processar automações para mensagem ${message.id}: ${error.message}`, 'automation', 'error');
      return [{
        success: false,
        error: error.message || 'Erro desconhecido ao processar automações'
      }];
    }
  }

  /**
   * Avalia se uma automação deve ser executada no contexto atual
   * @param automation Automação a ser avaliada
   * @param context Contexto atual
   * @returns true se a automação deve ser executada
   */
  private shouldExecuteAutomation(automation: Automation, context: AutomationContext): boolean {
    try {
      switch (automation.type) {
        case 'quick_reply': {
          // Verificar palavras-chave nas respostas rápidas
          const triggerConfig = (automation.trigger || {}) as any;
          const keywords: string[] = triggerConfig.keywords || [];
          
          if (!context.incomingMessage || !keywords.length) {
            return false;
          }
          
          const incomingContent = context.incomingMessage.content.toLowerCase();
          return keywords.some(keyword => 
            incomingContent.includes(keyword.toLowerCase())
          );
        }
        
        case 'chatbot': {
          // Chatbots respondem a todas as mensagens se estiverem ativos,
          // mas podem ter regras adicionais
          if (!context.incomingMessage) {
            return false;
          }
          
          const triggerConfig = (automation.trigger || {}) as any;
          const rules = triggerConfig.rules || [];
          
          // Se não houver regras, executar sempre
          if (!rules.length) {
            return true;
          }
          
          // Caso contrário, avaliar as regras
          return this.ruleEngine.evaluateRules(rules, context);
        }
        
        case 'trigger': {
          // Automações baseadas em gatilho têm regras específicas
          const triggerConfig = (automation.trigger || {}) as any;
          const rules = triggerConfig.rules || [];
          
          if (!rules.length) {
            return false; // Sem regras, não executar
          }
          
          return this.ruleEngine.evaluateRules(rules, context);
        }
        
        case 'scheduled':
          // Automações agendadas não são acionadas por mensagens
          return false;
          
        default:
          return false;
      }
    } catch (error: any) {
      log(`Erro ao avaliar automação ${automation.id}: ${error.message}`, 'automation', 'error');
      return false;
    }
  }
  
  /**
   * Verifica e executa automações agendadas
   * @returns Resultado das automações processadas
   */
  async processScheduledAutomations(): Promise<AutomationResult[]> {
    try {
      log('Verificando automações agendadas...', 'scheduler');
      
      // Obter automações agendadas ativas
      const automations = await this.storage.getAutomations('scheduled');
      const activeAutomations = automations.filter(a => a.isActive);
      
      if (activeAutomations.length === 0) {
        log('Nenhuma automação agendada ativa encontrada', 'scheduler');
        return [];
      }
      
      log(`Encontradas ${activeAutomations.length} automações agendadas ativas`, 'scheduler');
      
      // Resultados das automações executadas
      const results: AutomationResult[] = [];
      
      // Verificar cada automação agendada
      for (const automation of activeAutomations) {
        // Verificar se é hora de executar
        if (this.ruleEngine.evaluateSchedule(automation)) {
          log(`Executando automação agendada ${automation.id} (${automation.name})`, 'scheduler');
          
          // Obter contexto para automação agendada
          const context = await this.getContextForScheduledAutomation(automation);
          
          if (!context) {
            log(`Não foi possível obter contexto para automação ${automation.id}`, 'scheduler', 'warn');
            continue;
          }
          
          // Executar a automação
          const result = await this.executor.execute(automation, context);
          results.push(result);
          
          // Registrar a execução
          log(`Automação agendada ${automation.id} executada: ${result.success ? 'sucesso' : 'falha'}`, 'scheduler');
          if (!result.success && result.error) {
            log(`Erro na automação agendada ${automation.id}: ${result.error}`, 'scheduler', 'error');
          }
        }
      }
      
      return results;
    } catch (error: any) {
      log(`Erro ao processar automações agendadas: ${error.message}`, 'scheduler', 'error');
      return [{
        success: false,
        error: error.message || 'Erro desconhecido ao processar automações agendadas'
      }];
    }
  }
  
  /**
   * Obtém contexto para execução de automação agendada
   * @param automation Automação agendada
   * @returns Contexto para execução
   */
  private async getContextForScheduledAutomation(automation: Automation): Promise<AutomationContext | null> {
    try {
      const config = automation.schedule || {}; 
      const targetType = (config as any).targetType || 'all';
      const targetId = (config as any).targetId;
      
      // Baseado no tipo de alvo, obter dados relevantes
      switch (targetType) {
        case 'conversation': {
          // Alvo é uma conversa específica
          if (!targetId) {
            log(`Automação ${automation.id} não especifica ID da conversa`, 'scheduler', 'warn');
            return null;
          }
          
          const conversation = await this.storage.getConversationById(Number(targetId));
          if (!conversation) {
            log(`Conversa ${targetId} não encontrada para automação ${automation.id}`, 'scheduler', 'warn');
            return null;
          }
          
          // Obter contato relacionado à conversa
          const contact = conversation.contactId 
            ? await this.storage.getContactById(conversation.contactId)
            : null;
          
          // Obter canal relacionado à conversa
          const channel = conversation.channelId
            ? await this.storage.getChannelById(conversation.channelId)
            : null;
          
          // Obter mensagens recentes da conversa
          const messages = await this.storage.getMessagesByConversationId(conversation.id);
          
          // Última mensagem recebida (se existir)
          const lastMessage = messages.length > 0
            ? messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
            : undefined;
          
          return {
            conversation,
            contact,
            channel,
            messages,
            lastMessage,
            variables: (config as any).variables || {}
          };
        }
        
        case 'contact': {
          // Alvo é um contato específico
          if (!targetId) {
            log(`Automação ${automation.id} não especifica ID do contato`, 'scheduler', 'warn');
            return null;
          }
          
          const contact = await this.storage.getContactById(Number(targetId));
          if (!contact) {
            log(`Contato ${targetId} não encontrado para automação ${automation.id}`, 'scheduler', 'warn');
            return null;
          }
          
          // Obter conversas deste contato
          const conversations = await this.storage.getConversations({ 
            contactId: contact.id 
          });
          
          if (!conversations.length) {
            log(`Nenhuma conversa encontrada para contato ${contact.id}`, 'scheduler', 'warn');
            return null;
          }
          
          // Usar a conversa mais recente
          const conversation = conversations.sort((a, b) => 
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )[0];
          
          // Obter canal relacionado à conversa
          const channel = conversation.channelId
            ? await this.storage.getChannelById(conversation.channelId)
            : null;
          
          // Obter mensagens recentes da conversa
          const messages = await this.storage.getMessagesByConversationId(conversation.id);
          
          // Última mensagem (se existir)
          const lastMessage = messages.length > 0
            ? messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
            : undefined;
          
          return {
            conversation,
            contact,
            channel,
            messages,
            lastMessage,
            variables: (config as any).variables || {}
          };
        }
        
        case 'all':
        default: {
          // Encontrar todas as conversas ativas para execução geral
          const conversations = await this.storage.getConversations({ 
            status: 'open' 
          });
          
          if (!conversations.length) {
            log(`Nenhuma conversa ativa encontrada para automação geral ${automation.id}`, 'scheduler', 'warn');
            return null;
          }
          
          // Usar a conversa mais recente
          const conversation = conversations.sort((a, b) => 
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )[0];
          
          // Obter contato relacionado à conversa
          const contact = conversation.contactId 
            ? await this.storage.getContactById(conversation.contactId)
            : null;
          
          // Obter canal relacionado à conversa
          const channel = conversation.channelId
            ? await this.storage.getChannelById(conversation.channelId)
            : null;
          
          // Obter mensagens recentes da conversa
          const messages = await this.storage.getMessagesByConversationId(conversation.id);
          
          // Última mensagem (se existir)
          const lastMessage = messages.length > 0
            ? messages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
            : undefined;
          
          return {
            conversation,
            contact,
            channel,
            messages,
            lastMessage,
            variables: (config as any).variables || {}
          };
        }
      }
    } catch (error: any) {
      log(`Erro ao obter contexto para automação ${automation.id}: ${error.message}`, 'scheduler', 'error');
      return null;
    }
  }

  /**
   * Executa uma automação com o contexto fornecido
   * @param automation Automação a ser executada
   * @param context Contexto para execução
   * @returns Resultado da execução
   */
  async processAutomation(automation: Automation, context: AutomationContext): Promise<AutomationResult> {
    return this.executor.execute(automation, context);
  }
}