/**
 * Definições de tipos compartilhados entre frontend e backend
 */
/**
 * Mensagem de uma conversa
 */
export interface Message {
    id: number;
    conversationId: number;
    content: string;
    direction: 'inbound' | 'outbound';
    status: 'sent' | 'delivered' | 'read' | 'failed';
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}
/**
 * Tipo de canal de comunicação
 */
export type Channel = {
    id: number;
    name: string;
    type: 'whatsapp' | 'telegram' | 'discord' | 'slack' | 'email' | 'sms' | 'other';
    config: Record<string, any>;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
};
/**
 * Automação para respostas e ações
 */
export interface Automation {
    id: number;
    name: string;
    description?: string;
    type: 'quick_reply' | 'chatbot' | 'trigger' | 'scheduled';
    isActive: boolean;
    trigger?: Record<string, any>;
    action?: Record<string, any>;
    schedule?: Record<string, any>;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}
/**
 * Definição de contato
 */
export interface Contact {
    id: number;
    name: string;
    email?: string;
    phone?: string;
    avatar?: string;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}
/**
 * Definição de conversa
 */
export interface Conversation {
    id: number;
    contactId?: number;
    channelId?: number;
    status: 'open' | 'closed' | 'pending' | 'archived';
    lastMessage?: string;
    metadata?: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}
