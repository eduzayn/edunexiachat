/**
 * Formatador de templates para mensagens
 * Processa templates e substitui variáveis
 */

import lodash from 'lodash';

const { get, template } = lodash;

/**
 * Classe para formatação de templates de mensagens
 */
export class MessageTemplater {
  /**
   * Processa template e substitui variáveis
   * @param templateString String de template com variáveis no formato {{variable}}
   * @param context Contexto com os dados para substituição
   * @returns Template processado com variáveis substituídas
   */
  processTemplate(templateString: string, context: Record<string, any>): string {
    try {
      if (!templateString) {
        return '';
      }

      // Aplainando o contexto para facilitar a substituição
      const flatContext = this.flattenContext(context);

      // Compilar o template
      const compiled = template(templateString, {
        interpolate: /{{([\s\S]+?)}}/g, // Padrão {{variable}}
        evaluate: /<<([\s\S]+?)>>/g,    // Padrão <<if condition>> para lógica
        escape: /{{{([\s\S]+?)}}}/g     // Padrão {{{variable}}} para HTML escaped
      });

      // Aplicar o contexto ao template
      return compiled(flatContext);
    } catch (error) {
      console.error('Erro ao processar template:', error);
      return templateString; // Retorna o template original em caso de erro
    }
  }

  /**
   * Aplaina o contexto para facilitar a substituição de variáveis
   * @param context Contexto com os dados aninhados
   * @returns Contexto aplanado com chaves pontuadas
   */
  private flattenContext(context: Record<string, any>): Record<string, any> {
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
      flatContext.contactEmail = context.contact.email || '';
      flatContext.contactPhone = context.contact.phone || '';
      flatContext.contactTags = context.contact.tags || [];
      
      // Adicionar campos personalizados de contato, se existirem
      if (context.contact.customFields) {
        try {
          const customFields = typeof context.contact.customFields === 'string'
            ? JSON.parse(context.contact.customFields)
            : context.contact.customFields;
            
          Object.entries(customFields).forEach(([key, value]) => {
            flatContext[`contact_${key}`] = value;
          });
        } catch (error) {
          console.error('Erro ao processar campos personalizados de contato:', error);
        }
      }
    }
    
    // Adicionar canal ao contexto
    if (context.channel) {
      flatContext.channel = context.channel;
      flatContext.channelId = context.channel.id;
      flatContext.channelType = context.channel.type;
      flatContext.channelName = context.channel.name;
    }
    
    // Adicionar mensagem recebida ao contexto
    if (context.incomingMessage) {
      flatContext.incomingMessage = context.incomingMessage;
      flatContext.messageContent = context.incomingMessage.content;
      flatContext.messageType = context.incomingMessage.contentType;
    }
    
    // Adicionar última mensagem ao contexto
    if (context.lastMessage) {
      flatContext.lastMessage = context.lastMessage;
      flatContext.lastMessageContent = context.lastMessage.content;
      flatContext.lastMessageType = context.lastMessage.contentType;
    }
    
    // Adicionar variáveis de contexto
    if (context.variables) {
      Object.entries(context.variables).forEach(([key, value]) => {
        flatContext[key] = value;
      });
    }
    
    // Adicionar funções úteis
    flatContext.formatDate = (date: Date | string, format = 'DD/MM/YYYY') => {
      const d = typeof date === 'string' ? new Date(date) : date;
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      
      return format
        .replace('DD', day)
        .replace('MM', month)
        .replace('YYYY', year.toString())
        .replace('HH', hours)
        .replace('mm', minutes);
    };
    
    flatContext.uppercase = (text: string) => text?.toUpperCase() || '';
    flatContext.lowercase = (text: string) => text?.toLowerCase() || '';
    flatContext.capitalize = (text: string) => {
      if (!text) return '';
      return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
    };
    
    // Adicionar data atual
    const now = new Date();
    flatContext.currentDate = now;
    flatContext.today = flatContext.formatDate(now);
    flatContext.now = flatContext.formatDate(now, 'DD/MM/YYYY HH:mm');
    
    return flatContext;
  }

  /**
   * Processa um template JSON e substitui variáveis
   * @param templateObject Objeto de template com variáveis
   * @param context Contexto com os dados para substituição
   * @returns Objeto processado com variáveis substituídas
   */
  processJSONTemplate(templateObject: any, context: Record<string, any>): any {
    if (!templateObject) {
      return null;
    }

    try {
      // Converter para string, processar e converter de volta para objeto
      const templateString = JSON.stringify(templateObject);
      const processedString = this.processTemplate(templateString, context);
      return JSON.parse(processedString);
    } catch (error) {
      console.error('Erro ao processar template JSON:', error);
      return templateObject; // Retorna o template original em caso de erro
    }
  }
}