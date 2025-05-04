/**
 * Middleware para monitoramento e controle do cache da aplicação
 *
 * Este middleware fornece endpoints para visualizar, limpar e gerenciar
 * o cache da aplicação, expondo estatísticas e funcionalidades de manutenção.
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Endpoint para listar estatísticas do cache
 */
export declare function getCacheStats(req: Request, res: Response): void;
/**
 * Endpoint para limpar o cache
 */
export declare function clearCache(req: Request, res: Response): void;
/**
 * Endpoint para remover itens expirados do cache
 */
export declare function cleanExpiredCache(req: Request, res: Response): void;
/**
 * Endpoint para obter um item específico do cache (com verificação de segurança)
 */
export declare function getCacheItem(req: Request, res: Response): Response<any, Record<string, any>>;
/**
 * Middleware para adicionar rotas de cache à aplicação
 */
export declare function cacheMonitorMiddleware(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export default cacheMonitorMiddleware;
