/**
 * Interface de armazenamento e implementação em memória
 *
 * Este arquivo define a interface IStorage que todas as implementações
 * de armazenamento devem seguir, bem como fornece uma implementação
 * em memória para desenvolvimento.
 */
export interface IStorage {
    getAutomations(type?: string): Promise<any[]>;
    getAutomationById(id: number): Promise<any | null>;
    createAutomation(data: any): Promise<any>;
    updateAutomation(id: number, data: any): Promise<any>;
    deleteAutomation(id: number): Promise<boolean>;
    getConversationById(id: number): Promise<any | null>;
    getConversations(filter?: any): Promise<any[]>;
    getContactById(id: number): Promise<any | null>;
    getChannelById(id: number): Promise<any | null>;
    getMessagesByConversationId(conversationId: number): Promise<any[]>;
}
export declare class MemStorage implements IStorage {
    private automations;
    private conversations;
    private contacts;
    private channels;
    private messages;
    getAutomations(type?: string): Promise<any[]>;
    getAutomationById(id: number): Promise<any | null>;
    createAutomation(data: any): Promise<any>;
    updateAutomation(id: number, data: any): Promise<any>;
    deleteAutomation(id: number): Promise<boolean>;
    getConversationById(id: number): Promise<any | null>;
    getConversations(filter?: any): Promise<any[]>;
    getContactById(id: number): Promise<any | null>;
    getChannelById(id: number): Promise<any | null>;
    getMessagesByConversationId(conversationId: number): Promise<any[]>;
}
export declare const memStorage: MemStorage;
