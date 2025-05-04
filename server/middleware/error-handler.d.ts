/**
 * Middleware para tratamento avançado de erros
 *
 * Este middleware fornece tratamento uniforme para erros,
 * com logging detalhado, classificação de erros e respostas
 * formatadas para facilitar o debugging.
 */
import { Request, Response, NextFunction } from 'express';
/**
 * Interface básica para erros customizados da aplicação
 */
export interface AppError extends Error {
    statusCode?: number;
    code?: string;
    details?: any;
    isOperational?: boolean;
}
/**
 * Cria um erro padronizado da aplicação
 */
export declare function createAppError(message: string, statusCode?: number, code?: string, details?: any, isOperational?: boolean): AppError;
/**
 * Middleware de tratamento de erros
 */
export declare function errorHandlerMiddleware(err: any, req: Request, res: Response, next: NextFunction): void;
/**
 * Middleware para capturar erros assíncronos
 */
export declare function asyncErrorHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Middleware para lidar com rotas não encontradas
 */
export declare function notFoundHandler(req: Request, res: Response, next: NextFunction): void;
export default errorHandlerMiddleware;
