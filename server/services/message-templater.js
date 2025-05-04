/**
 * Formatador de templates para mensagens
 * Processa templates e substitui variáveis
 */
import lodash from 'lodash';
var get = lodash.get, template = lodash.template;
/**
 * Classe para formatação de templates de mensagens
 */
var MessageTemplater = /** @class */ (function () {
    function MessageTemplater() {
    }
    /**
     * Processa template e substitui variáveis
     * @param templateString String de template com variáveis no formato {{variable}}
     * @param context Contexto com os dados para substituição
     * @returns Template processado com variáveis substituídas
     */
    MessageTemplater.prototype.processTemplate = function (templateString, context) {
        try {
            if (!templateString) {
                return '';
            }
            // Aplainando o contexto para facilitar a substituição
            var flatContext = this.flattenContext(context);
            // Compilar o template
            var compiled = template(templateString, {
                interpolate: /{{([\s\S]+?)}}/g, // Padrão {{variable}}
                evaluate: /<<([\s\S]+?)>>/g, // Padrão <<if condition>> para lógica
                escape: /{{{([\s\S]+?)}}}/g // Padrão {{{variable}}} para HTML escaped
            });
            // Aplicar o contexto ao template
            return compiled(flatContext);
        }
        catch (error) {
            console.error('Erro ao processar template:', error);
            return templateString; // Retorna o template original em caso de erro
        }
    };
    /**
     * Aplaina o contexto para facilitar a substituição de variáveis
     * @param context Contexto com os dados aninhados
     * @returns Contexto aplanado com chaves pontuadas
     */
    MessageTemplater.prototype.flattenContext = function (context) {
        var flatContext = {};
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
                    var customFields = typeof context.contact.customFields === 'string'
                        ? JSON.parse(context.contact.customFields)
                        : context.contact.customFields;
                    Object.entries(customFields).forEach(function (_a) {
                        var key = _a[0], value = _a[1];
                        flatContext["contact_".concat(key)] = value;
                    });
                }
                catch (error) {
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
            Object.entries(context.variables).forEach(function (_a) {
                var key = _a[0], value = _a[1];
                flatContext[key] = value;
            });
        }
        // Adicionar funções úteis
        flatContext.formatDate = function (date, format) {
            if (format === void 0) { format = 'DD/MM/YYYY'; }
            var d = typeof date === 'string' ? new Date(date) : date;
            var day = d.getDate().toString().padStart(2, '0');
            var month = (d.getMonth() + 1).toString().padStart(2, '0');
            var year = d.getFullYear();
            var hours = d.getHours().toString().padStart(2, '0');
            var minutes = d.getMinutes().toString().padStart(2, '0');
            return format
                .replace('DD', day)
                .replace('MM', month)
                .replace('YYYY', year.toString())
                .replace('HH', hours)
                .replace('mm', minutes);
        };
        flatContext.uppercase = function (text) { return (text === null || text === void 0 ? void 0 : text.toUpperCase()) || ''; };
        flatContext.lowercase = function (text) { return (text === null || text === void 0 ? void 0 : text.toLowerCase()) || ''; };
        flatContext.capitalize = function (text) {
            if (!text)
                return '';
            return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
        };
        // Adicionar data atual
        var now = new Date();
        flatContext.currentDate = now;
        flatContext.today = flatContext.formatDate(now);
        flatContext.now = flatContext.formatDate(now, 'DD/MM/YYYY HH:mm');
        return flatContext;
    };
    /**
     * Processa um template JSON e substitui variáveis
     * @param templateObject Objeto de template com variáveis
     * @param context Contexto com os dados para substituição
     * @returns Objeto processado com variáveis substituídas
     */
    MessageTemplater.prototype.processJSONTemplate = function (templateObject, context) {
        if (!templateObject) {
            return null;
        }
        try {
            // Converter para string, processar e converter de volta para objeto
            var templateString = JSON.stringify(templateObject);
            var processedString = this.processTemplate(templateString, context);
            return JSON.parse(processedString);
        }
        catch (error) {
            console.error('Erro ao processar template JSON:', error);
            return templateObject; // Retorna o template original em caso de erro
        }
    };
    return MessageTemplater;
}());
export { MessageTemplater };
