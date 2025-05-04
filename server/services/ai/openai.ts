import OpenAI from "openai";
import { log } from '../../vite';

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const DEFAULT_MODEL = "gpt-4o";

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
export async function isOpenAIConfigured(): Promise<boolean> {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Cliente da API da OpenAI
 * @returns OpenAI cliente inicializado se a API estiver configurada, ou null caso contrário
 */
export function getOpenAIClient(): OpenAI | null {
  try {
    if (!process.env.OPENAI_API_KEY) {
      log("OPENAI_API_KEY não configurada", "openai");
      return null;
    }

    return new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY 
    });
  } catch (error) {
    log(`Erro ao criar cliente OpenAI: ${error}`, "openai");
    return null;
  }
}

/**
 * Gera uma resposta usando a API da OpenAI
 * @param input Texto de entrada para o modelo
 * @param config Configurações do modelo
 * @returns Promise<string> Texto da resposta gerada
 */
export async function generateOpenAIResponse(
  input: string,
  config: OpenAIModelConfig = {}
): Promise<string> {
  try {
    const client = getOpenAIClient();
    if (!client) {
      throw new Error("Cliente OpenAI não está disponível");
    }

    const model = config.model || DEFAULT_MODEL;
    const maxTokens = config.maxTokens || 1024;
    const temperature = config.temperature !== undefined ? config.temperature : 0.7;
    const topP = config.topP !== undefined ? config.topP : 1;
    const frequencyPenalty = config.frequencyPenalty || 0;
    const presencePenalty = config.presencePenalty || 0;
    
    // Instruções do sistema, se fornecidas
    const systemPrompt = config.instructions || "Você é um assistente útil e amigável.";

    log(`Enviando solicitação para OpenAI (${model})`, "openai");
    
    // Criar a mensagem para o modelo
    const response = await client.chat.completions.create({
      model,
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: input }
      ],
    });

    // Extrair o texto da resposta
    if (response.choices && response.choices.length > 0 && response.choices[0].message.content) {
      const responseText = response.choices[0].message.content;
      log(`Resposta recebida da OpenAI (${responseText.length} caracteres)`, "openai");
      return responseText;
    } else {
      throw new Error("Resposta vazia recebida da OpenAI");
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Erro ao gerar resposta com OpenAI: ${errorMessage}`, "openai");
    throw new Error(`Falha ao gerar resposta com OpenAI: ${errorMessage}`);
  }
}