/**
 * Middleware para tratamento avançado de erros
 * 
 * Este middleware fornece tratamento uniforme para erros,
 * com logging detalhado, classificação de erros e respostas
 * formatadas para facilitar o debugging.
 */

import { Request, Response, NextFunction } from 'express';
import { log } from '../utils/logger';

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
 * Tipos de erro conhecidos e suas configurações
 */
const ERROR_TYPES = {
  VALIDATION: {
    statusCode: 400,
    code: 'VALIDATION_ERROR',
    isOperational: true
  },
  AUTHENTICATION: {
    statusCode: 401,
    code: 'AUTHENTICATION_ERROR',
    isOperational: true
  },
  AUTHORIZATION: {
    statusCode: 403,
    code: 'AUTHORIZATION_ERROR',
    isOperational: true
  },
  NOT_FOUND: {
    statusCode: 404,
    code: 'NOT_FOUND',
    isOperational: true
  },
  CONFLICT: {
    statusCode: 409,
    code: 'CONFLICT',
    isOperational: true
  },
  DATABASE: {
    statusCode: 500,
    code: 'DATABASE_ERROR',
    isOperational: false
  },
  EXTERNAL_SERVICE: {
    statusCode: 502,
    code: 'EXTERNAL_SERVICE_ERROR',
    isOperational: true
  },
  INTERNAL: {
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    isOperational: false
  }
};

/**
 * Cria um erro padronizado da aplicação
 */
export function createAppError(
  message: string,
  statusCode = 500,
  code = 'INTERNAL_ERROR',
  details?: any,
  isOperational = true
): AppError {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  error.isOperational = isOperational;
  
  // Captura stack trace
  Error.captureStackTrace(error, createAppError);
  
  return error;
}

/**
 * Transforma um erro desconhecido em um AppError
 */
function normalizeError(err: any): AppError {
  // Se já é um AppError, retorna como está
  if (err.isOperational !== undefined) {
    return err;
  }
  
  const appError: AppError = err;
  
  // Verifica se é um erro conhecido pelo código/nome
  if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.name === 'FetchError') {
    appError.statusCode = 502;
    appError.code = 'EXTERNAL_SERVICE_ERROR';
    appError.isOperational = true;
  } 
  // Erro de conexão com banco de dados
  else if (err.code && ['ECONNREFUSED', '08006', '08001', '08004', '57P01'].includes(err.code)) {
    appError.statusCode = 500;
    appError.code = 'DATABASE_ERROR';
    appError.isOperational = false;
  }
  // Validação de dados
  else if (err.name === 'ValidationError' || err.name === 'ZodError') {
    appError.statusCode = 400;
    appError.code = 'VALIDATION_ERROR';
    appError.isOperational = true;
  }
  // Erros não categorizados são considerados internos
  else {
    appError.statusCode = 500;
    appError.code = 'INTERNAL_ERROR';
    appError.isOperational = false;
  }
  
  return appError;
}

/**
 * Middleware de tratamento de erros
 */
export function errorHandlerMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  // Normaliza o erro para AppError
  const appError = normalizeError(err);
  
  // Prepara corpo da resposta
  const responseBody: any = {
    error: {
      message: appError.message,
      code: appError.code
    }
  };
  
  // Adiciona stack trace (apenas em desenvolvimento)
  if (process.env.NODE_ENV !== 'production') {
    responseBody.error.stack = appError.stack?.split('\n');
  }
  
  // Adiciona detalhes extras se existirem
  if (appError.details) {
    responseBody.error.details = appError.details;
  }
  
  // Adiciona informações sobre a requisição (para debugging)
  if (process.env.NODE_ENV !== 'production') {
    responseBody.request = {
      method: req.method,
      url: req.url,
      params: req.params,
      query: req.query,
      ip: req.ip
    };
  }
  
  // Define nível de log baseado na severidade
  const logLevel = appError.statusCode ?? 500 >= 500 ? 'error' : 'warn';
  
  // Registra o erro
  log(`[${appError.statusCode ?? 500}] ${appError.message}`, 'error-handler', logLevel);
  
  // Retorna resposta formatada
  res.status(appError.statusCode ?? 500).json(responseBody);
}

/**
 * Middleware para capturar erros assíncronos
 */
export function asyncErrorHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Middleware para lidar com rotas não encontradas
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  const error = createAppError(
    `Rota não encontrada: ${req.method} ${req.url}`,
    404,
    'NOT_FOUND'
  );
  next(error);
}

export default errorHandlerMiddleware;