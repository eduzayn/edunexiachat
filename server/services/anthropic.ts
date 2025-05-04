import Anthropic from '@anthropic-ai/sdk';
import { log } from '../utils/logger';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const DEFAULT_MODEL = "claude-3-7-sonnet-20250219";

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
export async function isAnthropicConfigured(): Promise<boolean> {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Cliente da API da Anthropic
 * @returns Anthropic cliente inicializado se a API estiver configurada, ou null caso contrário
 */
export function getAnthropicClient(): Anthropic | null {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      log("ANTHROPIC_API_KEY não configurada", "anthropic");
      return null;
    }

    return new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  } catch (error) {
    log(`Erro ao criar cliente Anthropic: ${error}`, "anthropic");
    return null;
  }
}

/**
 * Gera uma resposta usando a API da Anthropic
 * @param input Texto de entrada para o modelo
 * @param config Configurações do modelo
 * @returns Promise<string> Texto da resposta gerada
 */
export async function generateAnthropicResponse(
  input: string,
  config: AnthropicModelConfig = {}
): Promise<string> {
  try {
    const client = getAnthropicClient();
    if (!client) {
      throw new Error("Cliente Anthropic não está disponível");
    }

    const model = config.model || DEFAULT_MODEL;
    const maxTokens = config.maxTokens || 1024;
    const temperature = config.temperature !== undefined ? config.temperature : 0.7;
    
    // Instruções do sistema, se fornecidas
    const systemPrompt = config.instructions || "Você é um assistente útil e amigável.";

    log(`Enviando solicitação para Anthropic (${model})`, "anthropic");
    
    // Criar a mensagem para o modelo
    const message = await client.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: input }],
    });

    // Extrair o texto da resposta
    if (message.content && message.content.length > 0) {
      // Verificar se o conteúdo é do tipo texto
      const contentBlock = message.content[0];
      if ('type' in contentBlock && contentBlock.type === 'text' && 'text' in contentBlock) {
        const responseText = contentBlock.text;
        log(`Resposta recebida da Anthropic (${responseText.length} caracteres)`, "anthropic");
        return responseText;
      } else {
        throw new Error("Formato de resposta da Anthropic não suportado");
      }
    } else {
      throw new Error("Resposta vazia recebida da Anthropic");
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Erro ao gerar resposta com Anthropic: ${errorMessage}`, "anthropic");
    throw new Error(`Falha ao gerar resposta com Anthropic: ${errorMessage}`);
  }
}