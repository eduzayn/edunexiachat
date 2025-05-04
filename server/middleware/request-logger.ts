/**
 * Middleware para logging de requisições HTTP
 * 
 * Este middleware registra informações sobre todas as requisições HTTP
 * recebidas pela aplicação, incluindo método, URL, IP e tempo de resposta.
 */

import { Request, Response, NextFunction } from 'express';
import { log } from '../utils/logger';

/**
 * Middleware para logging de requisições HTTP
 */
export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  // Registrar o horário de início da requisição
  const startTime = Date.now();
  
  // Capturar informações básicas da requisição
  const method = req.method;
  const url = req.originalUrl || req.url;
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';
  
  // Log inicial da requisição
  log(`${method} ${url} - Início`, 'request');
  
  // Interceptar métodos de resposta para capturar quando a resposta for enviada
  const originalEnd = res.end;
  const originalJson = res.json;
  const originalSend = res.send;
  
  // Função para registrar o log final da resposta
  const logResponse = () => {
    // Calcular tempo de resposta
    const responseTime = Date.now() - startTime;
    
    // Obter o status da resposta
    const statusCode = res.statusCode;
    
    // Determinar nível de log baseado no status
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    
    // Registrar log detalhado da resposta
    log(
      `${method} ${url} - Completado ${statusCode} em ${responseTime}ms`, 
      'request', 
      level
    );
  };
  
  // Sobrescrever métodos para capturar o envio da resposta
  res.end = function(...args: any[]): any {
    logResponse();
    return originalEnd.apply(this, args);
  } as any;
  
  res.json = function(body?: any): Response {
    logResponse();
    return originalJson.call(this, body);
  };
  
  res.send = function(body?: any): Response {
    logResponse();
    return originalSend.call(this, body);
  };
  
  next();
}

export default requestLoggerMiddleware;