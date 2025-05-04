/**
 * Motor de regras para automações
 * Avalia condições e regras para execução de automações
 */

import lodash from 'lodash';

const { get, isEqual } = lodash;

/**
 * Verifica se a condição é atendida com base no operador
 * @param key Chave do campo a ser verificado
 * @param operator Operador de comparação
 * @param expectedValue Valor esperado
 * @param context Contexto com os dados para avaliação
 * @returns Verdadeiro se a condição é atendida
 */
function evaluateCondition(
  key: string,
  operator: string,
  expectedValue: any,
  context: Record<string, any>
): boolean {
  const actualValue = get(context, key);

  // Se o valor atual for undefined e não estamos verificando null, retorna falso
  if (actualValue === undefined && operator !== 'is_null' && operator !== 'is_not_null') {
    return false;
  }

  switch (operator) {
    case 'equals':
      return isEqual(actualValue, expectedValue);
    case 'not_equals':
      return !isEqual(actualValue, expectedValue);
    case 'contains':
      return typeof actualValue === 'string' && actualValue.includes(expectedValue);
    case 'not_contains':
      return typeof actualValue === 'string' && !actualValue.includes(expectedValue);
    case 'starts_with':
      return typeof actualValue === 'string' && actualValue.startsWith(expectedValue);
    case 'ends_with':
      return typeof actualValue === 'string' && actualValue.endsWith(expectedValue);
    case 'greater_than':
      return Number(actualValue) > Number(expectedValue);
    case 'less_than':
      return Number(actualValue) < Number(expectedValue);
    case 'greater_than_or_equals':
      return Number(actualValue) >= Number(expectedValue);
    case 'less_than_or_equals':
      return Number(actualValue) <= Number(expectedValue);
    case 'in':
      return Array.isArray(expectedValue) && expectedValue.includes(actualValue);
    case 'not_in':
      return Array.isArray(expectedValue) && !expectedValue.includes(actualValue);
    case 'is_null':
      return actualValue === null || actualValue === undefined;
    case 'is_not_null':
      return actualValue !== null && actualValue !== undefined;
    case 'regex_match':
      try {
        const regex = new RegExp(expectedValue);
        return typeof actualValue === 'string' && regex.test(actualValue);
      } catch (error) {
        console.error('Erro ao avaliar expressão regular:', error);
        return false;
      }
    default:
      console.error(`Operador desconhecido: ${operator}`);
      return false;
  }
}

/**
 * Avalia um grupo de regras no contexto fornecido
 */
function evaluateGroup(
  group: { conditions: any[]; operator: string },
  context: Record<string, any>
): boolean {
  if (!group || !group.conditions || !Array.isArray(group.conditions) || group.conditions.length === 0) {
    return true; // Se não há condições, retorna verdadeiro (não restringe)
  }

  const { conditions, operator } = group;
  const isAnd = operator === 'and';

  // Para AND, todas as condições devem ser verdadeiras
  // Para OR, pelo menos uma condição deve ser verdadeira
  return isAnd
    ? conditions.every(condition => evaluateCondition(
        condition.field,
        condition.operator,
        condition.value,
        context
      ))
    : conditions.some(condition => evaluateCondition(
        condition.field,
        condition.operator,
        condition.value,
        context
      ));
}

/**
 * Classe que implementa o motor de regras
 */
export class RuleEngine {
  /**
   * Avalia conjunto de regras no contexto fornecido
   * @param rules Regras a serem avaliadas
   * @param context Contexto com os dados para avaliação
   * @returns Verdadeiro se as regras são atendidas
   */
  evaluateRules(rules: any[], context: Record<string, any>): boolean {
    if (!rules || !Array.isArray(rules) || rules.length === 0) {
      return true; // Se não há regras, retorna verdadeiro (não restringe)
    }

    // Aplainando o contexto para facilitar a avaliação
    const flatContext: Record<string, any> = {};
    
    // Adicionar conversa ao contexto
    if (context.conversation) {
      flatContext.conversation = context.conversation;
      flatContext.conversationId = context.conversation.id;
      flatContext.conversationStatus = context.conversation.status;
    }
    
    // Adicionar contato ao contexto
    if (context.contact) {
      flatContext.contact = context.contact;
      flatContext.contactId = context.contact.id;
      flatContext.contactName = context.contact.name;
      flatContext.contactEmail = context.contact.email;
      flatContext.contactPhone = context.contact.phone;
      flatContext.contactTags = context.contact.tags || [];
    }
    
    // Adicionar canal ao contexto
    if (context.channel) {
      flatContext.channel = context.channel;
      flatContext.channelId = context.channel.id;
      flatContext.channelType = context.channel.type;
    }
    
    // Adicionar mensagem recebida ao contexto
    if (context.incomingMessage) {
      flatContext.incomingMessage = context.incomingMessage;
      flatContext.messageContent = context.incomingMessage.content;
      flatContext.messageType = context.incomingMessage.contentType;
      flatContext.messageDirection = context.incomingMessage.direction;
    }
    
    // Adicionar última mensagem ao contexto
    if (context.lastMessage) {
      flatContext.lastMessage = context.lastMessage;
      flatContext.lastMessageContent = context.lastMessage.content;
      flatContext.lastMessageType = context.lastMessage.contentType;
      flatContext.lastMessageDirection = context.lastMessage.direction;
    }
    
    // Adicionar mensagens recentes ao contexto
    if (context.messages) {
      flatContext.messages = context.messages;
      flatContext.messageCount = context.messages.length;
    }
    
    // Adicionar variáveis de contexto
    if (context.variables) {
      Object.assign(flatContext, context.variables);
    }

    // Avaliar todas as regras
    // Verificar se o esperado é AND ou OR entre os grupos
    const rootOperator = get(rules, '[0].rootOperator', 'and');
    const isRootAnd = rootOperator === 'and';

    // Para AND, todos os grupos devem ser verdadeiros
    // Para OR, pelo menos um grupo deve ser verdadeiro
    return isRootAnd
      ? rules.every(group => evaluateGroup(group, flatContext))
      : rules.some(group => evaluateGroup(group, flatContext));
  }

  /**
   * Avalia se é hora de executar uma automação agendada
   * @param automation Automação a ser avaliada
   * @returns Verdadeiro se deve ser executada agora
   */
  evaluateSchedule(automation: any): boolean {
    // Verificar se há configuração de agendamento
    if (!automation || typeof automation !== 'object') {
      return false;
    }

    const schedule = automation.schedule || {};
    const lastExecutedAt = automation.lastExecutedAt ? new Date(automation.lastExecutedAt) : null;
    const now = new Date();

    // Se nunca foi executada, executar agora
    if (!lastExecutedAt) {
      return true;
    }

    // Se não tem configuração de frequência, não executar
    if (!schedule.frequency) {
      return false;
    }

    // Calcular próxima execução com base na frequência
    let nextExecution = new Date(lastExecutedAt);
    switch (schedule.frequency) {
      case 'minutely':
        nextExecution.setMinutes(nextExecution.getMinutes() + (schedule.interval || 1));
        break;
      case 'hourly':
        nextExecution.setHours(nextExecution.getHours() + (schedule.interval || 1));
        break;
      case 'daily':
        nextExecution.setDate(nextExecution.getDate() + (schedule.interval || 1));
        break;
      case 'weekly':
        nextExecution.setDate(nextExecution.getDate() + (7 * (schedule.interval || 1)));
        break;
      case 'monthly':
        nextExecution.setMonth(nextExecution.getMonth() + (schedule.interval || 1));
        break;
      default:
        // Frequência desconhecida, não executar
        return false;
    }

    // Verificar se já é hora de executar novamente
    return now >= nextExecution;
  }
}