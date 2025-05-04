/**
 * CachedStorage - Extensão da DatabaseStorage com suporte a cache
 * 
 * Este módulo estende a classe DatabaseStorage para adicionar
 * suporte a cache para operações de leitura frequentes.
 */

import { DatabaseStorage } from '../storage';
import cacheService from './cache-service';
import createLogger from './logger';
import { 
  User, AgentPerformance, SatisfactionSurvey, 
  Contact, Conversation, Message, Channel,
  MessageTemplate, RoutingRule, Automation
} from '@shared/schema';

const logger = createLogger('cached-storage');

// TTLs padrão para diferentes tipos de dados (em ms)
const DEFAULT_CACHE_TTL = {
  user: 5 * 60 * 1000, // 5 minutos
  conversation: 2 * 60 * 1000, // 2 minutos
  message: 2 * 60 * 1000, // 2 minutos
  contact: 10 * 60 * 1000, // 10 minutos
  template: 15 * 60 * 1000, // 15 minutos
  channel: 30 * 60 * 1000, // 30 minutos
  metric: 5 * 60 * 1000, // 5 minutos
  rule: 5 * 60 * 1000, // 5 minutos
  automation: 5 * 60 * 1000 // 5 minutos
};

/**
 * Classe que estende DatabaseStorage para adicionar cache
 */
export class CachedStorage extends DatabaseStorage {
  /**
   * Invalida cache relacionado a um usuário específico
   */
  private invalidateUserCache(userId: number): void {
    cacheService.delete(`user:${userId}`, 'users');
    // Invalidar métricas relacionadas
    cacheService.delete(`metrics:user:${userId}`, 'metrics');
    logger.debug(`Cache invalidado para usuário ${userId}`);
  }
  
  /**
   * Invalida cache relacionado a uma conversa específica
   */
  private invalidateConversationCache(conversationId: number): void {
    cacheService.delete(`conversation:${conversationId}`, 'conversations');
    cacheService.delete(`messages:conversation:${conversationId}`, 'messages');
    logger.debug(`Cache invalidado para conversa ${conversationId}`);
  }
  
  /**
   * Invalida cache relacionado a um contato específico
   */
  private invalidateContactCache(contactId: number): void {
    cacheService.delete(`contact:${contactId}`, 'contacts');
    logger.debug(`Cache invalidado para contato ${contactId}`);
  }
  
  /**
   * Invalida cache de templates
   */
  private invalidateTemplatesCache(): void {
    cacheService.clearNamespace('templates');
    logger.debug('Cache de templates invalidado');
  }
  
  /**
   * Invalida cache de regras de roteamento
   */
  private invalidateRoutingRulesCache(): void {
    cacheService.clearNamespace('routing');
    logger.debug('Cache de regras de roteamento invalidado');
  }
  
  /**
   * Invalida cache de automações
   */
  private invalidateAutomationsCache(): void {
    cacheService.clearNamespace('automations');
    logger.debug('Cache de automações invalidado');
  }
  
  /**
   * Invalida cache de métricas
   */
  private invalidateMetricsCache(): void {
    cacheService.clearNamespace('metrics');
    logger.debug('Cache de métricas invalidado');
  }
  
  // Sobrescrevendo métodos para adicionar cache
  
  // Métodos de usuário
  async getUser(id: number): Promise<User | undefined> {
    const cacheKey = `user:${id}`;
    
    return cacheService.getOrSet(
      cacheKey,
      () => super.getUser(id),
      { namespace: 'users', ttl: DEFAULT_CACHE_TTL.user }
    );
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const cacheKey = `username:${username}`;
    
    return cacheService.getOrSet(
      cacheKey,
      () => super.getUserByUsername(username),
      { namespace: 'users', ttl: DEFAULT_CACHE_TTL.user }
    );
  }
  
  async createUser(insertUser: any): Promise<User> {
    const user = await super.createUser(insertUser);
    // Não armazenamos em cache, apenas invalidamos cache potencialmente relacionado
    this.invalidateUserCache(user.id);
    return user;
  }
  
  async updateUser(id: number, userData: any): Promise<User> {
    const user = await super.updateUser(id, userData);
    this.invalidateUserCache(id);
    return user;
  }
  
  async deleteUser(id: number): Promise<void> {
    await super.deleteUser(id);
    this.invalidateUserCache(id);
  }
  
  // Métodos de conversa
  async getConversationById(id: number): Promise<Conversation | undefined> {
    const cacheKey = `conversation:${id}`;
    
    return cacheService.getOrSet(
      cacheKey,
      () => super.getConversationById(id),
      { namespace: 'conversations', ttl: DEFAULT_CACHE_TTL.conversation }
    );
  }
  
  async createConversation(insertConversation: any): Promise<Conversation> {
    const conversation = await super.createConversation(insertConversation);
    // Não armazenamos em cache, mas invalidamos relacionados
    if (conversation.contactId) {
      this.invalidateContactCache(conversation.contactId);
    }
    return conversation;
  }
  
  async updateConversation(id: number, updateData: any): Promise<Conversation> {
    const conversation = await super.updateConversation(id, updateData);
    this.invalidateConversationCache(id);
    return conversation;
  }
  
  async assignConversation(id: number, userId: number): Promise<void> {
    await super.assignConversation(id, userId);
    this.invalidateConversationCache(id);
    this.invalidateUserCache(userId);
  }
  
  // Métodos de mensagem
  async getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    const cacheKey = `messages:conversation:${conversationId}`;
    
    return cacheService.getOrSet(
      cacheKey,
      () => super.getMessagesByConversationId(conversationId),
      { namespace: 'messages', ttl: DEFAULT_CACHE_TTL.message }
    );
  }
  
  async createMessage(insertMessage: any): Promise<Message> {
    const message = await super.createMessage(insertMessage);
    // Invalidar cache de mensagens da conversa
    this.invalidateConversationCache(message.conversationId);
    return message;
  }
  
  // Métodos de contato
  async getContactById(id: number): Promise<Contact | undefined> {
    const cacheKey = `contact:${id}`;
    
    return cacheService.getOrSet(
      cacheKey,
      () => super.getContactById(id),
      { namespace: 'contacts', ttl: DEFAULT_CACHE_TTL.contact }
    );
  }
  
  async createContact(insertContact: any): Promise<Contact> {
    const contact = await super.createContact(insertContact);
    return contact; // Não necessita invalidação
  }
  
  async updateContact(id: number, updateData: any): Promise<Contact> {
    const contact = await super.updateContact(id, updateData);
    this.invalidateContactCache(id);
    return contact;
  }
  
  async deleteContact(id: number): Promise<void> {
    await super.deleteContact(id);
    this.invalidateContactCache(id);
  }
  
  // Métodos de canal
  async getChannelById(id: number): Promise<Channel | undefined> {
    const cacheKey = `channel:${id}`;
    
    return cacheService.getOrSet(
      cacheKey,
      () => super.getChannelById(id),
      { namespace: 'channels', ttl: DEFAULT_CACHE_TTL.channel }
    );
  }
  
  // Métodos de templates de mensagem
  async getMessageTemplates(): Promise<MessageTemplate[]> {
    return cacheService.getOrSet(
      'all-templates',
      () => super.getMessageTemplates(),
      { namespace: 'templates', ttl: DEFAULT_CACHE_TTL.template }
    );
  }
  
  async getMessageTemplateById(id: number): Promise<MessageTemplate | undefined> {
    const cacheKey = `template:${id}`;
    
    return cacheService.getOrSet(
      cacheKey,
      () => super.getMessageTemplateById(id),
      { namespace: 'templates', ttl: DEFAULT_CACHE_TTL.template }
    );
  }
  
  async getMessageTemplatesByCategory(category: string): Promise<MessageTemplate[]> {
    const cacheKey = `templates:category:${category}`;
    
    return cacheService.getOrSet(
      cacheKey,
      () => super.getMessageTemplatesByCategory(category),
      { namespace: 'templates', ttl: DEFAULT_CACHE_TTL.template }
    );
  }
  
  async createMessageTemplate(template: any): Promise<MessageTemplate> {
    const result = await super.createMessageTemplate(template);
    this.invalidateTemplatesCache();
    return result;
  }
  
  async updateMessageTemplate(id: number, template: any): Promise<MessageTemplate> {
    const result = await super.updateMessageTemplate(id, template);
    this.invalidateTemplatesCache();
    return result;
  }
  
  async deleteMessageTemplate(id: number): Promise<void> {
    await super.deleteMessageTemplate(id);
    this.invalidateTemplatesCache();
  }
  
  // Métodos de regras de roteamento
  async getRoutingRules(): Promise<RoutingRule[]> {
    return cacheService.getOrSet(
      'all-rules',
      () => super.getRoutingRules(),
      { namespace: 'routing', ttl: DEFAULT_CACHE_TTL.rule }
    );
  }
  
  async getActiveRoutingRules(): Promise<RoutingRule[]> {
    return cacheService.getOrSet(
      'active-rules',
      () => super.getActiveRoutingRules(),
      { namespace: 'routing', ttl: DEFAULT_CACHE_TTL.rule }
    );
  }
  
  async createRoutingRule(rule: any): Promise<RoutingRule> {
    const result = await super.createRoutingRule(rule);
    this.invalidateRoutingRulesCache();
    return result;
  }
  
  async updateRoutingRule(id: number, rule: any): Promise<RoutingRule> {
    const result = await super.updateRoutingRule(id, rule);
    this.invalidateRoutingRulesCache();
    return result;
  }
  
  async deleteRoutingRule(id: number): Promise<void> {
    await super.deleteRoutingRule(id);
    this.invalidateRoutingRulesCache();
  }
  
  // Métodos de automação
  async getAutomations(type?: string): Promise<Automation[]> {
    const cacheKey = type ? `automations:type:${type}` : 'all-automations';
    
    return cacheService.getOrSet(
      cacheKey,
      () => super.getAutomations(type),
      { namespace: 'automations', ttl: DEFAULT_CACHE_TTL.automation }
    );
  }
  
  async getActiveAutomations(): Promise<Automation[]> {
    return cacheService.getOrSet(
      'active-automations',
      () => super.getActiveAutomations(),
      { namespace: 'automations', ttl: DEFAULT_CACHE_TTL.automation }
    );
  }
  
  // Métodos de métricas - importantes para reduzir carga em consultas analíticas
  async getAgentPerformanceMetrics(
    userId?: number, 
    startDate?: Date, 
    endDate?: Date, 
    page = 1, 
    pageSize = 50,
    includeUser = false
  ): Promise<AgentPerformance[]> {
    // Para métricas paginadas, cacheamos por usuário, período e página
    const dateParams = [
      startDate ? startDate.toISOString().split('T')[0] : 'all',
      endDate ? endDate.toISOString().split('T')[0] : 'all'
    ].join('-');
    
    const cacheKey = `perf:${userId || 'all'}:${dateParams}:${page}:${pageSize}:${includeUser}`;
    
    return cacheService.getOrSet(
      cacheKey,
      () => super.getAgentPerformanceMetrics(userId, startDate, endDate, page, pageSize, includeUser),
      { namespace: 'metrics', ttl: DEFAULT_CACHE_TTL.metric }
    );
  }
  
  async getSatisfactionSurveys(
    userId?: number, 
    startDate?: Date, 
    endDate?: Date, 
    page = 1, 
    pageSize = 50,
    includeDetails = false
  ): Promise<SatisfactionSurvey[]> {
    // Para pesquisas paginadas, cacheamos por usuário, período e página
    const dateParams = [
      startDate ? startDate.toISOString().split('T')[0] : 'all',
      endDate ? endDate.toISOString().split('T')[0] : 'all'
    ].join('-');
    
    const cacheKey = `surveys:${userId || 'all'}:${dateParams}:${page}:${pageSize}:${includeDetails}`;
    
    return cacheService.getOrSet(
      cacheKey,
      () => super.getSatisfactionSurveys(userId, startDate, endDate, page, pageSize, includeDetails),
      { namespace: 'metrics', ttl: DEFAULT_CACHE_TTL.metric }
    );
  }
  
  async createSatisfactionSurvey(data: any): Promise<SatisfactionSurvey> {
    const result = await super.createSatisfactionSurvey(data);
    this.invalidateMetricsCache();
    return result;
  }
  
  async updateSatisfactionSurvey(id: number, data: any): Promise<SatisfactionSurvey> {
    const result = await super.updateSatisfactionSurvey(id, data);
    this.invalidateMetricsCache();
    return result;
  }
  
  async calculateAgentPerformance(userId: number, date: Date): Promise<AgentPerformance> {
    const result = await super.calculateAgentPerformance(userId, date);
    this.invalidateMetricsCache();
    return result;
  }
}

// Exporta uma instância única
export const cachedStorage = new CachedStorage();

export default cachedStorage;