import Anthropic from '@anthropic-ai/sdk';
/**
 * Interface para configurações do modelo da Anthropic
 */
export interface AnthropicModelConfig {
    model?: string;
    instructions?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
}
/**
 * Verifica se a API da Anthropic está configurada
 * @returns Promise<boolean> Verdadeiro se a API estiver configurada
 */
export declare function isAnthropicConfigured(): Promise<boolean>;
/**
 * Cliente da API da Anthropic
 * @returns Anthropic cliente inicializado se a API estiver configurada, ou null caso contrário
 */
export declare function getAnthropicClient(): Anthropic | null;
/**
 * Gera uma resposta usando a API da Anthropic
 * @param input Texto de entrada para o modelo
 * @param config Configurações do modelo
 * @returns Promise<string> Texto da resposta gerada
 */
export declare function generateAnthropicResponse(input: string, config?: AnthropicModelConfig): Promise<string>;
