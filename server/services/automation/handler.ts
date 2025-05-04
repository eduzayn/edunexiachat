/**
 * Manipulador para operações de automação
 * Faz a ponte entre as rotas da API e os serviços internos
 */

import { IStorage } from '../../storage';
import { AutomationService } from './index';
import { RuleEngine } from './rule-engine';
import { Json } from 'drizzle-orm';

/**
 * Manipulador para operações de automação
 */
export class AutomationHandler {
  private storage: IStorage;
  private service: AutomationService | null = null;
  private ruleEngine: RuleEngine;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.ruleEngine = new RuleEngine();
  }

  /**
   * Define o serviço de automação
   * @param service Serviço de automação
   */
  setService(service: AutomationService) {
    this.service = service;
  }

  /**
   * Obtém todas as automações ou filtra por tipo
   * @param type Tipo de automação (opcional)
   * @returns Lista de automações
   */
  async getAutomations(type?: string) {
    return this.storage.getAutomations(type);
  }

  /**
   * Obtém automação por ID
   * @param id ID da automação
   * @returns Automação ou null se não encontrada
   */
  async getAutomationById(id: number) {
    return this.storage.getAutomationById(id);
  }

  /**
   * Cria uma nova automação
   * @param data Dados da automação
   * @param userId ID do usuário que está criando (opcional)
   * @returns Automação criada
   */
  async createAutomation(data: any, userId?: number) {
    // Se o trigger não foi enviado, inicializar como objeto vazio
    if (!data.trigger) {
      data.trigger = {};
    }

    // Se a resposta não foi enviada, inicializar como string vazia ou objeto vazio
    if (!data.response) {
      data.response = data.type === 'chatbot' ? { prompt: '' } : '';
    }

    // Se o tipo for scheduled e não houver configuração de agendamento, inicializar
    if (data.type === 'scheduled' && !data.schedule) {
      data.schedule = {
        frequency: 'daily',
        interval: 1,
        actions: []
      };
    }

    // Definir criador da automação se um ID de usuário foi fornecido
    if (userId) {
      data.createdBy = userId;
    }

    // Adicionar timestamps de criação/atualização
    const now = new Date();
    data.createdAt = now;
    data.updatedAt = now;

    // Criar a automação
    return this.storage.createAutomation(data);
  }

  /**
   * Atualiza uma automação existente
   * @param id ID da automação
   * @param data Dados para atualização
   * @returns Automação atualizada
   */
  async updateAutomation(id: number, data: any) {
    // Verificar se a automação existe
    const existingAutomation = await this.storage.getAutomationById(id);
    if (!existingAutomation) {
      throw new Error(`Automação com ID ${id} não encontrada`);
    }

    // Atualizar timestamp de modificação
    data.updatedAt = new Date();

    // Atualizar a automação
    return this.storage.updateAutomation(id, data);
  }

  /**
   * Exclui uma automação
   * @param id ID da automação
   * @returns true se excluída com sucesso
   */
  async deleteAutomation(id: number): Promise<boolean> {
    // Verificar se a automação existe
    const existingAutomation = await this.storage.getAutomationById(id);
    if (!existingAutomation) {
      throw new Error(`Automação com ID ${id} não encontrada`);
    }

    // Excluir a automação
    return this.storage.deleteAutomation(id);
  }

  /**
   * Ativa ou desativa uma automação
   * @param id ID da automação
   * @param active Status ativo (true/false)
   * @returns Automação atualizada
   */
  async toggleAutomationActive(id: number, active: boolean) {
    // Verificar se a automação existe
    const existingAutomation = await this.storage.getAutomationById(id);
    if (!existingAutomation) {
      throw new Error(`Automação com ID ${id} não encontrada`);
    }

    // Atualizar status ativo e timestamp
    return this.storage.updateAutomation(id, {
      isActive: active,
      updatedAt: new Date()
    });
  }

  /**
   * Executa uma automação manualmente
   * @param id ID da automação
   * @param conversationId ID da conversa
   * @param inputData Dados adicionais de entrada (opcional)
   * @returns Resultado da execução
   */
  async executeAutomation(
    id: number,
    conversationId: number,
    inputData?: any
  ): Promise<{
    success: boolean;
    message?: string;
    response?: string;
  }> {
    // Verificar se o serviço foi definido
    if (!this.service) {
      throw new Error('Serviço de automação não inicializado');
    }

    // Verificar se a automação existe
    const automation = await this.storage.getAutomationById(id);
    if (!automation) {
      throw new Error(`Automação com ID ${id} não encontrada`);
    }

    // Verificar se a conversa existe
    const conversation = await this.storage.getConversationById(conversationId);
    if (!conversation) {
      throw new Error(`Conversa com ID ${conversationId} não encontrada`);
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
    const messages = await this.storage.getMessagesByConversationId(conversationId);

    // Última mensagem recebida (se existir)
    const lastInboundMessage = messages
      .filter(m => m.direction === 'inbound')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

    // Construir contexto para execução
    const context = {
      conversation,
      contact,
      channel,
      messages,
      incomingMessage: lastInboundMessage,
      variables: inputData || {},
    };

    // Executar a automação através do serviço
    const result = await this.service.processAutomation(automation, context);

    return {
      success: result.success,
      message: result.message?.content,
      response: result.response
    };
  }

  /**
   * Obter estatísticas sobre automações
   * @returns Estatísticas
   */
  async getAutomationStats() {
    // Obter todas as automações
    const allAutomations = await this.storage.getAutomations();
    
    // Contar por tipo
    const typeCount: Record<string, number> = {
      'quick_reply': 0,
      'chatbot': 0,
      'trigger': 0,
      'scheduled': 0
    };
    
    // Contar ativas vs. inativas
    let activeCount = 0;
    let inactiveCount = 0;
    
    // Dados para gráficos
    const lastExecutions: Array<{id: number, name: string, lastExecutedAt: Date | null}> = [];
    
    // Processa os dados
    allAutomations.forEach(a => {
      // Contagem por tipo
      if (a.type && typeCount[a.type] !== undefined) {
        typeCount[a.type]++;
      }
      
      // Contagem por status
      if (a.isActive) {
        activeCount++;
      } else {
        inactiveCount++;
      }
      
      // Últimas execuções
      lastExecutions.push({
        id: a.id,
        name: a.name,
        lastExecutedAt: a.lastExecutedAt
      });
    });
    
    // Retornar estatísticas
    return {
      total: allAutomations.length,
      byType: Object.entries(typeCount).map(([type, count]) => ({ type, count })),
      activeCount,
      inactiveCount,
      activePercent: allAutomations.length > 0 
        ? Math.round((activeCount / allAutomations.length) * 100) 
        : 0,
      lastExecutions: lastExecutions
        .filter(a => a.lastExecutedAt)
        .sort((a, b) => 
          (b.lastExecutedAt?.getTime() || 0) - (a.lastExecutedAt?.getTime() || 0)
        )
        .slice(0, 10)
    };
  }
}