/**
 * Middleware para monitoramento de performance da aplicação
 *
 * Este middleware monitora e registra métricas de performance da aplicação,
 * incluindo uso de memória, tempo de CPU e tempo de resposta das requisições.
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Middleware para monitoramento de performance
 */
export declare function performanceMonitorMiddleware(req: Request, res: Response, next: NextFunction): void;
export default performanceMonitorMiddleware;
