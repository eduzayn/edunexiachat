import { IStorage } from "../../storage";
import { aiTrainingDataSources, aiQaPairs, aiKnowledgeChunks } from "@shared/schema";
import { db } from "../../db";
import { eq } from "drizzle-orm";
import OpenAI from "openai";
import Anthropic from '@anthropic-ai/sdk';
import { suggestReply } from "./suggestion";

// Provedores de IA
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export class AiService {
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Processa o conteúdo de um documento e o divide em chunks
   * @param content Conteúdo do documento
   * @returns Array de chunks de texto
   */
  async processDocumentContent(content: string): Promise<string[]> {
    // Implementação simples de chunking por parágrafos
    // Em um cenário real, poderia usar técnicas mais avançadas como sliding window
    const paragraphs = content.split(/\n\s*\n/);
    const chunks: string[] = [];
    
    let currentChunk = "";
    const maxChunkSize = 1000; // Tamanho máximo aproximado de cada chunk
    
    for (const paragraph of paragraphs) {
      if (paragraph.trim().length === 0) continue;
      
      if (currentChunk.length + paragraph.length > maxChunkSize) {
        chunks.push(currentChunk);
        currentChunk = paragraph;
      } else {
        currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
      }
    }
    
    if (currentChunk) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }

  /**
   * Processa o conteúdo de um website
   * @param url URL do website
   * @returns Array de chunks de texto
   */
  async processWebsiteContent(url: string): Promise<string[]> {
    // Em uma implementação real, isso usaria fetch ou axios para obter o conteúdo
    // e depois BeautifulSoup, Cheerio ou similar para extrair o texto
    // Por simplicidade, vamos simular com um texto estático
    
    console.log(`Processando conteúdo do site: ${url}`);
    
    // Simular chunks do conteúdo do site
    return [
      `Conteúdo extraído de ${url} - Parte 1. Esta é uma simulação do processamento de conteúdo de um site para demonstração.`,
      `Conteúdo extraído de ${url} - Parte 2. Em uma implementação real, faria scraping do conteúdo e o dividiria em chunks relevantes.`
    ];
  }

  /**
   * Agenda a geração de embeddings para uma fonte de dados
   * @param sourceId ID da fonte de dados
   */
  async scheduleEmbeddingGeneration(sourceId: number): Promise<void> {
    // Buscar chunks da fonte que não têm embeddings
    const chunks = await db.select()
      .from(aiKnowledgeChunks)
      .where(eq(aiKnowledgeChunks.sourceId, sourceId));
    
    // Processar embeddings para cada chunk
    for (const chunk of chunks) {
      if (chunk.embedding === null) {
        await this.generateEmbeddingForChunk(chunk.id, chunk.content);
      }
    }
  }

  /**
   * Gera embedding para um chunk específico
   * @param chunkId ID do chunk
   * @param content Conteúdo do chunk
   */
  private async generateEmbeddingForChunk(chunkId: number, content: string): Promise<void> {
    try {
      // Gerar embedding usando OpenAI
      // o modelo 'text-embedding-ada-002' é adequado para esta tarefa
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: content,
        encoding_format: "float"
      });
      
      const embedding = embeddingResponse.data[0].embedding;
      
      // Atualizar o chunk com o embedding gerado
      await db.update(aiKnowledgeChunks)
        .set({ embedding: embedding })
        .where(eq(aiKnowledgeChunks.id, chunkId));
        
      console.log(`Embedding gerado para chunk ID ${chunkId}`);
    } catch (error) {
      console.error(`Erro ao gerar embedding para chunk ID ${chunkId}:`, error);
    }
  }

  /**
   * Gera embedding para um par de pergunta/resposta
   * @param qaPairId ID do par de pergunta/resposta
   */
  async generateQAPairEmbedding(qaPairId: number): Promise<void> {
    try {
      // Buscar o par de pergunta/resposta
      const [qaPair] = await db.select()
        .from(aiQaPairs)
        .where(eq(aiQaPairs.id, qaPairId));
      
      if (!qaPair) {
        throw new Error(`Par de Q&A ID ${qaPairId} não encontrado`);
      }
      
      // Gerar embedding para a pergunta
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: qaPair.question,
        encoding_format: "float"
      });
      
      const embedding = embeddingResponse.data[0].embedding;
      
      // Atualizar o par com o embedding gerado
      await db.update(aiQaPairs)
        .set({ embedding: embedding })
        .where(eq(aiQaPairs.id, qaPairId));
        
      console.log(`Embedding gerado para par Q&A ID ${qaPairId}`);
    } catch (error) {
      console.error(`Erro ao gerar embedding para par Q&A ID ${qaPairId}:`, error);
    }
  }

  /**
   * Pesquisa por chunks relevantes para uma pergunta usando similaridade semântica
   * @param question Pergunta do usuário
   * @returns Array de chunks relevantes
   */
  private async findRelevantChunks(question: string): Promise<string[]> {
    try {
      // Gerar embedding para a pergunta
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: question,
        encoding_format: "float"
      });
      
      const questionEmbedding = embeddingResponse.data[0].embedding;
      
      // Buscar todos os chunks com embeddings
      // Nota: Em uma aplicação real, isso seria feito com uma pesquisa de similaridade vetorial
      // em um banco de dados que suporta isso, como Pinecone, Weaviate, pgvector, etc.
      // Aqui, vamos simplificar e trazer todos os chunks da base de dados local
      const chunks = await db.select()
        .from(aiKnowledgeChunks)
        .where(db.sql`embedding is not null`);
      
      if (chunks.length === 0) {
        return [];
      }
      
      // Calcular similaridade entre a pergunta e cada chunk
      // usando o produto escalar (dot product)
      const chunksWithSimilarity = chunks.map(chunk => {
        const embedding = chunk.embedding as number[];
        if (!embedding || !Array.isArray(embedding)) return { chunk, similarity: 0 };
        
        // Calcular produto escalar
        let dotProduct = 0;
        for (let i = 0; i < questionEmbedding.length; i++) {
          dotProduct += questionEmbedding[i] * embedding[i];
        }
        
        return {
          chunk,
          similarity: dotProduct
        };
      });
      
      // Ordenar chunks por similaridade e pegar os mais relevantes
      const relevantChunks = chunksWithSimilarity
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5) // Pegar os 5 mais relevantes
        .map(item => item.chunk.content);
      
      return relevantChunks;
    } catch (error) {
      console.error("Erro ao buscar chunks relevantes:", error);
      return [];
    }
  }

  /**
   * Pesquisa por pares de perguntas/respostas relevantes
   * @param question Pergunta do usuário
   * @returns Array de respostas relevantes prontas
   */
  private async findRelevantQAPairs(question: string): Promise<{ question: string, answer: string }[]> {
    try {
      // Gerar embedding para a pergunta
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: question,
        encoding_format: "float"
      });
      
      const questionEmbedding = embeddingResponse.data[0].embedding;
      
      // Buscar todos os pares Q&A com embeddings
      const qaPairs = await db.select()
        .from(aiQaPairs)
        .where(db.sql`embedding is not null`);
      
      if (qaPairs.length === 0) {
        return [];
      }
      
      // Calcular similaridade entre a pergunta e cada par Q&A
      const pairsWithSimilarity = qaPairs.map(pair => {
        const embedding = pair.embedding as number[];
        if (!embedding || !Array.isArray(embedding)) return { pair, similarity: 0 };
        
        // Calcular produto escalar
        let dotProduct = 0;
        for (let i = 0; i < questionEmbedding.length; i++) {
          dotProduct += questionEmbedding[i] * embedding[i];
        }
        
        return {
          pair,
          similarity: dotProduct
        };
      });
      
      // Ordenar pares por similaridade e pegar os mais relevantes
      const relevantPairs = pairsWithSimilarity
        .sort((a, b) => b.similarity - a.similarity)
        .filter(item => item.similarity > 0.8) // Filtrar apenas os altamente similares
        .slice(0, 3) // Pegar os 3 mais relevantes
        .map(item => ({ 
          question: item.pair.question, 
          answer: item.pair.answer 
        }));
      
      return relevantPairs;
    } catch (error) {
      console.error("Erro ao buscar pares Q&A relevantes:", error);
      return [];
    }
  }

  /**
   * Responde a uma pergunta usando o conhecimento personalizado
   * @param question Pergunta do usuário
   * @param conversationId ID da conversa (opcional)
   * @param contactId ID do contato (opcional)
   * @param channelId ID do canal (opcional)
   * @returns Resposta da IA
   */
  async answerQuestion(
    question: string,
    conversationId: number | null = null,
    contactId: number | null = null,
    channelId: number | null = null
  ): Promise<string> {
    try {
      // 1. Verificar se temos pares de perguntas/respostas relevantes
      const relevantQAPairs = await this.findRelevantQAPairs(question);
      
      if (relevantQAPairs.length > 0) {
        // Se houver um par muito similar, retornar a resposta diretamente
        console.log("Respondendo com par Q&A existente");
        return relevantQAPairs[0].answer;
      }
      
      // 2. Buscar chunks relevantes do conhecimento
      const relevantChunks = await this.findRelevantChunks(question);
      
      // 3. Obter histórico da conversa, se disponível
      let conversationHistory = "";
      if (conversationId) {
        const messages = await this.storage.getMessagesByConversationId(conversationId, { limit: 10 });
        if (messages && messages.length > 0) {
          conversationHistory = messages.map(m => 
            `${m.isFromContact ? "Cliente" : "Atendente"}: ${m.content}`
          ).join("\n");
        }
      }
      
      // 4. Obter informações do contato, se disponível
      let contactInfo = "";
      if (contactId) {
        const contact = await this.storage.getContact(contactId);
        if (contact) {
          contactInfo = `
Nome do cliente: ${contact.name}
Email: ${contact.email || "Não disponível"}
Telefone: ${contact.phone || "Não disponível"}
`;
        }
      }
      
      // 5. Combinar tudo em um prompt para a IA
      let systemPrompt = `Você é um assistente de atendimento ao cliente para a empresa. 
Responda de maneira educada, profissional e útil.
Use apenas as informações fornecidas para responder.
Se você não tiver informações suficientes para responder, diga que não tem essas informações
e sugira que o cliente entre em contato com um atendente humano.`;

      if (contactInfo) {
        systemPrompt += `\n\nInformações do cliente:\n${contactInfo}`;
      }
      
      if (relevantChunks.length > 0) {
        systemPrompt += `\n\nConhecimento relevante:\n${relevantChunks.join("\n\n")}`;
      }
      
      if (conversationHistory) {
        systemPrompt += `\n\nHistórico da conversa:\n${conversationHistory}`;
      }
      
      // 6. Gerar resposta usando Claude (Anthropic) para processamento de linguagem natural
      // o modelo 'claude-3-7-sonnet-20250219' foi lançado em 2025 e é uma evolução do claude-3-sonnet
      const claudeResponse = await anthropic.messages.create({
        model: 'claude-3-7-sonnet-20250219',
        max_tokens: 1024,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
      });
      
      const answer = claudeResponse.content[0].text;
      
      // 7. Registrar a interação para aprendizado contínuo (opcional)
      // Este código iria salvar a interação para futura análise e melhoria
      // do sistema de IA, mas vamos omitir a implementação por simplicidade

      return answer;
    } catch (error) {
      console.error("Erro ao responder pergunta com IA:", error);
      return "Desculpe, estou tendo dificuldades técnicas para processar sua pergunta. Por favor, tente novamente ou fale com um atendente humano.";
    }
  }

  /**
   * Sugere respostas para uma mensagem de usuário baseada em histórico
   * e conhecimento personalizado
   */
  async suggestReplies(message: string, conversationId: number): Promise<string[]> {
    // Reutiliza a função existente de suggestions
    return suggestReply(message, conversationId);
  }
}