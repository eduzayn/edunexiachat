/**
 * Interface de armazenamento e implementação em memória
 * 
 * Este arquivo define a interface IStorage que todas as implementações
 * de armazenamento devem seguir, bem como fornece uma implementação
 * em memória para desenvolvimento.
 */

// Interface para armazenamento
export interface IStorage {
  // Métodos para manipulação de dados
  // Serão implementados conforme necessidade

  // Métodos para automações
  getAutomations(type?: string): Promise<any[]>;
  getAutomationById(id: number): Promise<any | null>;
  createAutomation(data: any): Promise<any>;
  updateAutomation(id: number, data: any): Promise<any>;
  deleteAutomation(id: number): Promise<boolean>;

  // Métodos para conversas
  getConversationById(id: number): Promise<any | null>;
  getConversations(filter?: any): Promise<any[]>;

  // Métodos para contatos
  getContactById(id: number): Promise<any | null>;

  // Métodos para canais
  getChannelById(id: number): Promise<any | null>;

  // Métodos para mensagens
  getMessagesByConversationId(conversationId: number): Promise<any[]>;
}

// Armazenamento em memória (para desenvolvimento)
export class MemStorage implements IStorage {
  private automations: any[] = [];
  private conversations: any[] = [];
  private contacts: any[] = [];
  private channels: any[] = [];
  private messages: any[] = [];

  // Implementações de automação
  async getAutomations(type?: string): Promise<any[]> {
    if (type) {
      return this.automations.filter(a => a.type === type);
    }
    return [...this.automations];
  }

  async getAutomationById(id: number): Promise<any | null> {
    return this.automations.find(a => a.id === id) || null;
  }

  async createAutomation(data: any): Promise<any> {
    const id = this.automations.length > 0
      ? Math.max(...this.automations.map(a => a.id)) + 1
      : 1;
    
    const newAutomation = {
      id,
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    this.automations.push(newAutomation);
    return newAutomation;
  }

  async updateAutomation(id: number, data: any): Promise<any> {
    const index = this.automations.findIndex(a => a.id === id);
    if (index === -1) {
      throw new Error(`Automação com ID ${id} não encontrada`);
    }
    
    const updatedAutomation = {
      ...this.automations[index],
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    this.automations[index] = updatedAutomation;
    return updatedAutomation;
  }

  async deleteAutomation(id: number): Promise<boolean> {
    const initialLength = this.automations.length;
    this.automations = this.automations.filter(a => a.id !== id);
    return initialLength > this.automations.length;
  }

  // Implementações de conversa
  async getConversationById(id: number): Promise<any | null> {
    return this.conversations.find(c => c.id === id) || null;
  }

  async getConversations(filter?: any): Promise<any[]> {
    if (!filter) {
      return [...this.conversations];
    }
    
    return this.conversations.filter(c => {
      for (const key in filter) {
        if (c[key] !== filter[key]) {
          return false;
        }
      }
      return true;
    });
  }

  // Implementações de contato
  async getContactById(id: number): Promise<any | null> {
    return this.contacts.find(c => c.id === id) || null;
  }

  // Implementações de canal
  async getChannelById(id: number): Promise<any | null> {
    return this.channels.find(c => c.id === id) || null;
  }

  // Implementações de mensagem
  async getMessagesByConversationId(conversationId: number): Promise<any[]> {
    return this.messages.filter(m => m.conversationId === conversationId);
  }
}

// Exporta uma instância padrão do armazenamento em memória
export const memStorage = new MemStorage();