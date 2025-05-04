/**
 * Motor de regras para automações
 * Avalia condições e regras para execução de automações
 */
/**
 * Classe que implementa o motor de regras
 */
export declare class RuleEngine {
    /**
     * Avalia conjunto de regras no contexto fornecido
     * @param rules Regras a serem avaliadas
     * @param context Contexto com os dados para avaliação
     * @returns Verdadeiro se as regras são atendidas
     */
    evaluateRules(rules: any[], context: Record<string, any>): boolean;
    /**
     * Avalia se é hora de executar uma automação agendada
     * @param automation Automação a ser avaliada
     * @returns Verdadeiro se deve ser executada agora
     */
    evaluateSchedule(automation: any): boolean;
}
