/**
 * Utilidade para Diagnóstico de Banco de Dados
 * 
 * Este módulo fornece ferramentas para monitorar e diagnosticar
 * problemas relacionados ao banco de dados, como consultas lentas,
 * erros frequentes e métricas de performance.
 */

import { Pool } from 'pg';
import createLogger from './logger';

const logger = createLogger('database');

interface QueryInfo {
  query: string;
  params: any[];
  durationMs: number;
  error?: Error;
  stack?: string;
  timestamp: Date;
}

// Estado global para métricas de BD
const dbMetrics = {
  queriesExecuted: 0,
  queriesSucceeded: 0,
  queriesFailed: 0,
  totalDurationMs: 0,
  slowQueries: [] as QueryInfo[],
  recentErrors: [] as QueryInfo[],
  // Armazena métricas por tipo de consulta
  queryPatterns: new Map<string, {
    count: number,
    totalDurationMs: number,
    avgDurationMs: number,
    maxDurationMs: number,
    errors: number
  }>()
};

// Limiar para considerar uma consulta lenta (100ms)
const SLOW_QUERY_THRESHOLD_MS = 100;

// Número máximo de consultas lentas a serem armazenadas
const MAX_SLOW_QUERIES = 50;

// Número máximo de erros recentes a serem armazenados
const MAX_RECENT_ERRORS = 50;

/**
 * Normaliza uma consulta SQL para agrupamento
 * Remove valores literais e normaliza espaços em branco
 */
function normalizeQuery(sql: string): string {
  return sql
    .replace(/\s+/g, ' ')                    // Normaliza espaços em branco
    .replace(/'[^']*'/g, '?')               // Substitui strings
    .replace(/"[^"]*"/g, '?')               // Substitui strings com aspas duplas
    .replace(/\$\d+/g, '?')                 // Substitui parâmetros posicionais
    .replace(/\b\d+\b/g, '?')               // Substitui números literais
    .replace(/\b(true|false)\b/gi, '?')     // Substitui booleanos
    .replace(/IN\s*\([^\)]*\)/gi, 'IN(?)')  // Normaliza cláusulas IN
    .trim();
}

/**
 * Configura interceptação de consultas em um pool PostgreSQL
 */
export function setupQueryLogging(pool: Pool): Pool {
  // Salva a implementação original
  const originalQuery = pool.query.bind(pool);
  
  // Substitui com versão instrumentada
  (pool as any).query = function(...args: any[]) {
    const startTime = process.hrtime();
    let sqlQuery: string = '';
    let params: any[] = [];
    
    // Determina o formato dos argumentos
    if (typeof args[0] === 'string') {
      sqlQuery = args[0];
      if (args[1] && Array.isArray(args[1])) {
        params = args[1];
      }
    } else if (args[0] && args[0].text) {
      sqlQuery = args[0].text;
      if (args[0].values) {
        params = args[0].values;
      }
    }
    
    // Captura stack trace para debugging
    const stack = new Error().stack;
    
    const normalizedSql = normalizeQuery(sqlQuery);
    
    // Executa a consulta
    const result = originalQuery(...args);
    
    if (result && typeof result.then === 'function') {
      // Promessa - monitora resolução/rejeição
      result
        .then((data: any) => {
          const [seconds, nanoseconds] = process.hrtime(startTime);
          const durationMs = seconds * 1000 + nanoseconds / 1000000;
          
          logQuerySuccess(normalizedSql, sqlQuery, params, durationMs, stack);
          return data;
        })
        .catch((error: Error) => {
          const [seconds, nanoseconds] = process.hrtime(startTime);
          const durationMs = seconds * 1000 + nanoseconds / 1000000;
          
          logQueryError(normalizedSql, sqlQuery, params, error, durationMs, stack);
          throw error; // re-throw para manter comportamento original
        });
    }
    
    return result;
  };
  
  logger.info('Monitoramento de consultas SQL ativado');
  return pool;
}

/**
 * Registra uma consulta bem-sucedida
 */
function logQuerySuccess(normalizedSql: string, rawSql: string, params: any[], durationMs: number, stack?: string) {
  dbMetrics.queriesExecuted++;
  dbMetrics.queriesSucceeded++;
  dbMetrics.totalDurationMs += durationMs;
  
  // Atualiza métricas para o padrão de consulta
  if (!dbMetrics.queryPatterns.has(normalizedSql)) {
    dbMetrics.queryPatterns.set(normalizedSql, {
      count: 0,
      totalDurationMs: 0,
      avgDurationMs: 0,
      maxDurationMs: 0,
      errors: 0
    });
  }
  
  const patternStats = dbMetrics.queryPatterns.get(normalizedSql)!;
  patternStats.count++;
  patternStats.totalDurationMs += durationMs;
  patternStats.avgDurationMs = patternStats.totalDurationMs / patternStats.count;
  patternStats.maxDurationMs = Math.max(patternStats.maxDurationMs, durationMs);
  
  // Verifica se é uma consulta lenta
  if (durationMs > SLOW_QUERY_THRESHOLD_MS) {
    const queryInfo: QueryInfo = {
      query: rawSql,
      params,
      durationMs,
      stack,
      timestamp: new Date()
    };
    
    // Adiciona à lista de consultas lentas (limitada)
    dbMetrics.slowQueries.unshift(queryInfo);
    if (dbMetrics.slowQueries.length > MAX_SLOW_QUERIES) {
      dbMetrics.slowQueries.pop();
    }
    
    // Log de consulta lenta
    logger.warn(`Consulta SQL lenta (${durationMs.toFixed(2)}ms)`, {
      query: rawSql,
      params,
      durationMs
    });
  } else {
    // Log regular para consultas normais (apenas em nível DEBUG)
    logger.debug(`Consulta SQL (${durationMs.toFixed(2)}ms)`, {
      query: rawSql,
      params,
      durationMs
    });
  }
}

/**
 * Registra uma consulta com erro
 */
function logQueryError(normalizedSql: string, rawSql: string, params: any[], error: Error, durationMs: number, stack?: string) {
  dbMetrics.queriesExecuted++;
  dbMetrics.queriesFailed++;
  dbMetrics.totalDurationMs += durationMs;
  
  // Atualiza métricas para o padrão de consulta
  if (!dbMetrics.queryPatterns.has(normalizedSql)) {
    dbMetrics.queryPatterns.set(normalizedSql, {
      count: 0,
      totalDurationMs: 0,
      avgDurationMs: 0,
      maxDurationMs: 0,
      errors: 0
    });
  }
  
  const patternStats = dbMetrics.queryPatterns.get(normalizedSql)!;
  patternStats.count++;
  patternStats.errors++;
  patternStats.totalDurationMs += durationMs;
  patternStats.avgDurationMs = patternStats.totalDurationMs / patternStats.count;
  
  // Adiciona à lista de erros recentes
  const queryInfo: QueryInfo = {
    query: rawSql,
    params,
    durationMs,
    error,
    stack,
    timestamp: new Date()
  };
  
  dbMetrics.recentErrors.unshift(queryInfo);
  if (dbMetrics.recentErrors.length > MAX_RECENT_ERRORS) {
    dbMetrics.recentErrors.pop();
  }
  
  // Log de erro
  logger.error(`Erro em consulta SQL`, {
    query: rawSql,
    params,
    durationMs,
    error: {
      message: error.message,
      code: (error as any).code,
      name: error.name,
      stack: error.stack
    }
  });
}

/**
 * Inicia o monitoramento periódico de estatísticas de BD
 */
export function initDatabaseMonitoring(interval = 300000): void {
  setInterval(() => {
    // Converte Map para objeto para melhor visualização nos logs
    const patternStatsObj: Record<string, any> = {};
    dbMetrics.queryPatterns.forEach((stats, pattern) => {
      if (stats.count > 10) { // Filtra padrões com poucas execuções
        patternStatsObj[pattern] = {
          ...stats,
          successRate: ((stats.count - stats.errors) / stats.count * 100).toFixed(1) + '%'
        };
      }
    });
    
    // Top 5 consultas lentas
    const slowestPatterns = [...dbMetrics.queryPatterns.entries()]
      .sort((a, b) => b[1].avgDurationMs - a[1].avgDurationMs)
      .slice(0, 5)
      .map(([pattern, stats]) => ({
        pattern,
        avgDurationMs: stats.avgDurationMs,
        maxDurationMs: stats.maxDurationMs,
        count: stats.count,
        errors: stats.errors
      }));
    
    // Padrões com mais erros
    const errorPatterns = [...dbMetrics.queryPatterns.entries()]
      .filter(([_, stats]) => stats.errors > 0)
      .sort((a, b) => b[1].errors - a[1].errors)
      .slice(0, 5)
      .map(([pattern, stats]) => ({
        pattern,
        errors: stats.errors,
        errorRate: (stats.errors / stats.count * 100).toFixed(1) + '%',
        count: stats.count
      }));
    
    logger.info('Estatísticas de banco de dados', {
      queriesExecuted: dbMetrics.queriesExecuted,
      queriesSucceeded: dbMetrics.queriesSucceeded,
      queriesFailed: dbMetrics.queriesFailed,
      successRate: ((dbMetrics.queriesSucceeded / dbMetrics.queriesExecuted) * 100).toFixed(2) + '%',
      avgQueryTimeMs: dbMetrics.queriesExecuted ? (dbMetrics.totalDurationMs / dbMetrics.queriesExecuted).toFixed(2) : 0,
      slowestPatterns,
      errorPatterns,
      recentSlowQueries: dbMetrics.slowQueries.slice(0, 3).map(q => ({
        query: q.query,
        durationMs: q.durationMs,
        timestamp: q.timestamp
      }))
    });
  }, interval);
  
  logger.info('Monitoramento de banco de dados iniciado');
}

/**
 * Retorna as estatísticas atuais do banco de dados
 */
export function getDatabaseStats() {
  // Top 5 consultas lentas
  const slowestPatterns = [...dbMetrics.queryPatterns.entries()]
    .sort((a, b) => b[1].avgDurationMs - a[1].avgDurationMs)
    .slice(0, 5)
    .map(([pattern, stats]) => ({
      pattern,
      avgDurationMs: stats.avgDurationMs,
      maxDurationMs: stats.maxDurationMs,
      count: stats.count,
      errors: stats.errors
    }));
  
  // Padrões com mais erros
  const errorPatterns = [...dbMetrics.queryPatterns.entries()]
    .filter(([_, stats]) => stats.errors > 0)
    .sort((a, b) => b[1].errors - a[1].errors)
    .slice(0, 5)
    .map(([pattern, stats]) => ({
      pattern,
      errors: stats.errors,
      errorRate: (stats.errors / stats.count * 100).toFixed(1) + '%',
      count: stats.count
    }));
  
  return {
    summary: {
      queriesExecuted: dbMetrics.queriesExecuted,
      queriesSucceeded: dbMetrics.queriesSucceeded,
      queriesFailed: dbMetrics.queriesFailed,
      successRate: ((dbMetrics.queriesSucceeded / dbMetrics.queriesExecuted) * 100).toFixed(2) + '%',
      avgQueryTimeMs: dbMetrics.queriesExecuted ? (dbMetrics.totalDurationMs / dbMetrics.queriesExecuted).toFixed(2) : 0,
    },
    slowestPatterns,
    errorPatterns,
    recentSlowQueries: dbMetrics.slowQueries.slice(0, 10),
    recentErrors: dbMetrics.recentErrors.slice(0, 10)
  };
}

export default {
  setupQueryLogging,
  initDatabaseMonitoring,
  getDatabaseStats
};