/**
 * Configuração de rotas da API
 * 
 * Este arquivo define as rotas da API para a aplicação EduChatConnect.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { IStorage } from './storage';

/**
 * Configura as rotas de API
 * @param router Router do Express
 * @param storage Interface de armazenamento
 * @returns Router configurado
 */
export function setupRoutes(router: Router, storage: IStorage): Router {
  // Middleware para verificar autenticação
  const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    // Para desenvolvimento, sempre autoriza
    // Em produção, implementar verificação real
    return next();
  };

  // Rota para saúde da API
  router.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Rota para informações de versão
  router.get('/version', (req: Request, res: Response) => {
    res.json({ 
      name: 'EduChatConnect',
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    });
  });

  // Rotas para automações
  router.get('/automations', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const type = req.query.type as string | undefined;
      const automations = await storage.getAutomations(type);
      res.json(automations);
    } catch (error: any) {
      next(error);
    }
  });

  router.get('/automations/:id', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const automation = await storage.getAutomationById(id);
      
      if (!automation) {
        return res.status(404).json({ error: 'Automação não encontrada' });
      }
      
      res.json(automation);
    } catch (error: any) {
      next(error);
    }
  });

  router.post('/automations', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const newAutomation = await storage.createAutomation(req.body);
      res.status(201).json(newAutomation);
    } catch (error: any) {
      next(error);
    }
  });

  router.put('/automations/:id', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const updatedAutomation = await storage.updateAutomation(id, req.body);
      res.json(updatedAutomation);
    } catch (error: any) {
      next(error);
    }
  });

  router.delete('/automations/:id', isAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteAutomation(id);
      
      if (!success) {
        return res.status(404).json({ error: 'Automação não encontrada' });
      }
      
      res.status(204).end();
    } catch (error: any) {
      next(error);
    }
  });

  return router;
}