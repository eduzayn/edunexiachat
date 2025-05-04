/**
 * Middleware para logging de requisições HTTP
 *
 * Este middleware registra informações sobre todas as requisições HTTP
 * recebidas pela aplicação, incluindo método, URL, IP e tempo de resposta.
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Middleware para logging de requisições HTTP
 */
export declare function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void;
export default requestLoggerMiddleware;
