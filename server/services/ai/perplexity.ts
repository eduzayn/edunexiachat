import axios from 'axios';
import { log } from '../../vite';

const API_URL = 'https://api.perplexity.ai/chat/completions';
const DEFAULT_MODEL = 'llama-3.1-sonar-small-128k-online';

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
export async function isPerplexityConfigured(): Promise<boolean> {
  return !!process.env.PERPLEXITY_API_KEY;
}

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

export async function generatePerplexityResponse(
  input: string,
  config: PerplexityModelConfig = {}
): Promise<PerplexityResponse> {
  try {
    if (!process.env.PERPLEXITY_API_KEY) {
      throw new Error("PERPLEXITY_API_KEY não está configurada");
    }

    const model = config.model || DEFAULT_MODEL;
    const temperature = config.temperature !== undefined ? config.temperature : 0.7;
    const maxTokens = config.maxTokens || 1024;
    const topP = config.topP !== undefined ? config.topP : 0.9;
    
    // Instruções do sistema, se fornecidas
    const systemPrompt = config.instructions || "Você é um assistente útil e amigável.";

    // Configuração de busca na web (opcional)
    const useSearch = config.useSearch ?? false;
    const searchRecency = config.searchRecency || "month";

    log(`Enviando solicitação para Perplexity (${model})`, "perplexity");
    
    // Montar a requisição para a API
    const response = await axios.post(
      API_URL,
      {
        model,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: input
          }
        ],
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        search_recency_filter: useSearch ? searchRecency : undefined,
        stream: false
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`
        }
      }
    );

    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const responseText = response.data.choices[0].message.content;
      log(`Resposta recebida da Perplexity (${responseText.length} caracteres)`, "perplexity");
      
      const result: PerplexityResponse = { text: responseText };
      
      // Se houver citações e o usuário habilitou a busca, incluí-las no resultado
      if (useSearch && response.data.citations && response.data.citations.length > 0) {
        result.citations = response.data.citations as string[];
      }
      
      return result;
    } else {
      throw new Error("Resposta vazia recebida da Perplexity");
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Erro ao gerar resposta com Perplexity: ${errorMessage}`, "perplexity");
    throw new Error(`Falha ao gerar resposta com Perplexity: ${errorMessage}`);
  }
}