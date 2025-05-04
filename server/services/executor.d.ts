/**
 * Executa ações de automação com base em tipos e contexto
 */
import { IStorage } from '../storage';
import { MessageTemplater } from './message-templater';
import { Automation, Message } from '../../shared/schema';
import { AutomationContext } from '../automation';
/**
 * Classe para execução de automações
 */
export declare class AutomationExecutor {
    private storage;
    private templater;
    constructor(storage: IStorage, templater: MessageTemplater);
    /**
     * Executa uma automação
     * @param automation Automação a ser executada
     * @param context Contexto para execução
     * @returns Resultado da execução
     */
    execute(automation: Automation, context: AutomationContext): Promise<{
        success: boolean;
        response?: string;
        message?: Message;
        error?: string;
    }>;
    /**
     * Executa automação de resposta rápida
     * @param automation Automação de resposta rápida
     * @param context Contexto para execução
     * @returns Resultado da execução
     */
    private executeQuickReply;
    /**
     * Executa automação de chatbot com IA
     * @param automation Automação de chatbot
     * @param context Contexto para execução
     * @returns Resultado da execução
     */
    private executeChatbot;
    /**
     * Executa automação baseada em gatilho
     * @param automation Automação de gatilho
     * @param context Contexto para execução
     * @returns Resultado da execução
     */
    private executeTrigger;
    /**
     * Executa automação agendada
     * @param automation Automação agendada
     * @param context Contexto para execução
     * @returns Resultado da execução
     */
    private executeScheduled;
    /**
     * Executa uma ação específica
     * @param action Ação a ser executada
     * @param context Contexto para execução
     */
    private executeAction;
    /**
     * Envia mensagem através do canal apropriado
     * @param channel Canal para envio
     * @param recipient Identificador do destinatário
     * @param content Conteúdo da mensagem
     */
    private sendMessageViaChannel;
}
