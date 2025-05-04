import OpenAI from "openai";
/**
 * Interface para configurações do modelo da OpenAI
 */
export interface OpenAIModelConfig {
    model?: string;
    instructions?: string;
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
}
/**
 * Verifica se a API da OpenAI está configurada
 * @returns Promise<boolean> Verdadeiro se a API estiver configurada
 */
export declare function isOpenAIConfigured(): Promise<boolean>;
/**
 * Cliente da API da OpenAI
 * @returns OpenAI cliente inicializado se a API estiver configurada, ou null caso contrário
 */
export declare function getOpenAIClient(): OpenAI | null;
/**
 * Gera uma resposta usando a API da OpenAI
 * @param input Texto de entrada para o modelo
 * @param config Configurações do modelo
 * @returns Promise<string> Texto da resposta gerada
 */
export declare function generateOpenAIResponse(input: string, config?: OpenAIModelConfig): Promise<string>;
