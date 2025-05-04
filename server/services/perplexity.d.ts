/**
 * Interface para configurações do modelo da Perplexity
 */
export interface PerplexityModelConfig {
    model?: string;
    instructions?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    searchRecency?: string;
    useSearch?: boolean;
}
/**
 * Verifica se a API da Perplexity está configurada
 * @returns Promise<boolean> Verdadeiro se a API estiver configurada
 */
export declare function isPerplexityConfigured(): Promise<boolean>;
/**
 * Gera uma resposta usando a API da Perplexity
 * @param input Texto de entrada para o modelo
 * @param config Configurações do modelo
 * @returns Promise<string> Texto da resposta gerada
 */
export interface PerplexityResponse {
    text: string;
    citations?: string[];
}
export declare function generatePerplexityResponse(input: string, config?: PerplexityModelConfig): Promise<PerplexityResponse>;
