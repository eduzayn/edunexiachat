import { IStorage } from "../storage";

export type WebhookEvent = {
  type: string;
  payload: any;
};

export type MessageEvent = {
  from: string;
  to: string;
  messageId: string;
  timestamp: number;
  content: string;
  contentType: string;
  channelType: string;
  channelName: string;
};

export type ChannelHandlerOptions = {
  storage: IStorage;
  sendEventToAll: (event: any) => void;
};

export interface ChannelHandler {
  handleWebhook(data: any): Promise<void>;
  sendMessage(recipient: string, content: string): Promise<void>;
}

// Base abstract class for channel handlers
export abstract class BaseChannelHandler implements ChannelHandler {
  protected storage: IStorage;
  protected sendEventToAll: (event: any) => void;
  
  constructor(options: ChannelHandlerOptions) {
    this.storage = options.storage;
    this.sendEventToAll = options.sendEventToAll;
  }
  
  // Process a message from an external channel
  protected async processIncomingMessage(messageEvent: MessageEvent): Promise<void> {
    // Find or create contact
    let contact = await this.findContactByIdentifier(messageEvent.from);
    
    if (!contact) {
      contact = await this.storage.createContact({
        name: messageEvent.from,
        phone: messageEvent.channelType.includes('whatsapp') ? messageEvent.from : undefined,
        identifier: messageEvent.from,
        source: messageEvent.channelType,
        email: '',
      });
    }
    
    // Find or create conversation
    let conversation = await this.findConversationByContactIdentifier(messageEvent.from);
    
    if (!conversation) {
      // Find channel
      const channels = await this.storage.getChannels();
      const channel = channels.find(c => c.type === messageEvent.channelType);
      
      if (!channel) {
        console.error(`Channel ${messageEvent.channelType} not found`);
        return;
      }
      
      conversation = await this.storage.createConversation({
        contactId: contact.id,
        channelId: channel.id,
        status: 'open',
        contactIdentifier: messageEvent.from,
      });
    }
    
    // Create message
    const message = await this.storage.createMessage({
      conversationId: conversation.id,
      content: messageEvent.content,
      contentType: messageEvent.contentType,
      direction: 'inbound',
      status: 'delivered',
      externalId: messageEvent.messageId,
    });
    
    // Send event to all connected clients
    this.sendEventToAll({
      type: 'message_created',
      data: {
        message,
        conversationId: conversation.id
      }
    });
  }
  
  // Find contact by external identifier
  private async findContactByIdentifier(identifier: string): Promise<any | undefined> {
    const contacts = await this.storage.getContacts();
    return contacts.find(contact => contact.identifier === identifier);
  }
  
  // Find conversation by contact identifier
  private async findConversationByContactIdentifier(identifier: string): Promise<any | undefined> {
    const conversations = await this.storage.getConversations();
    return conversations.find(conv => conv.contactIdentifier === identifier);
  }
  
  // These methods must be implemented by each channel handler
  abstract handleWebhook(data: any): Promise<void>;
  abstract sendMessage(recipient: string, content: string): Promise<void>;
}
