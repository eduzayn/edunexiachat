import { db } from "../../db";
import { conversations, messages } from "@shared/schema";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Sugere respostas para uma mensagem baseada no histórico da conversa
 * e nos pares de perguntas e respostas
 * @param message Mensagem para a qual gerar sugestões
 * @param conversationId ID da conversa
 * @returns Array de sugestões de resposta
 */
export async function suggestReply(message: string, conversationId: number): Promise<string[]> {
  try {
    // Recuperar informações e histórico da conversa
    const [conversation] = await db.select()
      .from(conversations)
      .where(eq(conversations.id, conversationId));
    
    if (!conversation) {
      throw new Error(`Conversa ID ${conversationId} não encontrada`);
    }
    
    // Recuperar as últimas mensagens da conversa (máximo 5)
    const recentMessages = await db.select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(db.sql`${messages.createdAt} DESC`)
      .limit(5);
    
    // Preparar contexto da conversa para o modelo
    const conversationHistory = recentMessages
      .reverse()
      .map(m => `${m.isFromContact ? "Cliente" : "Atendente"}: ${m.content}`)
      .join("\n");
    
    // Usar diferentes modelos para diferentes tipos de sugestões
    
    // 1. Sugestões baseadas em Claude (melhor para contextualização)
    const claudeSuggestions = await generateClaudeSuggestions(
      message,
      conversationHistory,
      conversation.channel
    );
    
    // 2. Sugestões baseadas em GPT (melhor para criatividade)
    const gptSuggestions = await generateGPTSuggestions(
      message,
      conversationHistory,
      conversation.channel
    );
    
    // Combinar sugestões únicas
    const allSuggestions = [...claudeSuggestions, ...gptSuggestions];
    const uniqueSuggestions = Array.from(new Set(allSuggestions));
    
    // Garantir que temos ao menos 3 sugestões
    if (uniqueSuggestions.length < 3) {
      // Adicionar respostas genéricas se necessário
      const genericReplies = [
        "Entendi sua solicitação. Vou verificar isso para você e retorno em breve.",
        "Obrigado pelo contato. Vamos resolver isso o mais rápido possível.",
        "Agradeço sua paciência. Poderia fornecer mais detalhes para que eu possa ajudar melhor?",
        "Estamos trabalhando para resolver sua solicitação. Há algo mais que você gostaria de saber?"
      ];
      
      while (uniqueSuggestions.length < 3) {
        const generic = genericReplies[uniqueSuggestions.length % genericReplies.length];
        if (!uniqueSuggestions.includes(generic)) {
          uniqueSuggestions.push(generic);
        }
      }
    }
    
    return uniqueSuggestions.slice(0, 3);
  } catch (error) {
    console.error("Erro ao gerar sugestões de resposta:", error);
    // Retornar algumas respostas genéricas em caso de erro
    return [
      "Obrigado pelo contato. Como posso ajudar?",
      "Entendi sua solicitação. Vou verificar isso para você.",
      "Agradeço sua mensagem. Poderia fornecer mais detalhes?"
    ];
  }
}

/**
 * Gera sugestões usando o modelo Claude da Anthropic
 */
async function generateClaudeSuggestions(
  message: string,
  conversationHistory: string,
  channel: string
): Promise<string[]> {
  try {
    // Claude 3.7 é a versão mais recente do Claude (lançado em 2025)
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 1024,
      messages: [
        {
          role: "system",
          content: `Você é um assistente de atendimento ao cliente profissional.
Gere 2 respostas educadas e profissionais para a última mensagem do cliente.
As respostas devem ser breves (máximo 2 frases), diretas e se adequar ao canal de comunicação (${channel}).
Não inclua números ou marcadores nas respostas.
Não repita as mesmas respostas.
Responda no formato JSON com um array de strings.`
        },
        {
          role: "user",
          content: `Histórico da conversa:
${conversationHistory}

Última mensagem do cliente: ${message}

Gere 2 respostas adequadas.`
        }
      ],
    });
    
    // Extrair as sugestões do JSON
    try {
      const content = response.content[0].text;
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0]);
        if (Array.isArray(suggestions)) {
          return suggestions;
        }
      }
      
      // Fallback para processamento simples do texto
      return content
        .replace(/["'\[\]{}]/g, '')
        .split(/\n|,/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('1.') && !s.startsWith('2.'));
    } catch (err) {
      console.error("Erro ao processar JSON de sugestões Claude:", err);
      // Extrair de forma simples (não é o ideal, mas serve como fallback)
      const lines = response.content[0].text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 10 && !line.includes('"') && !line.includes('[') && !line.includes(']'));
      
      return lines.slice(0, 2);
    }
  } catch (error) {
    console.error("Erro ao gerar sugestões com Claude:", error);
    return [];
  }
}

/**
 * Gera sugestões usando o modelo GPT-4 da OpenAI
 */
async function generateGPTSuggestions(
  message: string,
  conversationHistory: string,
  channel: string
): Promise<string[]> {
  try {
    // GPT-4o é a versão mais recente do GPT-4 (lançado em 2024)
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Você é um assistente de atendimento ao cliente profissional.
Gere 2 respostas educadas e profissionais para a última mensagem do cliente.
As respostas devem ser breves (máximo 2 frases), diretas e se adequar ao canal de comunicação (${channel}).
Responda apenas com as sugestões em formato JSON, um array de strings.`
        },
        {
          role: "user",
          content: `Histórico da conversa:
${conversationHistory}

Última mensagem do cliente: ${message}

Gere 2 respostas adequadas.`
        }
      ],
      response_format: { type: "json_object" }
    });
    
    // Extrair as sugestões do JSON
    try {
      const content = response.choices[0].message.content;
      if (!content) return [];
      
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.suggestions)) {
        return parsed.suggestions;
      } else if (Array.isArray(parsed.responses)) {
        return parsed.responses;
      } else if (Array.isArray(parsed.replies)) {
        return parsed.replies;
      } else {
        // Tenta encontrar qualquer array no objeto
        for (const key in parsed) {
          if (Array.isArray(parsed[key])) {
            return parsed[key];
          }
        }
      }
      
      return [];
    } catch (err) {
      console.error("Erro ao processar JSON de sugestões GPT:", err);
      return [];
    }
  } catch (error) {
    console.error("Erro ao gerar sugestões com GPT:", error);
    return [];
  }
}