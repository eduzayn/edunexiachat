/**
 * Rotas de API para o sistema de automação
 */

import express, { Request, Response, NextFunction, Router } from 'express';
import { check, validationResult } from 'express-validator';
import { IStorage } from '../../storage';
import { log } from '../../vite';
import { AutomationHandler } from './handler';

export function setupAutomationRoutes(router: Router, storage: IStorage): Router {
  // Criar manipulador de automações
  const automationHandler = new AutomationHandler(storage);
  
  // Middleware para verificar autenticação
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: 'Não autorizado' });
  };

  // Rotas de automação
  const routes = express.Router();

  // Obter todas as automações
  routes.get('/automations', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const type = req.query.type as string | undefined;
      const automations = await automationHandler.getAutomations(type);
      res.json(automations);
    } catch (error) {
      next(error);
    }
  });

  // Obter automação por ID
  routes.get('/automations/:id', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID de automação inválido' });
      }

      const automation = await automationHandler.getAutomationById(id);
      if (!automation) {
        return res.status(404).json({ message: 'Automação não encontrada' });
      }

      res.json(automation);
    } catch (error) {
      next(error);
    }
  });

  // Criar nova automação
  routes.post('/automations', [
    isAuthenticated,
    check('name').notEmpty().withMessage('Nome é obrigatório'),
    check('type').isIn(['quick_reply', 'chatbot', 'trigger', 'scheduled'])
      .withMessage('Tipo deve ser quick_reply, chatbot, trigger ou scheduled'),
  ], async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validar dados
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Obter usuário autenticado
      const user = req.user as any;
      const userId = user?.id;

      // Criar automação
      const newAutomation = await automationHandler.createAutomation(req.body, userId);
      
      log(`Automação criada: ${newAutomation.id} (${newAutomation.name})`, 'automation');
      
      res.status(201).json(newAutomation);
    } catch (error) {
      next(error);
    }
  });

  // Atualizar automação existente
  routes.put('/automations/:id', [
    isAuthenticated,
    check('name').optional().notEmpty().withMessage('Nome não pode ser vazio'),
    check('type').optional().isIn(['quick_reply', 'chatbot', 'trigger', 'scheduled'])
      .withMessage('Tipo deve ser quick_reply, chatbot, trigger ou scheduled'),
  ], async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validar dados
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID de automação inválido' });
      }

      // Atualizar automação
      const updatedAutomation = await automationHandler.updateAutomation(id, req.body);
      
      log(`Automação atualizada: ${id} (${updatedAutomation.name})`, 'automation');
      
      res.json(updatedAutomation);
    } catch (error) {
      next(error);
    }
  });

  // Excluir automação
  routes.delete('/automations/:id', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID de automação inválido' });
      }

      // Excluir automação
      await automationHandler.deleteAutomation(id);
      
      log(`Automação excluída: ${id}`, 'automation');
      
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // Ativar/desativar automação
  routes.patch('/automations/:id/toggle', [
    isAuthenticated,
    check('active').isBoolean().withMessage('Status ativo deve ser um booleano'),
  ], async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validar dados
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID de automação inválido' });
      }

      const { active } = req.body;
      
      // Atualizar status da automação
      const updatedAutomation = await automationHandler.toggleAutomationActive(id, active);
      
      log(`Automação ${active ? 'ativada' : 'desativada'}: ${id} (${updatedAutomation.name})`, 'automation');
      
      res.json(updatedAutomation);
    } catch (error) {
      next(error);
    }
  });

  // Executar automação manualmente
  routes.post('/automations/:id/execute', [
    isAuthenticated,
    check('conversationId').isInt().withMessage('ID da conversa é obrigatório'),
  ], async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validar dados
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'ID de automação inválido' });
      }

      const { conversationId, inputData } = req.body;
      
      // Executar automação
      const result = await automationHandler.executeAutomation(id, conversationId, inputData);
      
      log(`Automação executada manualmente: ${id} (resultado: ${result.success ? 'sucesso' : 'falha'})`, 'automation');
      
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // Obter estatísticas sobre automações
  routes.get('/automations-stats', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = await automationHandler.getAutomationStats();
      res.json(stats);
    } catch (error) {
      next(error);
    }
  });

  return routes;
}