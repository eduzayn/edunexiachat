/**
 * Formatador de templates para mensagens
 * Processa templates e substitui variáveis
 */
/**
 * Classe para formatação de templates de mensagens
 */
export declare class MessageTemplater {
    /**
     * Processa template e substitui variáveis
     * @param templateString String de template com variáveis no formato {{variable}}
     * @param context Contexto com os dados para substituição
     * @returns Template processado com variáveis substituídas
     */
    processTemplate(templateString: string, context: Record<string, any>): string;
    /**
     * Aplaina o contexto para facilitar a substituição de variáveis
     * @param context Contexto com os dados aninhados
     * @returns Contexto aplanado com chaves pontuadas
     */
    private flattenContext;
    /**
     * Processa um template JSON e substitui variáveis
     * @param templateObject Objeto de template com variáveis
     * @param context Contexto com os dados para substituição
     * @returns Objeto processado com variáveis substituídas
     */
    processJSONTemplate(templateObject: any, context: Record<string, any>): any;
}
