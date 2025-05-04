import { Router } from "express";
import { IStorage } from "../../storage";
import { aiTrainingDataSources, aiQaPairs, aiKnowledgeChunks } from "@shared/schema";
import { eq } from "drizzle-orm";
import { db } from "../../db";
import { AiService } from "./index";

export function setupAIRoutes(router: Router, storage: IStorage) {
  const aiService = new AiService(storage);

  /**
   * Obtém todas as fontes de dados de IA
   */
  router.get("/api/ai/data-sources", async (req, res) => {
    try {
      const dataSources = await db.select().from(aiTrainingDataSources).orderBy(aiTrainingDataSources.name);
      res.status(200).json(dataSources);
    } catch (error) {
      console.error("Erro ao buscar fontes de dados de IA:", error);
      res.status(500).json({ error: "Erro ao buscar fontes de dados" });
    }
  });

  /**
   * Obtém uma fonte de dados de IA específica por ID
   */
  router.get("/api/ai/data-sources/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [dataSource] = await db.select().from(aiTrainingDataSources).where(eq(aiTrainingDataSources.id, parseInt(id)));

      if (!dataSource) {
        return res.status(404).json({ error: "Fonte de dados não encontrada" });
      }

      res.status(200).json(dataSource);
    } catch (error) {
      console.error("Erro ao buscar fonte de dados de IA:", error);
      res.status(500).json({ error: "Erro ao buscar fonte de dados" });
    }
  });

  /**
   * Cria uma nova fonte de dados de IA
   */
  router.post("/api/ai/data-sources", async (req, res) => {
    try {
      const dataSource = req.body;
      
      // Processar e dividir o conteúdo em chunks se for um documento
      let knowledgeChunks = [];
      if (dataSource.type === "document" && dataSource.content) {
        knowledgeChunks = await aiService.processDocumentContent(dataSource.content);
      } else if (dataSource.type === "website" && dataSource.url) {
        // Processar o conteúdo do website (simplificado para demonstração)
        try {
          knowledgeChunks = await aiService.processWebsiteContent(dataSource.url);
        } catch (err) {
          console.error("Erro ao processar conteúdo do site:", err);
        }
      }
      
      // Inserir a fonte de dados
      const [createdDataSource] = await db.insert(aiTrainingDataSources).values({
        name: dataSource.name,
        type: dataSource.type,
        url: dataSource.url || null,
        content: dataSource.content || null,
        description: dataSource.description || null,
        isActive: dataSource.isActive,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      // Se tivermos chunks, inserir cada um deles associado à fonte de dados
      if (knowledgeChunks.length > 0 && createdDataSource) {
        const chunksToInsert = knowledgeChunks.map(chunk => ({
          sourceId: createdDataSource.id,
          content: chunk,
          embedding: null, // Será processado posteriormente em um job assíncrono
          metadata: {},
          createdAt: new Date()
        }));
        
        await db.insert(aiKnowledgeChunks).values(chunksToInsert);
        
        // Iniciar o processamento de embeddings em background
        aiService.scheduleEmbeddingGeneration(createdDataSource.id).catch(err => {
          console.error("Erro ao agendar geração de embeddings:", err);
        });
      }
      
      res.status(201).json(createdDataSource);
    } catch (error) {
      console.error("Erro ao criar fonte de dados de IA:", error);
      res.status(500).json({ error: "Erro ao criar fonte de dados" });
    }
  });

  /**
   * Atualiza uma fonte de dados de IA existente
   */
  router.put("/api/ai/data-sources/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const dataSource = req.body;
      
      // Verificar se a fonte existe
      const [existingSource] = await db.select().from(aiTrainingDataSources)
        .where(eq(aiTrainingDataSources.id, parseInt(id)));
        
      if (!existingSource) {
        return res.status(404).json({ error: "Fonte de dados não encontrada" });
      }
      
      // Atualizar a fonte de dados
      const [updatedSource] = await db.update(aiTrainingDataSources)
        .set({
          name: dataSource.name,
          type: dataSource.type,
          url: dataSource.url || null,
          content: dataSource.content || null,
          description: dataSource.description || null,
          isActive: dataSource.isActive,
          updatedAt: new Date()
        })
        .where(eq(aiTrainingDataSources.id, parseInt(id)))
        .returning();
      
      // Se o conteúdo mudou, atualizar os chunks
      if ((existingSource.content !== dataSource.content && dataSource.type === "document") || 
          (existingSource.url !== dataSource.url && dataSource.type === "website")) {
        
        // Remover chunks existentes
        await db.delete(aiKnowledgeChunks)
          .where(eq(aiKnowledgeChunks.sourceId, parseInt(id)));
        
        // Processar e adicionar novos chunks
        let knowledgeChunks = [];
        if (dataSource.type === "document" && dataSource.content) {
          knowledgeChunks = await aiService.processDocumentContent(dataSource.content);
        } else if (dataSource.type === "website" && dataSource.url) {
          try {
            knowledgeChunks = await aiService.processWebsiteContent(dataSource.url);
          } catch (err) {
            console.error("Erro ao processar conteúdo do site:", err);
          }
        }
        
        if (knowledgeChunks.length > 0) {
          const chunksToInsert = knowledgeChunks.map(chunk => ({
            sourceId: parseInt(id),
            content: chunk,
            embedding: null,
            metadata: {},
            createdAt: new Date()
          }));
          
          await db.insert(aiKnowledgeChunks).values(chunksToInsert);
          
          // Iniciar o processamento de embeddings em background
          aiService.scheduleEmbeddingGeneration(parseInt(id)).catch(err => {
            console.error("Erro ao agendar geração de embeddings:", err);
          });
        }
      }
      
      res.status(200).json(updatedSource);
    } catch (error) {
      console.error("Erro ao atualizar fonte de dados de IA:", error);
      res.status(500).json({ error: "Erro ao atualizar fonte de dados" });
    }
  });

  /**
   * Remove uma fonte de dados de IA
   */
  router.delete("/api/ai/data-sources/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Remover os chunks associados
      await db.delete(aiKnowledgeChunks)
        .where(eq(aiKnowledgeChunks.sourceId, parseInt(id)));
      
      // Remover a fonte de dados
      const [deletedSource] = await db.delete(aiTrainingDataSources)
        .where(eq(aiTrainingDataSources.id, parseInt(id)))
        .returning();
      
      if (!deletedSource) {
        return res.status(404).json({ error: "Fonte de dados não encontrada" });
      }
      
      res.status(200).json({ message: "Fonte de dados removida com sucesso" });
    } catch (error) {
      console.error("Erro ao remover fonte de dados de IA:", error);
      res.status(500).json({ error: "Erro ao remover fonte de dados" });
    }
  });

  /**
   * Obtém todos os pares de perguntas e respostas
   */
  router.get("/api/ai/qa-pairs", async (req, res) => {
    try {
      const qaPairs = await db.select().from(aiQaPairs).orderBy(aiQaPairs.id);
      res.status(200).json(qaPairs);
    } catch (error) {
      console.error("Erro ao buscar pares de perguntas e respostas:", error);
      res.status(500).json({ error: "Erro ao buscar pares de perguntas e respostas" });
    }
  });

  /**
   * Obtém um par de pergunta e resposta específico por ID
   */
  router.get("/api/ai/qa-pairs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const [qaPair] = await db.select().from(aiQaPairs).where(eq(aiQaPairs.id, parseInt(id)));

      if (!qaPair) {
        return res.status(404).json({ error: "Par de pergunta e resposta não encontrado" });
      }

      res.status(200).json(qaPair);
    } catch (error) {
      console.error("Erro ao buscar par de pergunta e resposta:", error);
      res.status(500).json({ error: "Erro ao buscar par de pergunta e resposta" });
    }
  });

  /**
   * Cria um novo par de pergunta e resposta
   */
  router.post("/api/ai/qa-pairs", async (req, res) => {
    try {
      const qaPair = req.body;
      
      const [createdQaPair] = await db.insert(aiQaPairs).values({
        question: qaPair.question,
        answer: qaPair.answer,
        sourceId: qaPair.sourceId || null,
        embedding: null, // Será processado posteriormente em um job assíncrono
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      // Gerar embedding para a pergunta (para pesquisa semântica)
      aiService.generateQAPairEmbedding(createdQaPair.id).catch(err => {
        console.error("Erro ao gerar embedding para par Q&A:", err);
      });
      
      res.status(201).json(createdQaPair);
    } catch (error) {
      console.error("Erro ao criar par de pergunta e resposta:", error);
      res.status(500).json({ error: "Erro ao criar par de pergunta e resposta" });
    }
  });

  /**
   * Atualiza um par de pergunta e resposta existente
   */
  router.put("/api/ai/qa-pairs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const qaPair = req.body;
      
      const [updatedQaPair] = await db.update(aiQaPairs)
        .set({
          question: qaPair.question,
          answer: qaPair.answer,
          sourceId: qaPair.sourceId || null,
          embedding: null, // Regenerar o embedding
          updatedAt: new Date()
        })
        .where(eq(aiQaPairs.id, parseInt(id)))
        .returning();
      
      if (!updatedQaPair) {
        return res.status(404).json({ error: "Par de pergunta e resposta não encontrado" });
      }
      
      // Gerar novo embedding para a pergunta
      aiService.generateQAPairEmbedding(parseInt(id)).catch(err => {
        console.error("Erro ao gerar embedding para par Q&A:", err);
      });
      
      res.status(200).json(updatedQaPair);
    } catch (error) {
      console.error("Erro ao atualizar par de pergunta e resposta:", error);
      res.status(500).json({ error: "Erro ao atualizar par de pergunta e resposta" });
    }
  });

  /**
   * Remove um par de pergunta e resposta
   */
  router.delete("/api/ai/qa-pairs/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      const [deletedQaPair] = await db.delete(aiQaPairs)
        .where(eq(aiQaPairs.id, parseInt(id)))
        .returning();
      
      if (!deletedQaPair) {
        return res.status(404).json({ error: "Par de pergunta e resposta não encontrado" });
      }
      
      res.status(200).json({ message: "Par de pergunta e resposta removido com sucesso" });
    } catch (error) {
      console.error("Erro ao remover par de pergunta e resposta:", error);
      res.status(500).json({ error: "Erro ao remover par de pergunta e resposta" });
    }
  });

  /**
   * Responde uma pergunta utilizando a IA personalizada
   */
  router.post("/api/ai/answer", async (req, res) => {
    try {
      const { question, conversationId, contactId, channelId } = req.body;
      
      if (!question) {
        return res.status(400).json({ error: "Pergunta é obrigatória" });
      }
      
      const answer = await aiService.answerQuestion(
        question, 
        conversationId || null, 
        contactId || null,
        channelId || null
      );
      
      res.status(200).json({ answer });
    } catch (error) {
      console.error("Erro ao responder pergunta com IA:", error);
      res.status(500).json({ error: "Erro ao processar resposta da IA" });
    }
  });

  return router;
}